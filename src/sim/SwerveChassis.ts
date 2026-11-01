import RAPIER from '@dimforge/rapier3d-compat';
import type { Vec3 } from '../field/types';
import { CollisionGroups } from './collisionGroups';
import { REBLITZ, COLLECTING_POSE, partTransform } from '../robot/RobotDefinition';
import type { RobotDefinition, RobotPose, RobotCollider } from '../robot/RobotDefinition';

type Vector = { x: number; y: number; z: number };
type Quaternion = Vector & { w: number };
export type DriveInput = { forward: number; strafe: number; turn: number; slow: boolean; brake: boolean };
export const NEUTRAL_INPUT: DriveInput = { forward: 0, strafe: 0, turn: 0, slow: false, brake: false };
export type DriveTuning = { maxSpeed: number; acceleration: number; grip: number };
// FRSim's 2910 baseline: 16.7 ft/s, 33 ft/s², approximately 130 lbf traction.
export const DEFAULT_TUNING: DriveTuning = { maxSpeed: 16.7 * 0.3048, acceleration: 33 * 0.3048, grip: 1.05 };
export const CHASSIS = REBLITZ;
export const DRIVE_SPAWNS = {
  practice: { label: 'Blue practice', position: [6.1, 0.26, 2.1] as Vec3, yaw: 0 },
  bump: { label: 'Bump approach', position: [5.35, 0.26, 1.65] as Vec3, yaw: 0 },
  trench: { label: 'Trench approach', position: [5.35, 0.26, 3.35] as Vec3, yaw: 0 },
  fuel: { label: 'Fuel approach', position: [2.1, 0.26, 1.5] as Vec3, yaw: 0 },
} as const;
export type DriveSpawn = keyof typeof DRIVE_SPAWNS;
export type ModuleState = { x: number; z: number; angle: number; speed: number; suspension: number; grounded: boolean; load: number; point: Vector; force: Vector };
export type DriveTelemetry = { speed: number; turnRate: number; grounded: number; tilt: number; x: number; z: number; heading: number };

const vec = (x = 0, y = 0, z = 0): Vector => ({ x, y, z });
const add = (a: Vector, b: Vector) => vec(a.x + b.x, a.y + b.y, a.z + b.z);
const mul = (a: Vector, k: number) => vec(a.x * k, a.y * k, a.z * k);
const dot = (a: Vector, b: Vector) => a.x * b.x + a.y * b.y + a.z * b.z;
const normalize = (a: Vector) => mul(a, 1 / (Math.hypot(a.x, a.y, a.z) || 1));
const rotate = (v: Vector, q: Quaternion) => {
  const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
  return vec(v.x + q.w * tx + q.y * tz - q.z * ty, v.y + q.w * ty + q.z * tx - q.x * tz, v.z + q.w * tz + q.x * ty - q.y * tx);
};
const angleDelta = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const approach = (from: number, to: number, amount: number) => from + Math.max(-amount, Math.min(amount, to - from));

/** Force-limited swerve, with a level chassis and assisted suspension over field bumps. */
export class SwerveChassis {
  readonly body: RAPIER.RigidBody;
  readonly modules: ModuleState[];
  pose: RobotPose = { ...COLLECTING_POSE };
  private mechanismColliders: { collider: RAPIER.Collider; definition: RobotCollider }[] = [];
  tuning = { ...DEFAULT_TUNING };
  input = { ...NEUTRAL_INPUT };
  private wheels: RAPIER.Collider[] = [];
  private poseInitialized = false;
  private payloadMass = 0;
  private bumpHeight = 0;
  private bumpPitch = 0;
  private bumpRoll = 0;
  get totalMass() { return this.definition.mass + this.payloadMass; }
  /** Terrain-only body lean; collision support stays stable against fuel. */
  get renderRotation(): Quaternion {
    const a = this.body.rotation(), sp = Math.sin(this.bumpPitch / 2), cp = Math.cos(this.bumpPitch / 2);
    const sr = Math.sin(this.bumpRoll / 2), cr = Math.cos(this.bumpRoll / 2);
    const b = { x: cp * sr, y: sp * sr, z: sp * cr, w: cp * cr };
    return { x: a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
      y: a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
      z: a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
      w: a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z };
  }

  stopDrive() {
    this.input = { ...NEUTRAL_INPUT };
    this.modules.forEach(m => { m.speed = 0; });
    const angular = this.body.angvel();
    this.body.setAngvel({ x: angular.x, y: 0, z: angular.z }, true);
  }

  constructor(private world: RAPIER.World, readonly definition: RobotDefinition = REBLITZ,
    private fieldElements = new Map<number, string>()) {
    this.modules = definition.modules.map(({ x, z }) => ({ x, z, angle: 0, speed: 0, suspension: definition.springLength, grounded: false, load: 0, point: vec(), force: vec() }));
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false)
      .enabledRotations(false, true, false)
      .setCcdEnabled(true).setAdditionalSolverIterations(2).setLinearDamping(0.04).setAngularDamping(0.15)
      .setAdditionalMassProperties(definition.mass, vec(), vec(...definition.inertia), { x: 0, y: 0, z: 0, w: 1 }));
    for (const shape of definition.colliders) {
      const r = Math.min(shape.radius ?? 0, ...shape.halfExtents) * 0.95;
      const half = shape.halfExtents.map(v => v - r) as Vec3;
      const desc = (r ? RAPIER.ColliderDesc.roundCuboid(...half, r) : RAPIER.ColliderDesc.cuboid(...half))
        .setDensity(0).setFriction(shape.part === 'chassis' && shape.halfExtents[1] < 0.01 ? 0.02 : 0.1).setRestitution(0.05).setCollisionGroups(CollisionGroups.chassis);
      this.mechanismColliders.push({ collider: world.createCollider(desc, this.body), definition: shape });
    }
    this.setPose(COLLECTING_POSE);
    for (const module of this.modules) {
      // Fuel-only wheel proxies avoid double-counting floor support with the ray springs.
      this.wheels.push(world.createCollider(RAPIER.ColliderDesc.ball(0.046).setDensity(0).setFriction(0.05).setCollisionGroups(CollisionGroups.wheelFuel)
        .setTranslation(module.x, this.definition.mountY - module.suspension, module.z), this.body));
    }
    this.reset();
  }

  /** Update the articulated collision proxies for simulation or pose inspection. */
  setPose(pose: RobotPose) {
    const next = { intake: Math.max(0, Math.min(1, pose.intake)), hopper: Math.max(0, Math.min(1, pose.hopper)), hood: Math.max(0, Math.min(1, pose.hood)) };
    if (this.poseInitialized && next.intake === this.pose.intake && next.hopper === this.pose.hopper && next.hood === this.pose.hood) return;
    this.poseInitialized = true; this.pose = next;
    for (const { collider, definition: shape } of this.mechanismColliders) {
      const { angle, pivot, shift } = partTransform(this.definition, shape.part, this.pose);
      const x = shape.center[0] - pivot[0], y = shape.center[1] - pivot[1];
      collider.setTranslationWrtParent(vec(pivot[0] + Math.cos(angle) * x - Math.sin(angle) * y + shift,
        pivot[1] + Math.sin(angle) * x + Math.cos(angle) * y, shape.center[2]));
      collider.setRotationWrtParent({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) });
    }
    // Refresh attached collider world transforms even when inspection is paused.
    this.body.setTranslation(this.body.translation(), true);
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  /** Carried balls contribute mass once; disabled fuel bodies contribute no forces. */
  setPayload(points: Vector[], ballMass: number, ballRadius: number) {
    this.payloadMass = points.length * ballMass;
    const mass = this.totalMass, center = vec();
    for (const p of points) { center.x += p.x * ballMass / mass; center.y += p.y * ballMass / mass; center.z += p.z * ballMass / mass; }
    const inertia = [...this.definition.inertia];
    const addPoint = (m: number, p: Vector, sphere = 0) => {
      const x = p.x - center.x, y = p.y - center.y, z = p.z - center.z;
      inertia[0] += m * (y*y + z*z) + sphere;
      inertia[1] += m * (x*x + z*z) + sphere;
      inertia[2] += m * (x*x + y*y) + sphere;
    };
    addPoint(this.definition.mass, vec());
    for (const p of points) addPoint(ballMass, p, 0.4 * ballMass * ballRadius * ballRadius);
    this.body.setAdditionalMassProperties(mass, center, vec(...inertia as Vec3), { x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.recomputeMassPropertiesFromColliders();
  }

  setTuning(tuning: DriveTuning) {
    this.tuning = { maxSpeed: Math.max(1, Math.min(5.5, tuning.maxSpeed)), acceleration: Math.max(2, Math.min(12, tuning.acceleration)), grip: Math.max(0.5, Math.min(1.6, tuning.grip)) };
  }

  reset(spawn: DriveSpawn = 'practice') { this.teleport(DRIVE_SPAWNS[spawn].position, DRIVE_SPAWNS[spawn].yaw); }

  teleport(position: Vec3, yaw = 0) {
    this.bumpHeight = this.bumpPitch = this.bumpRoll = 0;
    this.body.setTranslation(vec(...position), true);
    this.body.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }, true);
    this.body.setLinvel(vec(), true); this.body.setAngvel(vec(), true);
    this.body.resetForces(true); this.body.resetTorques(true);
    this.input = { ...NEUTRAL_INPUT };
    this.modules.forEach((m, i) => {
      m.angle = m.speed = m.load = 0; m.grounded = false; m.suspension = this.definition.springLength;
      m.point = vec(); m.force = vec();
      this.wheels[i].setTranslationWrtParent(vec(m.x, this.definition.mountY - m.suspension, m.z));
    });
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  step(dt: number, turnOverride = this.input.turn, powered = true) {
    this.body.resetForces(false); this.body.resetTorques(false);
    const q = this.body.rotation(), position = this.body.translation();
    const up = rotate(vec(0, 1, 0), q), down = mul(up, -1);
    // A shared, level suspension platform rides the actual bump mesh. Only bump
    // contacts are assisted; walls, trench posts and overhead beams stay solid.
    let terrain = 0;
    if (position.y < 0.8) for (const x of [-this.definition.length / 2 - 0.06 - 0.2 * this.pose.intake, 0, this.definition.length / 2 + 0.06]) {
      for (const z of [-this.definition.width / 2, 0, this.definition.width / 2]) {
        const sample = add(position, rotate(vec(x, 0, z), q));
        const hit = this.world.castRay(new RAPIER.Ray(vec(sample.x, 0.5, sample.z), vec(0, -1, 0)), 0.5, false,
          RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, undefined, this.body,
          c => !!this.fieldElements.get(c.handle)?.startsWith('bump-'));
        if (hit) terrain = Math.max(terrain, 0.5 - hit.timeOfImpact);
      }
    }
    this.bumpHeight = approach(this.bumpHeight, terrain, dt * (terrain > this.bumpHeight ? 1.8 : 1.2));
    let pitch = 0, roll = 0;
    if (terrain > 0.001) {
      const heights = this.modules.map(m => {
        const sample = add(position, rotate(vec(m.x, 0, m.z), q));
        const hit = this.world.castRay(new RAPIER.Ray(vec(sample.x, 0.5, sample.z), vec(0, -1, 0)), 0.5, false,
          RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, undefined, this.body,
          c => !!this.fieldElements.get(c.handle)?.startsWith('bump-'));
        return hit ? 0.5 - hit.timeOfImpact : 0;
      });
      const mean = (axis: 'x' | 'z', sign: number) => {
        const indices = this.modules.map((m, i) => ({ m, i })).filter(({ m }) => Math.sign(m[axis]) === sign);
        return indices.reduce((sum, { i }) => sum + heights[i], 0) / indices.length;
      };
      pitch = Math.atan2(mean('x', 1) - mean('x', -1), 2 * Math.abs(this.modules[0].x));
      roll = -Math.atan2(mean('z', 1) - mean('z', -1), 2 * Math.abs(this.modules[0].z));
      const limit = Math.min(1, (15 * Math.PI / 180) / (Math.hypot(pitch, roll) || 1));
      pitch *= limit; roll *= limit;
    }
    const blend = 1 - Math.exp(-14 * dt);
    this.bumpPitch += (pitch - this.bumpPitch) * blend;
    this.bumpRoll += (roll - this.bumpRoll) * blend;
    if (!powered) this.body.addTorque(vec(0, -this.body.angvel().y * this.definition.inertia[1] * 16, 0), true);
    let forward = this.input.forward, strafe = this.input.strafe;
    const magnitude = Math.max(1, Math.hypot(forward, strafe));
    const scale = this.tuning.maxSpeed * (this.input.slow ? 0.32 : 1);
    forward = forward / magnitude * scale; strafe = strafe / magnitude * scale;
    const omega = turnOverride * 4.8 * (this.input.slow ? 0.5 : 1);
    const targets = this.modules.map((m) => ({ x: forward + omega * m.z, z: strafe - omega * m.x }));
    const desaturate = Math.max(1, ...targets.map((v) => Math.hypot(v.x, v.z) / this.tuning.maxSpeed));
    this.modules.forEach((m, i) => {
      const target = targets[i];
      let targetSpeed = Math.hypot(target.x, target.z) / desaturate;
      let targetAngle = targetSpeed > 0.01 ? Math.atan2(target.z, target.x) : m.angle;
      if (this.input.brake) { targetSpeed = 0; targetAngle = Math.atan2(m.z, m.x); }
      if (Math.abs(angleDelta(targetAngle, m.angle)) > Math.PI / 2) { targetAngle += Math.PI; targetSpeed *= -1; }
      const error = angleDelta(targetAngle, m.angle);
      if (powered) m.angle += Math.max(-18 * dt, Math.min(18 * dt, error));
      targetSpeed *= Math.max(0, Math.cos(error));
      if (powered) m.speed = this.input.brake ? 0 : approach(m.speed, targetSpeed, this.tuning.acceleration * dt);
      const mount = add(position, rotate(vec(m.x, this.definition.mountY, m.z), q));
      const maxRay = this.definition.springLength + this.definition.travel + this.definition.wheelRadius;
      // Fuel never acts as a suspension surface. It still collides with the frame and wheel proxies.
      let hit = this.world.castRayAndGetNormal(new RAPIER.Ray(mount, down), maxRay, false,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, this.body);
      if (this.bumpHeight > 0.001 && mount.y - this.bumpHeight < maxRay && mount.y - this.bumpHeight > -0.1) {
        hit = { ...hit, normal: up, timeOfImpact: Math.max(0, mount.y - this.bumpHeight) } as RAPIER.RayColliderIntersection;
      }
      m.grounded = !!hit && dot(hit.normal, up) > 0.35;
      m.load = 0; m.force = vec();
      m.suspension = hit && m.grounded ? Math.max(0.025, hit.timeOfImpact - this.definition.wheelRadius) : this.definition.springLength + this.definition.travel;
      m.point = add(mount, mul(down, hit && m.grounded ? hit.timeOfImpact : maxRay));
      this.wheels[i].setTranslationWrtParent(vec(m.x, this.definition.mountY - m.suspension, m.z));
      if (!hit || !m.grounded) return;
      const velocity = this.body.velocityAtPoint(m.point);
      const compression = this.definition.springLength - m.suspension;
      m.load = Math.max(0, Math.min(this.definition.mass * 9.81 * 1.8, compression * 18000 - dot(velocity, up) * 650));
      const normalForce = mul(up, m.load);
      this.body.addForceAtPoint(normalForce, m.point, true);
      const wheelDirection = rotate(vec(Math.cos(m.angle), 0, Math.sin(m.angle)), q);
      const tangent = normalize(add(wheelDirection, mul(hit.normal, -dot(wheelDirection, hit.normal))));
      const lateral = normalize(vec(hit.normal.y * tangent.z - hit.normal.z * tangent.y,
        hit.normal.z * tangent.x - hit.normal.x * tangent.z, hit.normal.x * tangent.y - hit.normal.y * tangent.x));
      if (!powered) m.speed = dot(velocity, tangent);
      const motorForce = powered ? (m.speed - dot(velocity, tangent)) * (this.definition.mass / 4) * 14 : 0;
      const sideForce = -dot(velocity, lateral) * (this.definition.mass / 4) * 22;
      let tireForce = add(mul(tangent, motorForce), mul(lateral, sideForce));
      const limit = this.tuning.grip * m.load;
      tireForce = mul(tireForce, Math.min(1, limit / (Math.hypot(tireForce.x, tireForce.y, tireForce.z) || 1)));
      this.body.addForceAtPoint(tireForce, m.point, true);
      m.force = add(normalForce, tireForce);
      if (this.bumpHeight > 0.001) {
        // Let the visible modules reach the actual ramp independently while
        // the assisted platform keeps the frame parallel to the carpet.
        const surface = this.world.castRay(new RAPIER.Ray(mount, down), 0.4, false,
          RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, this.body);
        if (surface) {
          m.suspension = Math.max(0.025, Math.min(0.3, surface.timeOfImpact - this.definition.wheelRadius));
          m.point = add(mount, mul(down, surface.timeOfImpact));
          this.wheels[i].setTranslationWrtParent(vec(m.x, this.definition.mountY - m.suspension, m.z));
        }
      }
    });
  }

  get telemetry(): DriveTelemetry {
    const p = this.body.translation(), v = this.body.linvel(), q = this.body.rotation();
    const forward = rotate(vec(1, 0, 0), q), up = rotate(vec(0, 1, 0), this.renderRotation);
    return { speed: Math.hypot(v.x, v.z), turnRate: this.body.angvel().y,
      grounded: this.modules.filter((m) => m.grounded && m.load > 1).length,
      tilt: Math.acos(Math.max(-1, Math.min(1, up.y))) * 180 / Math.PI,
      x: p.x, z: p.z, heading: Math.atan2(-forward.z, forward.x) };
  }
}
