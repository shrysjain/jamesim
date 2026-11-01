import type { HopperVolume, RobotDefinition, RobotPose } from '../robot/RobotDefinition';
import { FUEL_RADIUS } from './FuelSystem';
import type { Fuel } from './FuelSystem';
import { add, sub, scale, unrotate, v3 } from './vector';
import type { Rotation, Vector } from './vector';

type Motion = { position: Vector; velocity: Vector; angularVelocity: Vector; rotation: Rotation };
type HopperFuel = Pick<Fuel, 'id' | 'state' | 'local'>;
type Particle = { fuel: HopperFuel; velocity: Vector; previous: Vector };
const cross = (a: Vector, b: Vector) => v3(a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x);
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Local sphere dynamics inside moving hopper walls, stepped with the 120 Hz world.
 * Field fuel keeps its one Rapier body/ID. Owned fuel's disabled field bodies do not
 * double-count chassis payload mass; their local positions and velocities evolve here. */
export class HopperDynamics {
  private particles = new Map<number, Particle>();
  private lastMotion: Motion | null = null;
  constructor(private definition: RobotDefinition) {}
  get volume(): HopperVolume { return this.definition.hopper.volume!; }
  reset() { this.particles.clear(); this.lastMotion = null; }

  step(dt: number, held: HopperFuel[], pose: RobotPose, motion: Motion) {
    const ids = new Set(held.filter(f => f.state === 'stored').map(f => f.id));
    for (const id of this.particles.keys()) if (!ids.has(id)) this.particles.delete(id);
    for (const fuel of held) if (fuel.state === 'stored' && !this.particles.has(fuel.id)) {
      this.particles.set(fuel.id, { fuel, velocity: v3(), previous: { ...fuel.local } });
    }
    const previous = this.lastMotion;
    // A deliberate respawn/teleport carries cargo intact instead of applying a fictitious impact.
    const moved = previous ? sub(motion.position, previous.position) : v3();
    const teleported = Math.hypot(moved.x, moved.y, moved.z) > .5;
    const acceleration = previous && !teleported ? unrotate(scale(sub(motion.velocity, previous.velocity), 1/dt), motion.rotation) : v3();
    const omega = unrotate(motion.angularVelocity, motion.rotation);
    const alpha = previous && !teleported ? unrotate(scale(sub(motion.angularVelocity, previous.angularVelocity), 1/dt), motion.rotation) : v3();
    this.lastMotion = { position: { ...motion.position }, velocity: { ...motion.velocity }, angularVelocity: { ...motion.angularVelocity }, rotation: { ...motion.rotation } };
    const gravity = unrotate(v3(0, -9.81, 0), motion.rotation);
    const balls = [...this.particles.values()];
    const front = this.front(pose), width = this.volume.halfWidth - FUEL_RADIUS;
    // Two integration substeps bound moving-wall and sphere penetration without rendering dependence.
    const h = dt/2;
    for (let substep = 0; substep < 2; substep++) {
      for (const p of balls) {
        p.previous = { ...p.fuel.local };
        const rotational = add(cross(alpha, p.fuel.local), add(cross(omega, cross(omega, p.fuel.local)), scale(cross(omega, p.velocity), 2)));
        const force = sub(sub(gravity, acceleration), rotational);
        p.velocity.x += clamp(force.x, 35)*h; p.velocity.y += clamp(force.y, 35)*h; p.velocity.z += clamp(force.z, 35)*h;
        const drag = Math.exp(-.8*h);
        p.velocity = scale(p.velocity, drag);
        p.fuel.local = add(p.fuel.local, scale(p.velocity, h));
      }
      // Position-based equal-mass contacts. Tiny slop prevents noisy resting stacks.
      for (let iteration = 0; iteration < 12; iteration++) {
        for (let i = 0; i < balls.length; i++) for (let j = i+1; j < balls.length; j++) {
          const a = balls[i].fuel.local, b = balls[j].fuel.local;
          const dx = b.x-a.x, dy = b.y-a.y, dz = b.z-a.z, squared = dx*dx+dy*dy+dz*dz;
          const diameter = FUEL_RADIUS*2 + .0001;
          if (squared >= diameter*diameter) continue;
          const distance = Math.sqrt(squared);
          // Deterministic separation also handles a transfer landing exactly on another ball.
          const n = distance > 1e-8 ? v3(dx/distance, dy/distance, dz/distance) : v3((i+j)%2 ? 1 : -1, 0, 0);
          const correction = (diameter-distance)*.5;
          a.x -= n.x*correction; a.y -= n.y*correction; a.z -= n.z*correction;
          b.x += n.x*correction; b.y += n.y*correction; b.z += n.z*correction;
        }
        for (const p of balls) this.constrain(p.fuel.local, front, width);
      }
      for (const p of balls) {
        p.velocity = scale(sub(p.fuel.local, p.previous), 1/h);
        // Contact friction damps floor sliding and stops numerical vibration in settled stacks.
        const slope = this.volume.floorSlope ?? 0, normalLength = Math.sqrt(1+slope*slope);
        if (p.fuel.local.y < this.floor(p.fuel.local.x)+FUEL_RADIUS*normalLength+.001) {
          const nx = -slope/normalLength, ny = 1/normalLength, vn = p.velocity.x*nx+p.velocity.y*ny;
          if (vn < 0) { p.velocity.x -= vn*nx; p.velocity.y -= vn*ny; }
          p.velocity = scale(p.velocity, Math.exp(-2*h));
        }
        const speed = Math.hypot(p.velocity.x, p.velocity.y, p.velocity.z);
        if (speed > 5) p.velocity = scale(p.velocity, 5/speed);
      }
    }
  }
  front(pose: RobotPose) { return this.volume.frontX + this.volume.frontTravel*(1-(this.definition.hopper.intakeCurve ? pose.hopper : pose.intake)); }
  floor(x: number) { return this.volume.floorY + (this.volume.floorSlope ?? 0)*x; }
  private constrain(p: Vector, front: number, width: number) {
    p.x = Math.max(front+FUEL_RADIUS, Math.min(this.volume.backX-FUEL_RADIUS, p.x));
    p.z = Math.max(-width, Math.min(width, p.z));
    p.y = Math.min(this.volume.ceilingY-FUEL_RADIUS, p.y);
    const slope = this.volume.floorSlope ?? 0, penetration = this.floor(p.x)+FUEL_RADIUS*Math.sqrt(1+slope*slope)-p.y;
    if (penetration > 0) { p.x -= slope*penetration/(1+slope*slope); p.y += penetration/(1+slope*slope); }
    if (this.volume.slopedFront) {
      // REBLITZ's upper front panel slopes inward; enforce it in physics, not only in rendering.
      const diagonal = (p.y-p.x + FUEL_RADIUS*Math.SQRT2 - .832565);
      if (diagonal > 0) { p.x += diagonal/2; p.y -= diagonal/2; }
    }
  }
}
