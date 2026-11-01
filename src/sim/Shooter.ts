import RAPIER from '@dimforge/rapier3d-compat';
import { FIELD_HALF_LENGTH, shotTarget } from '../field/targets';
import type { Alliance, ShotTarget } from '../field/targets';
import { FUEL_LINEAR_DAMPING, FUEL_MASS, FUEL_RADIUS } from './FuelSystem';
import type { FuelSystem } from './FuelSystem';
import type { SwerveChassis } from './SwerveChassis';
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
const speedPerRpm = 2 * Math.PI * SHOOTER.drumRadius / 60 * SHOOTER.slip;
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

/** Four managed feed lanes, one shared flywheel and a real, force-driven chassis aim controller. */
export class Shooter {
  alliance: Alliance = 'blue';
  rpm = 0;
  elevation = SHOOTER.maxElevation;
  drumAngle = 0;
  feederAngle = 0;
  solution: AimSolution | null = null;
  readonly shots: ShotEvent[] = []; // bounded recent launch records for bench inspection
  shotsFired = 0;
  private selection: { alliance: Alliance; kind: ShotTarget['kind']; time: number; extra: number; obstructed: boolean; until: number } | null = null;
  private active = false;
  private blocked = false;
  private randomState = 29102026;
  private feedOrder: number[] = [];
  private laneOrder: number[] = [];
  private nextFeedAt = 0;
  private nextLaunchAt = 0;
  private laneState = SHOOTER.lanes.map(z => ({ z, id: null as number | null, age: 0, duration: SHOOTER.feedSeconds, offset: 0, availableAt: 0, lastShotAt: -Infinity, start: v3() }));
  private random() { this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0; return this.randomState / 0x100000000; }
  private refillOrder() {
    if (!this.laneOrder.length) {
      this.laneOrder = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [this.laneOrder[i], this.laneOrder[j]] = [this.laneOrder[j], this.laneOrder[i]]; }
    }
    this.feedOrder = [...this.laneOrder];
  }

  constructor(private world: RAPIER.World, private chassis: SwerveChassis, private fuel: FuelSystem, private owner: string, private payloadChanged: () => void) {}
  get hood() { return (SHOOTER.maxElevation - this.elevation) / (SHOOTER.maxElevation - SHOOTER.minElevation); }
  /** Measured drum tangent plus 155 mm of guide clearance; not the bumper edge. */
  muzzleLocal(elevation: number, z: number) {
    const radius = SHOOTER.drumRadius + FUEL_RADIUS + 0.004;
    return v3(0.282575 - Math.sin(elevation) * radius + Math.cos(elevation) * 0.155,
      0.25325 + Math.cos(elevation) * radius + Math.sin(elevation) * 0.155, z);
  }
  muzzle(z = 0, elevation = this.elevation) { return add(this.chassis.body.translation(), rotate(this.muzzleLocal(elevation, z), this.chassis.renderRotation)); }

  private candidate(target: ShotTarget, t: number) {
    const body = this.chassis.body, q = this.chassis.renderRotation;
    if (target.kind === 'Pass' && Math.hypot(target.position.x - body.translation().x, target.position.z - body.translation().z) > SHOOTER.passRange) return null;
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
    if (elevation < SHOOTER.minElevation || elevation > SHOOTER.maxElevation || speed < SHOOTER.minSpeed || speed > SHOOTER.maxSpeed) return null;
    const muzzle = this.muzzle(0, elevation), launch = add(body.velocityAtPoint(muzzle), relative);
    const verticalAtTarget = launch.y * Math.exp(-FUEL_LINEAR_DAMPING * t) - 9.81 / FUEL_LINEAR_DAMPING * (1 - Math.exp(-FUEL_LINEAR_DAMPING * t));
    if (verticalAtTarget > -1) return null; // Require descending entry/landing.
    const preferred = (target.kind === 'Hub' ? 64 : 52) * DEG;
    const local = unrotate(relative, q), dx = relative.x * a, dz = relative.z * a, velocity = body.linvel();
    const trackingRate = clamp((dx * velocity.z - dz * velocity.x) / (dx * dx + dz * dz), -2, 2);
    const solution: AimSolution = { target, speed, elevation, yawError: Math.atan2(-local.z, local.x), trackingRate, time: t, obstructed: false };
    return { solution, cost: Math.abs(elevation - preferred) + speed * 0.004, muzzle, launch };
  }

  solve(): AimSolution | null {
    const base = shotTarget(this.chassis.body.translation(), this.alliance), sign = this.alliance === 'blue' ? 1 : -1;
    const targetAt = (extra: number): ShotTarget => ({ kind: base.kind, position: { ...base.position,
      x: base.kind === 'Pass' ? sign * Math.min(FIELD_HALF_LENGTH - 0.55, Math.abs(base.position.x) + extra) : base.position.x } });
    // Re-select arcs at 20 Hz; recompute motion compensation and yaw from current physics every tick.
    const cached = this.selection;
    if (cached && cached.alliance === this.alliance && cached.kind === base.kind && this.fuel.time < cached.until) {
      const current = this.candidate(targetAt(cached.extra), cached.time);
      if (current) return { ...current.solution, obstructed: cached.obstructed };
    }
    let blocked: AimSolution | null = null;
    for (const extra of base.kind === 'Pass' ? [0, 0.2, 0.4, 0.6, 0.8, 1] : [0]) {
      const target = targetAt(extra), candidates = [];
      for (let t = 0.35; t <= 3.2; t += 0.025) {
        const candidate = this.candidate(target, t); if (candidate) candidates.push(candidate);
      }
      candidates.sort((a, b) => a.cost - b.cost);
      blocked ??= candidates[0]?.solution ?? null;
      for (const candidate of candidates) if (this.clearExit(0, candidate.solution.elevation) && this.clearTrajectory(candidate.muzzle, candidate.launch, candidate.solution.time)) {
        this.selection = { alliance: this.alliance, kind: base.kind, time: candidate.solution.time, extra, obstructed: false, until: this.fuel.time + 0.05 };
        return candidate.solution;
      }
    }
    if (blocked) {
      this.selection = { alliance: this.alliance, kind: base.kind, time: blocked.time, extra: 0, obstructed: true, until: this.fuel.time + 0.05 };
      return { ...blocked, obstructed: true };
    }
    this.selection = null; return null;
  }

  private clearTrajectory(position: Vector, velocity: Vector, time: number) {
    const steps = Math.ceil(time / 0.08), q = { x: 0, y: 0, z: 0, w: 1 };
    let from = position;
    for (let i = 1; i <= steps; i++) {
      const to = flightPosition(position, velocity, time * i / steps);
      if (this.world.castShape(from, q, sub(to, from), new RAPIER.Ball(FUEL_RADIUS + 0.008), 0, 1, true,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS)) return false;
      from = to;
    }
    return true;
  }
  private clearExit(z: number, elevation = this.elevation) {
    const body = this.chassis.body, q = this.chassis.renderRotation;
    const breech = add(body.translation(), rotate(v3(0.22, 0.19, z), q));
    // Check the managed-to-physical handoff too: the exit point can lie above a trench roof.
    return !this.world.castShape(breech, q, sub(this.muzzle(z, elevation), breech), new RAPIER.Ball(FUEL_RADIUS + 0.002), 0, 1, true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
  }

  preStep(dt: number, requested: boolean, powered = true) {
    this.active = requested; this.blocked = false;
    this.solution = requested ? this.solve() : null;
    this.blocked = !!this.solution?.obstructed;
    const targetRpm = this.solution ? this.solution.speed / speedPerRpm : 0;
    this.rpm = approach(this.rpm, targetRpm, dt * (targetRpm > this.rpm ? SHOOTER.rpmPerSecond : SHOOTER.coastPerSecond));
    if (powered) this.elevation = approach(this.elevation, this.solution?.elevation ?? SHOOTER.maxElevation, dt * SHOOTER.hoodRadiansPerSecond);
    this.drumAngle = (this.drumAngle + this.rpm * 2 * Math.PI / 60 * dt) % (2 * Math.PI);
    if (this.laneState.some(l => l.id !== null)) this.feederAngle += 40 * dt;
    if (!requested || !this.solution || !powered || !this.fuel.ownedBy(this.owner).length) return undefined;
    // Own yaw only while requested. Translation and tire/traction limits remain in SwerveChassis.
    return clamp((9 * this.solution.yawError + 1.8 * this.solution.trackingRate - 0.8 * this.chassis.body.angvel().y) / 4.8, -0.75, 0.75);
  }

  private get stable() {
    const up = rotate(v3(0, 1, 0), this.chassis.renderRotation);
    return up.y > 0.965 && this.chassis.telemetry.grounded >= 3;
  }
  private get ready() {
    return !!this.solution && !this.solution.obstructed && this.stable && Math.abs(this.solution.yawError) < SHOOTER.yawTolerance && Math.abs(this.chassis.body.angvel().y) < 0.3
      && Math.abs(this.elevation - this.solution.elevation) < SHOOTER.hoodTolerance
      && this.chassis.telemetry.speed < SHOOTER.movingThreshold
      && Math.abs(this.rpm * speedPerRpm - this.solution.speed) < Math.max(0.12, this.solution.speed * 0.02);
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
          lane.duration = SHOOTER.feedSeconds + (this.random() - 0.5) * 0.024;
          lane.offset = (this.random() - 0.5) * 0.016;
          this.nextFeedAt = Math.max(this.nextFeedAt, this.fuel.time - dt) + (0.8 + this.random() * 0.4) / SHOOTER.fireRate;
          this.feedOrder.shift();
        }
      }
      if (!f) continue;
      lane.age = clamp(lane.age + (requested ? dt : -dt), 0, lane.duration);
      const t = lane.age / lane.duration, z = lane.z + lane.offset;
      const end = this.muzzleLocal(this.elevation, z), control = v3(0.18, 0.12, z);
      f.local = lerp(lerp(lane.start, control, t), lerp(control, end, t), t);
      if (!requested && lane.age === 0) { f.state = 'stored'; lane.id = null; continue; }
      if (t < 1 || !this.ready || !requested || !this.solution || this.fuel.time < this.nextLaunchAt || this.fuel.time < lane.lastShotAt + SHOOTER.laneInterval - 1e-7) continue;
      const position = this.muzzle(z), q = this.chassis.renderRotation;
      const relative = rotate(v3(Math.cos(this.elevation), Math.sin(this.elevation), 0), q);
      // Include own proxies and other loose balls: never create a projectile in solid geometry.
      const sweepStart = position;
      const hit = this.world.castShape(sweepStart, q, scale(relative, 0.25), new RAPIER.Ball(FUEL_RADIUS + 0.002), 0, 1, true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
      if (hit || !this.clearExit(z)) { this.blocked = true; continue; }
      // Small, repeatable wheel slip and release-angle differences break up
      // ruler-straight rows while retaining the physical aiming solution.
      const elevation = this.elevation + (this.random() - 0.5) * 0.008;
      const yaw = (this.random() - 0.5) * 0.009;
      const exit = rotate(scale(v3(Math.cos(elevation) * Math.cos(yaw), Math.sin(elevation), Math.cos(elevation) * Math.sin(yaw)),
        this.rpm * speedPerRpm * (0.996 + this.random() * 0.008)), q);
      const velocity = add(this.chassis.body.velocityAtPoint(position), exit);
      if (!this.fuel.release(f, position, velocity, true)) continue;
      this.payloadChanged();
      this.chassis.body.applyImpulseAtPoint(scale(exit, -FUEL_MASS), position, true);
      this.shotsFired++; this.shots.push({ id: f.id, lane: SHOOTER.lanes.indexOf(lane.z), time: this.fuel.time, position, velocity, target: this.solution.target, flightTime: this.solution.time });
      if (this.shots.length > 64) this.shots.shift();
      this.rpm = Math.max(0, this.rpm - SHOOTER.rpmDropPerBall);
      this.nextLaunchAt = this.fuel.time + 0.016;
      lane.lastShotAt = this.fuel.time;
      lane.id = null; lane.availableAt = this.fuel.time;
    }
  }
  reset(clearShots = true) {
    for (const lane of this.laneState) {
      if (lane.id !== null) { const f = this.fuel.records[lane.id]; if (f.owner === this.owner && f.state === 'feeding') { f.state = 'stored'; f.local = { ...lane.start }; } }
      lane.id = null; lane.age = lane.availableAt = 0; lane.lastShotAt = -Infinity;
    }
    this.rpm = this.drumAngle = this.feederAngle = 0; this.elevation = SHOOTER.maxElevation;
    this.solution = null; this.selection = null; this.active = this.blocked = false;
    this.feedOrder = []; this.laneOrder = []; this.nextFeedAt = this.nextLaunchAt = 0;
    this.randomState = 29102026;
    if (clearShots) { this.shots.length = 0; this.shotsFired = 0; }
  }
  stopRequest() { this.active = false; this.solution = null; this.selection = null; this.blocked = false; }
  get telemetry(): ShooterTelemetry {
    const solution = this.solution, feeding = this.laneState.filter(l => l.id !== null).length;
    const mode = !this.active ? 'Idle' : !this.fuel.ownedBy(this.owner).length ? 'Empty' : !solution ? 'Out of range' : !this.stable ? 'Unstable'
      : this.blocked ? 'Blocked' : Math.abs(solution.yawError) >= SHOOTER.yawTolerance || Math.abs(this.chassis.body.angvel().y) >= 0.3 ? 'Aiming'
      : this.chassis.telemetry.speed >= SHOOTER.movingThreshold ? 'Waiting to stop'
      : Math.abs(this.elevation - solution.elevation) >= SHOOTER.hoodTolerance ? 'Adjusting hood'
      : !this.ready ? 'Spinning up' : feeding ? 'Feeding' : 'Ready';
    return { active: this.active, mode, target: solution?.target.kind ?? null, rpm: this.rpm, targetRpm: solution ? solution.speed / speedPerRpm : 0,
      elevation: this.elevation / DEG, yawError: (solution?.yawError ?? 0) / DEG, shots: this.shotsFired, feeding,
      lanes: this.laneState.map(l => l.id === null ? 0 : l.age / l.duration) };
  }
}
