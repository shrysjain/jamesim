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
    const spills: { id: number; velocity: Vector }[] = [];
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
        for (const p of balls) this.constrain(p.fuel.local, front, width, pose);
      }
      if (this.volume.rim) this.contactVelocities(balls, front);
      for (const p of balls) {
        // Open hoppers resolve contact impulses directly. Turning a seed-overlap
        // correction into velocity would launch fuel out of even a light load.
        if (!this.volume.rim) p.velocity = scale(sub(p.fuel.local, p.previous), 1/h);
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
      if (this.volume.rim) for (let i = balls.length - 1; i >= 0; i--) {
        const particle = balls[i], p = particle.fuel.local;
        if (p.x >= front && p.x <= this.volume.backX && Math.abs(p.z) <= this.volume.halfWidth) continue;
        // Once the center crosses a finite wall, hand the original fuel body
        // back to field physics at this position, with its local velocity.
        spills.push({ id: particle.fuel.id, velocity: { ...particle.velocity } });
        this.particles.delete(particle.fuel.id); balls.splice(i, 1);
      }
    }
    return spills;
  }
  front(pose: RobotPose) { return this.volume.frontX + this.volume.frontTravel*(1-(this.definition.hopper.intakeCurve ? pose.hopper : pose.intake)); }
  floor(x: number) { return this.volume.floorY + (this.volume.floorSlope ?? 0)*x; }
  private contactVelocities(balls: Particle[], front: number) {
    const rim = this.volume.rim!;
    const stop = (velocity: Vector, normal: Vector) => {
      const closing = velocity.x*normal.x+velocity.y*normal.y+velocity.z*normal.z;
      if (closing < 0) { velocity.x -= closing*normal.x; velocity.y -= closing*normal.y; velocity.z -= closing*normal.z; }
    };
    for (let iteration = 0; iteration < 4; iteration++) {
      for (let i = 0; i < balls.length; i++) for (let j = i+1; j < balls.length; j++) {
        const a = balls[i], b = balls[j], delta = sub(b.fuel.local, a.fuel.local), distance = Math.hypot(delta.x, delta.y, delta.z);
        if (distance < 1e-8 || distance > FUEL_RADIUS*2+.001) continue;
        const normal = scale(delta, 1/distance), relative = sub(b.velocity, a.velocity);
        const closing = relative.x*normal.x+relative.y*normal.y+relative.z*normal.z;
        if (closing < 0) { a.velocity = add(a.velocity, scale(normal, closing/2)); b.velocity = sub(b.velocity, scale(normal, closing/2)); }
      }
      for (const { fuel: { local: p }, velocity } of balls) {
        for (const [axis, plane, inward, top] of [
          ['x',front,1,rim.front], ['x',this.volume.backX,-1,rim.back],
          ['z',-this.volume.halfWidth,1,rim.sides], ['z',this.volume.halfWidth,-1,rim.sides],
        ] as const) {
          const d = (p[axis]-plane)*inward, y = Math.max(0,p.y-top), distance = Math.hypot(d,y);
          if (d < 0 || distance > FUEL_RADIUS+.001 || distance < 1e-8) continue;
          stop(velocity, axis === 'x' ? v3(d*inward/distance,y/distance,0) : v3(0,y/distance,d*inward/distance));
        }
        const slope = this.volume.floorSlope ?? 0, length = Math.sqrt(1+slope*slope);
        if (p.y <= this.floor(p.x)+FUEL_RADIUS*length+.001) stop(velocity,v3(-slope/length,1/length,0));
      }
    }
  }
  private constrain(p: Vector, front: number, width: number, pose: RobotPose) {
    const rim = this.volume.rim;
    if (rim) {
      this.wall(p, 'x', front, 1, rim.front);
      this.wall(p, 'x', this.volume.backX, -1, rim.back);
      this.wall(p, 'z', -this.volume.halfWidth, 1, rim.sides);
      this.wall(p, 'z', this.volume.halfWidth, -1, rim.sides);
      // An escaped sphere has no imaginary hopper floor outside the frame.
      if (p.x >= front && p.x <= this.volume.backX && Math.abs(p.z) <= this.volume.halfWidth) {
        const slope = this.volume.floorSlope ?? 0, penetration = this.floor(p.x)+FUEL_RADIUS*Math.sqrt(1+slope*slope)-p.y;
        if (penetration > 0) { p.x -= slope*penetration/(1+slope*slope); p.y += penetration/(1+slope*slope); }
      }
      return;
    }
    p.x = Math.max(front+FUEL_RADIUS, Math.min(this.volume.backX-FUEL_RADIUS, p.x));
    p.z = Math.max(-width, Math.min(width, p.z));
    p.y = Math.min(this.volume.ceilingY+(this.volume.ceilingTravel ?? 0)*(pose.climber ?? 0)-FUEL_RADIUS, p.y);
    const slope = this.volume.floorSlope ?? 0, penetration = this.floor(p.x)+FUEL_RADIUS*Math.sqrt(1+slope*slope)-p.y;
    if (penetration > 0) { p.x -= slope*penetration/(1+slope*slope); p.y += penetration/(1+slope*slope); }
    if (this.volume.slopedFront) {
      // REBLITZ's upper front panel slopes inward; enforce it in physics, not only in rendering.
      const diagonal = (p.y-p.x + FUEL_RADIUS*Math.SQRT2 - .832565);
      if (diagonal > 0) { p.x += diagonal/2; p.y -= diagonal/2; }
    }
  }
  private wall(p: Vector, axis: 'x' | 'z', plane: number, inward: number, top: number) {
    const distance = (p[axis]-plane)*inward, height = p.y-top;
    if (height <= 0) {
      if (distance < FUEL_RADIUS) p[axis] += inward*(FUEL_RADIUS-distance);
    } else if (height < FUEL_RADIUS) {
      // The top edge is a contact, not an infinitely tall wall. A sphere can
      // roll over it; use the full radius so it never clips through the panel.
      const length = Math.hypot(distance, height);
      if (length < FUEL_RADIUS) {
        const penetration = FUEL_RADIUS-length;
        p[axis] += inward*distance/length*penetration; p.y += height/length*penetration;
      }
    }
  }
}
