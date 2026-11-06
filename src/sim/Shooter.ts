import RAPIER from '@dimforge/rapier3d-compat';
import { FIELD_HALF_LENGTH } from '../field/targets';
import { selectShotTarget } from '../field/passTargets';
import type { Alliance, ShotTarget } from '../field/targets';
import { FUEL_LINEAR_DAMPING, FUEL_MASS, FUEL_RADIUS } from './FuelSystem';
import type { FuelSystem } from './FuelSystem';
import type { SwerveChassis } from './SwerveChassis';
import { DRIVE_RESPONSE } from './SwerveChassis';
import { DEFAULT_SHOT_SPREAD, sampleShotScatter } from './ShotScatter';
import { turretTravelError } from './TurretTravel';
import { add, sub, scale, lerp, rotate, unrotate, v3 } from './vector';
import type { Vector } from './vector';

const DEG = Math.PI / 180;
export const SHOOTER = {
  lanes: [-0.2286, -0.0762, 0.0762, 0.2286],
  minElevation: 38 * DEG, maxElevation: 75 * DEG, // 37° hood travel from team code; exit-angle mapping is a fit.
  minSpeed: 4, maxSpeed: 19, drumRadius: 0.0508, slip: 0.8,
  rpmPerSecond: 4000, coastPerSecond: 1100, rpmDropPerBall: 35,
  hoodRadiansPerSecond: 140 * DEG, feedSeconds: 0.10, laneInterval: 0.125, fireRate: 32, movingThreshold: 0.18, passRange: 33 * 0.3048,
  yawTolerance: 1.5 * DEG, hoodTolerance: 1 * DEG,
};
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const approach = (from: number, to: number, amount: number) => from + clamp(to - from, -amount, amount);
export type AimSolution = { target: ShotTarget; speed: number; elevation: number; yawError: number; trackingRate: number; time: number; obstructed: boolean };
export type ShotEvent = { id: number; lane: number; time: number; position: Vector; velocity: Vector; target: ShotTarget; flightTime: number };
export type ShooterTelemetry = {
  active: boolean; mode: 'Idle' | 'Empty' | 'Aiming' | 'Waiting to stop' | 'Spinning up' | 'Adjusting hood' | 'Ready' | 'Feeding' | 'Blocked' | 'Out of range' | 'Unstable';
  target: 'Hub' | 'Pass' | null; rpm: number; targetRpm: number; elevation: number; yawError: number;
  shots: number; feeding: number; lanes: number[];
};

/** Linear-drag trajectory, using the same damping coefficient as physical fuel.
 * The small continuous/discrete difference is bounded by physical range tests. */
export function flightPosition(position: Vector, velocity: Vector, seconds: number) {
  const a = (1 - Math.exp(-FUEL_LINEAR_DAMPING * seconds)) / FUEL_LINEAR_DAMPING;
  const b = (seconds - a) / FUEL_LINEAR_DAMPING;
  return add(position, add(scale(velocity, a), v3(0, -9.81 * b, 0)));
}

/** Definition-owned feed lanes and flywheel geometry, with chassis or turret aiming. */
export class Shooter {
  turretYaw = 0;
  get geometry() { return this.chassis.definition.shooterGeometry; }
  private get minElevation() { return this.geometry.fixedElevation ?? this.geometry.minElevation ?? SHOOTER.minElevation; }
  private get maxElevation() { return this.geometry.fixedElevation ?? this.geometry.maxElevation ?? SHOOTER.maxElevation; }
  /** Rotate every point about the bearing axis, including an offset flywheel axle. */
  private turretPoint(offset: Vector) {
    const pivot = v3(...this.geometry.pivot), axis = v3(...(this.geometry.turretPivot ?? this.geometry.pivot));
    return add(axis, this.turretRotate(add(sub(pivot, axis), offset)));
  }
  private get speedPerRpm() { return 2 * Math.PI * this.geometry.drumRadius / 60 * SHOOTER.slip; }
  private get mechanism() { return this.chassis.definition.mechanisms; }
  private turretRotate(p: Vector) { const yaw = this.turretYaw + (this.geometry.yawOffset ?? 0), c = Math.cos(yaw), s = Math.sin(yaw); return v3(p.x*c+p.z*s, p.y, -p.x*s+p.z*c); }
  alliance: Alliance = 'blue';
  rpm = 0;
  elevation = SHOOTER.maxElevation;
  drumAngle = 0;
  feederAngle = 0;
  solution: AimSolution | null = null;
  readonly shots: ShotEvent[] = []; // bounded recent launch records for bench inspection
  shotsFired = 0;
  private selection: { alliance: Alliance; kind: ShotTarget['kind']; intermediate: boolean; time: number; extra: number; obstructed: boolean; until: number } | null = null;
  private active = false;
  private blocked = false;
  private chassisAimTurnSign = 0;
  private randomState = 29102026;
  private scatterState = 20261102;
  private velocityEstimate: Vector | null = null;
  private previousVelocity: Vector | null = null;
  private motionAcceleration = 0;
  private feedOrder: number[] = [];
  private laneOrder: number[] = [];
  private nextFeedAt = 0;
  private nextLaunchAt = 0;
  private laneState: { z: number; id: number | null; age: number; duration: number; offset: number; availableAt: number; lastShotAt: number; start: Vector }[] = [];
  // One slot per conventional lane; a pipelined channel can hold several visible balls in transit.
  private makeFeedSlots() { return this.mechanism.lanes.flatMap(z => Array.from({ length: this.geometry.feedPath ? 8 : 1 }, () => z)).map(z => ({ z, id: null as number | null, age: 0, duration: SHOOTER.feedSeconds, offset: 0, availableAt: 0, lastShotAt: -Infinity, start: v3() })); }
  private random() { this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0; return this.randomState / 0x100000000; }
  private scatterRandom = () => { this.scatterState = (Math.imul(this.scatterState, 1664525) + 1013904223) >>> 0; return this.scatterState / 0x100000000; };
  private refillOrder() {
    if (!this.laneOrder.length) {
      this.laneOrder = this.laneState.map((_, i) => i);
      for (let i = this.laneOrder.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [this.laneOrder[i], this.laneOrder[j]] = [this.laneOrder[j], this.laneOrder[i]]; }
    }
    this.feedOrder = [...this.laneOrder];
  }

  constructor(private world: RAPIER.World, private chassis: SwerveChassis, private fuel: FuelSystem, private owner: string, private payloadChanged: () => void) { this.laneState = this.makeFeedSlots(); this.elevation = this.maxElevation; }
  get hood() { return this.geometry.fixedElevation === undefined ? (this.maxElevation - this.elevation) / (this.maxElevation - this.minElevation) : 0; }
  /** Measured drum tangent plus 155 mm of guide clearance; not the bumper edge. */
  muzzleLocal(elevation: number, z: number) {
    const radius = this.geometry.drumRadius + FUEL_RADIUS + 0.004;
    return this.turretPoint(v3(-Math.sin(elevation) * radius + Math.cos(elevation) * this.geometry.guideLength,
      Math.cos(elevation) * radius + Math.sin(elevation) * this.geometry.guideLength, z));
  }
  muzzle(z = 0, elevation = this.elevation) { return add(this.chassis.body.translation(), rotate(this.muzzleLocal(elevation, z), this.chassis.renderRotation)); }

  private candidate(target: ShotTarget, t: number) {
    const body = this.chassis.body, q = this.chassis.renderRotation;
    if (target.kind === 'Pass' && Math.hypot(target.position.x - body.translation().x, target.position.z - body.translation().z) > (this.geometry.passRange ?? SHOOTER.passRange)) return null;
    const a = (1 - Math.exp(-FUEL_LINEAR_DAMPING * t)) / FUEL_LINEAR_DAMPING;
    const b = (t - a) / FUEL_LINEAR_DAMPING;
    let elevation = this.elevation, relative = v3();
    for (let iteration = 0; iteration < 3; iteration++) {
      const muzzle = this.muzzle(0, elevation), delta = sub(target.position, muzzle);
      relative = sub(scale(add(delta, v3(0, 9.81 * b, 0)), 1 / a), body.velocityAtPoint(muzzle));
      const local = unrotate(relative, q);
      elevation = Math.atan2(local.y, Math.hypot(local.x, local.z));
    }
    const speed = Math.hypot(relative.x, relative.y, relative.z);
    if (elevation < this.minElevation - 1e-6 || elevation > this.maxElevation + 1e-6 || speed < SHOOTER.minSpeed || speed > SHOOTER.maxSpeed) return null;
    const muzzle = this.muzzle(0, elevation), launch = add(body.velocityAtPoint(muzzle), relative);
    const verticalAtTarget = launch.y * Math.exp(-FUEL_LINEAR_DAMPING * t) - 9.81 / FUEL_LINEAR_DAMPING * (1 - Math.exp(-FUEL_LINEAR_DAMPING * t));
    if (verticalAtTarget > -1) return null; // Require descending entry/landing.
    const preferred = (target.kind === 'Hub' ? 64 : 52) * DEG;
    const local = unrotate(relative, q), dx = relative.x * a, dz = relative.z * a, velocity = body.linvel();
    const trackingRate = clamp((dx * velocity.z - dz * velocity.x) / (dx * dx + dz * dz), -2, 2);
    const yawError = Math.atan2(-local.z, local.x) - this.turretYaw - (this.geometry.yawOffset ?? 0);
    const solution: AimSolution = { target, speed, elevation, yawError: Math.atan2(Math.sin(yawError), Math.cos(yawError)), trackingRate, time: t, obstructed: false };
    return { solution, cost: Math.abs(elevation - preferred) + speed * 0.004, muzzle, launch };
  }

  /** Solve flight time at the real fixed hood angle, rather than moving a
   * nonexistent hood to fit one of the variable-angle trajectory samples. */
  private fixedFlightTimes(target: ShotTarget): number[] {
    const elevation = this.geometry.fixedElevation!;
    const muzzle = this.muzzle(0, elevation), delta = sub(target.position, muzzle), q = this.chassis.renderRotation;
    const velocity = this.chassis.body.velocityAtPoint(muzzle);
    const error = (t: number) => {
      const a = (1 - Math.exp(-FUEL_LINEAR_DAMPING * t)) / FUEL_LINEAR_DAMPING, b = (t - a) / FUEL_LINEAR_DAMPING;
      const v = unrotate(sub(scale(add(delta, v3(0, 9.81 * b, 0)), 1 / a), velocity), q);
      return v.y - Math.hypot(v.x, v.z) * Math.tan(elevation);
    };
    const times: number[] = []; let previous = .1, lowError = error(previous);
    for (let next = .125; next <= 3.2; next += .025) {
      const highError = error(next);
      if (lowError * highError < 0) {
        let lo = previous, hi = next, sign = lowError;
        for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2, e = error(mid); if (sign * e <= 0) hi = mid; else { lo = mid; sign = e; } }
        times.push((lo + hi) / 2);
      }
      previous = next; lowError = highError;
    }
    return times;
  }

  solve(): AimSolution | null {
    const { target: base, intermediate } = selectShotTarget(this.chassis.body.translation(), this.alliance,
      this.geometry.passRange ?? SHOOTER.passRange, this.geometry.passLandingExtra ?? 0);
    const sign = this.alliance === 'blue' ? 1 : -1;
    const targetAt = (extra: number): ShotTarget => ({ kind: base.kind, position: { ...base.position,
      x: base.kind === 'Pass' ? sign * Math.min(FIELD_HALF_LENGTH - 0.55, sign * base.position.x + extra) : base.position.x } });
    // Re-select arcs at 20 Hz; recompute motion compensation and yaw from current physics every tick.
    const cached = this.selection;
    if (cached && cached.alliance === this.alliance && cached.kind === base.kind && cached.intermediate === intermediate && this.fuel.time < cached.until) {
      const current = this.candidate(targetAt(cached.extra), cached.time);
      if (current) return { ...current.solution, obstructed: cached.obstructed };
    }
    let blocked: AimSolution | null = null;
    // Keep an intermediate target on its chosen clear floor. For home-zone
    // passes, a fixed hood can search farther instead of changing its angle.
    const passOffsets = intermediate ? [0] : this.geometry.fixedElevation === undefined ? [0, .2, .4, .6, .8, 1] : Array.from({ length: 16 }, (_, i) => i * .2);
    for (const extra of base.kind === 'Pass' ? passOffsets : [0]) {
      const target = targetAt(extra), candidates = [];
      const times = this.geometry.fixedElevation === undefined ? Array.from({ length: 115 }, (_, i) => .35 + i * .025) : this.fixedFlightTimes(target);
      for (const t of times) {
        const candidate = this.candidate(target, t); if (candidate) candidates.push(candidate);
      }
      candidates.sort((a, b) => a.cost - b.cost);
      blocked ??= candidates[0]?.solution ?? null;
      for (const candidate of candidates) if (this.clearExit(0, candidate.solution.elevation) && this.clearTrajectory(candidate.muzzle, candidate.launch, candidate.solution.time, base.kind === 'Pass' ? .18 : .008)) {
        this.selection = { alliance: this.alliance, kind: base.kind, intermediate, time: candidate.solution.time, extra, obstructed: false, until: this.fuel.time + 0.05 };
        return candidate.solution;
      }
    }
    if (blocked) {
      this.selection = { alliance: this.alliance, kind: base.kind, intermediate, time: blocked.time, extra: 0, obstructed: true, until: this.fuel.time + 0.05 };
      return { ...blocked, obstructed: true };
    }
    this.selection = null; return null;
  }

  private clearTrajectory(position: Vector, velocity: Vector, time: number, clearance = .008) {
    const steps = Math.ceil(time / 0.08), q = { x: 0, y: 0, z: 0, w: 1 };
    let from = position;
    for (let i = 1; i <= steps; i++) {
      const to = flightPosition(position, velocity, time * i / steps);
      // Pass arcs need headroom for release scatter over nets. Retain the small
      // final margin so a floor landing can remain physically feasible.
      if (this.world.castShape(from, q, sub(to, from), new RAPIER.Ball(FUEL_RADIUS + (i === steps ? .008 : clearance)), 0, 1, true,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS)) return false;
      from = to;
    }
    return true;
  }
  private clearExit(z: number, elevation = this.elevation) {
    const body = this.chassis.body, q = this.chassis.renderRotation;
    const breech = add(body.translation(), rotate(this.turretPoint(v3(-.062575, -.06325, z)), q));
    // Check the managed-to-physical handoff too: the exit point can lie above a trench roof.
    return !this.world.castShape(breech, q, sub(this.muzzle(z, elevation), breech), new RAPIER.Ball(FUEL_RADIUS + 0.002), 0, 1, true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
  }

  preStep(dt: number, requested: boolean, powered = true) {
    const velocity = this.chassis.body.linvel();
    const change = this.previousVelocity ? sub(velocity, this.previousVelocity) : v3();
    this.motionAcceleration = Math.min(12, Math.hypot(change.x, change.y, change.z) / dt);
    this.previousVelocity = { ...velocity };
    this.velocityEstimate = this.velocityEstimate ? lerp(this.velocityEstimate, velocity, 1 - Math.exp(-dt / .06)) : { ...velocity };
    this.active = requested; this.blocked = false;
    this.solution = requested ? this.solve() : null;
    if (this.mechanism.turret && powered && this.solution) {
      const predictedError = turretTravelError(this.turretYaw, this.solution.yawError + (this.solution.trackingRate - this.chassis.body.angvel().y) * dt, this.geometry.turretLimits);
      this.turretYaw += clamp(predictedError, -dt * this.geometry.turretRadiansPerSecond, dt * this.geometry.turretRadiansPerSecond);
      if (this.geometry.turretLimits) this.turretYaw = clamp(this.turretYaw, ...this.geometry.turretLimits);
      this.solution = this.solve();
    }
    this.blocked = !!this.solution?.obstructed;
    const targetRpm = this.solution ? this.solution.speed / this.speedPerRpm : 0;
    this.rpm = approach(this.rpm, targetRpm, dt * (targetRpm > this.rpm ? SHOOTER.rpmPerSecond : SHOOTER.coastPerSecond));
    if (powered) this.elevation = approach(this.elevation, this.solution?.elevation ?? this.maxElevation, dt * SHOOTER.hoodRadiansPerSecond);
    this.drumAngle = (this.drumAngle + this.rpm * 2 * Math.PI / 60 * dt) % (2 * Math.PI);
    if (requested || this.laneState.some(l => l.id !== null)) this.feederAngle += 40 * dt;
    if (!requested || !this.solution || !powered || !this.fuel.ownedBy(this.owner).length) { this.chassisAimTurnSign = 0; return undefined; }
    // Manual turning takes priority over fixed-shooter aim assist. Keep solving
    // and spinning up; normal aim/motion gates decide when a release is safe.
    // Releasing turn resumes chassis alignment without releasing Shoot.
    if (this.mechanism.turret || this.chassis.input.turn !== 0) { this.chassisAimTurnSign = 0; return undefined; }
    const yawError = this.solution.yawError;
    // Early steering forces can cross the 180-degree wrap tie. Hold the chosen
    // direction until clear of it rather than reversing wheel commands each tick.
    if (!this.chassisAimTurnSign || Math.abs(yawError) < Math.PI - .1) this.chassisAimTurnSign = Math.sign(yawError);
    const steeringError = Math.abs(yawError) >= Math.PI - .1 ? Math.abs(yawError) * this.chassisAimTurnSign : yawError;
    return clamp((9 * steeringError + 1.8 * this.solution.trackingRate - 0.8 * this.chassis.body.angvel().y) / DRIVE_RESPONSE.turnRate, -0.75, 0.75);
  }

  private get stable() {
    const up = rotate(v3(0, 1, 0), this.chassis.renderRotation);
    return up.y > 0.965 && this.chassis.telemetry.grounded >= 3;
  }
  private get supportsMovingRelease() {
    return this.mechanism.movingShots || (!!this.mechanism.movingPasses && this.solution?.target.kind === 'Pass');
  }
  private get motionReady() {
    const limits = this.solution?.target.kind === 'Pass' ? this.geometry.movingLimits?.pass : this.geometry.movingLimits?.hub;
    return (this.supportsMovingRelease || this.chassis.telemetry.speed < SHOOTER.movingThreshold)
      && (!limits || this.chassis.telemetry.speed <= limits.speed && Math.abs(this.chassis.body.angvel().y) <= limits.turnRate);
  }
  private get ready() {
    return !!this.solution && !this.solution.obstructed && this.stable && Math.abs(this.solution.yawError) < SHOOTER.yawTolerance && (this.mechanism.turret || Math.abs(this.chassis.body.angvel().y) < 0.3)
      && Math.abs(this.elevation - this.solution.elevation) < SHOOTER.hoodTolerance
      && this.motionReady
      && Math.abs(this.rpm * this.speedPerRpm - this.solution.speed) < Math.max(0.12, this.solution.speed * 0.02);
  }

  private feedPoints(start: Vector, end: Vector) {
    // Wide fixed rollers feed along the selected release column, not one central
    // throat. Use the actual muzzle Z so reversed shooters keep the same path.
    const lateral = this.geometry.feedAcrossLanes ? end.z - this.geometry.pivot[2] : 0;
    return [start, ...(this.geometry.feedPath ?? []).map(p => v3(p[0], p[1], p[2] + lateral)), end];
  }
  private feedLength(start: Vector, end: Vector) {
    const p = this.feedPoints(start, end);
    return p.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x-p[i].x, point.y-p[i].y, point.z-p[i].z), 0);
  }
  private feedPosition(start: Vector, end: Vector, t: number) {
    const points = this.feedPoints(start, end);
    let distance = this.feedLength(start, end) * t;
    for (let i = 1; i < points.length; i++) {
      const a = points[i-1], b = points[i], length = Math.hypot(b.x-a.x, b.y-a.y, b.z-a.z);
      if (distance <= length) return lerp(a, b, length ? distance / length : 1);
      distance -= length;
    }
    return { ...end };
  }

  postStep(dt: number, requested: boolean) {
    // Re-evaluate after physics so crossing the zone line or rotating this tick cannot fire on stale aim.
    this.active = requested; this.solution = requested ? this.solve() : null;
    this.blocked = !!this.solution?.obstructed;
    if (!this.feedOrder.length) this.refillOrder();
    for (const lane of this.laneState) {
      let f = lane.id === null ? null : this.fuel.records[lane.id];
      if (f && (f.owner !== this.owner || f.state !== 'feeding')) { lane.id = null; f = null; }
      if (!f && requested && this.ready && this.fuel.time >= lane.availableAt && this.fuel.time >= this.nextFeedAt
        && this.laneState.indexOf(lane) === this.feedOrder[0]) {
        f = this.fuel.ownedBy(this.owner).filter(fuel => fuel.state === 'stored').sort((a, b) => b.local.x - a.local.x || Math.abs(a.local.z - lane.z) - Math.abs(b.local.z - lane.z) || a.id - b.id)[0] ?? null;
        if (f) {
          lane.id = f.id; lane.age = 0; lane.start = { ...f.local }; f.state = 'feeding';
          const wide = this.geometry.feedAcrossLanes;
          if (wide) lane.offset = (this.random() - .5) * 2 * (this.geometry.laneJitter ?? .008);
          lane.duration = this.geometry.feedPath ? Math.max(this.mechanism.feedSeconds ?? .25, this.feedLength(lane.start, this.muzzleLocal(this.elevation, lane.z + (wide ? lane.offset : 0))) / 3.2) : SHOOTER.feedSeconds * (1 + (this.random() - .5) * .24);
          if (!wide) lane.offset = (this.random() - 0.5) * 0.016;
          this.nextFeedAt = Math.max(this.nextFeedAt, this.fuel.time - dt) + (0.8 + this.random() * 0.4) / this.mechanism.fireRate;
          this.feedOrder.shift();
        }
      }
      if (!f) continue;
      lane.age = clamp(lane.age + (requested ? dt : -dt), 0, lane.duration);
      const t = lane.age / lane.duration, z = lane.z + lane.offset;
      const end = this.muzzleLocal(this.elevation, z), control = this.turretPoint(v3(-.102575, -.13325, z));
      f.local = this.geometry.feedPath ? this.feedPosition(lane.start, end, t) : lerp(lerp(lane.start, control, t), lerp(control, end, t), t);
      if (!requested && lane.age === 0) { f.state = 'stored'; lane.id = null; continue; }
      if (t < 1 || !this.ready || !requested || !this.solution || this.fuel.time < this.nextLaunchAt || this.fuel.time < lane.lastShotAt + (this.mechanism.turret ? Math.min(1 / this.mechanism.fireRate, this.mechanism.feedSeconds ?? Infinity) : SHOOTER.laneInterval) - 1e-7) continue;
      const position = this.muzzle(z), q = this.chassis.renderRotation;
      const relative = rotate(this.turretRotate(v3(Math.cos(this.elevation), Math.sin(this.elevation), 0)), q);
      // Include own proxies and other loose balls: never create a projectile in solid geometry.
      const sweepStart = position;
      const hit = this.world.castShape(sweepStart, q, scale(relative, 0.25), new RAPIER.Ball(FUEL_RADIUS + 0.002), 0, 1, true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
      if (hit || !this.clearExit(z)) { this.blocked = true; continue; }
      const scatter = sampleShotScatter(this.geometry.spread ?? DEFAULT_SHOT_SPREAD, this.geometry.movingAccuracy ?? .9,
        this.chassis.telemetry.speed, this.chassis.body.angvel().y, this.scatterRandom,
        { distance: Math.hypot(this.solution.target.position.x - position.x, this.solution.target.position.z - position.z), turret: this.mechanism.turret });
      const speed = this.chassis.telemetry.speed, turn = Math.abs(this.chassis.body.angvel().y);
      const motion = this.supportsMovingRelease ? clamp(Math.max(0, speed-.1)/.4 + Math.max(0, turn-.1)/1.4, 0, 1) : 0;
      // One spread distribution, with transient acceleration sensitivity.
      const transient = 1 + motion * this.motionAcceleration * .04;
      const elevation = this.elevation + scatter.elevation * transient, yaw = scatter.yaw * transient;
      const exit = rotate(this.turretRotate(scale(v3(Math.cos(elevation) * Math.cos(yaw), Math.sin(elevation), Math.cos(elevation) * Math.sin(yaw)),
        this.rpm * this.speedPerRpm * scatter.speedFactor)), q);
      // A 60 ms motion estimate leaves transient compensation error under acceleration/braking.
      const estimationError = this.velocityEstimate ? scale(sub(this.chassis.body.linvel(), this.velocityEstimate), motion*.35) : v3();
      const velocity = add(add(this.chassis.body.velocityAtPoint(position), exit), estimationError);
      if (!this.fuel.release(f, position, velocity, true)) continue;
      f.body.setAngvel(rotate(this.turretRotate(scatter.spin), q), true);
      this.payloadChanged();
      this.chassis.body.applyImpulseAtPoint(scale(add(exit, estimationError), -FUEL_MASS), position, true);
      this.shotsFired++; this.shots.push({ id: f.id, lane: this.mechanism.lanes.indexOf(lane.z), time: this.fuel.time, position, velocity, target: this.solution.target, flightTime: this.solution.time });
      if (this.shots.length > Math.max(64, this.mechanism.capacity)) this.shots.shift();
      this.rpm = Math.max(0, this.rpm - SHOOTER.rpmDropPerBall);
      this.nextLaunchAt = this.mechanism.turret ? Math.max(this.nextLaunchAt, this.fuel.time - dt) + 1 / this.mechanism.fireRate : this.fuel.time + .016;
      lane.lastShotAt = this.fuel.time;
      lane.id = null; lane.availableAt = this.fuel.time;
    }
  }
  reset(clearShots = true) {
    for (const lane of this.laneState) {
      if (lane.id !== null) { const f = this.fuel.records[lane.id]; if (f.owner === this.owner && f.state === 'feeding') { f.state = 'stored'; f.local = { ...lane.start }; } }
      lane.id = null; lane.age = lane.availableAt = 0; lane.lastShotAt = -Infinity;
    }
    this.turretYaw = 0; this.chassisAimTurnSign = 0; this.velocityEstimate = this.previousVelocity = null; this.motionAcceleration = 0;
    this.rpm = this.drumAngle = this.feederAngle = 0; this.elevation = this.maxElevation;
    this.solution = null; this.selection = null; this.active = this.blocked = false;
    this.feedOrder = []; this.laneOrder = []; this.nextFeedAt = this.nextLaunchAt = 0;
    this.randomState = 29102026;
    this.scatterState = 20261102;
    if (clearShots) { this.shots.length = 0; this.shotsFired = 0; }
  }
  stopRequest() { this.active = false; this.solution = null; this.selection = null; this.blocked = false; this.chassisAimTurnSign = 0; }
  get telemetry(): ShooterTelemetry {
    const solution = this.solution, feeding = this.laneState.filter(l => l.id !== null).length;
    const mode = !this.active ? 'Idle' : !this.fuel.ownedBy(this.owner).length ? 'Empty' : !solution ? 'Out of range' : !this.stable ? 'Unstable'
      : this.blocked ? 'Blocked' : Math.abs(solution.yawError) >= SHOOTER.yawTolerance || (!this.mechanism.turret && Math.abs(this.chassis.body.angvel().y) >= 0.3) ? 'Aiming'
      : !this.motionReady ? 'Waiting to stop'
      : Math.abs(this.elevation - solution.elevation) >= SHOOTER.hoodTolerance ? 'Adjusting hood'
      : !this.ready ? 'Spinning up' : feeding ? 'Feeding' : 'Ready';
    return { active: this.active, mode, target: solution?.target.kind ?? null, rpm: this.rpm, targetRpm: solution ? solution.speed / this.speedPerRpm : 0,
      elevation: this.elevation / DEG, yawError: (solution?.yawError ?? 0) / DEG, shots: this.shotsFired, feeding,
      lanes: this.mechanism.lanes.map(z => Math.max(0, ...this.laneState.filter(l => l.z === z && l.id !== null).map(l => l.age / l.duration))) };
  }
}
