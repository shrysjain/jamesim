import { linkedHopperExtension } from '../robot/poses';
import { HopperDynamics } from './HopperDynamics';
import { Climber } from './Climber';
import RAPIER from '@dimforge/rapier3d-compat';
import { SwerveChassis } from './SwerveChassis';
import type { DriveSpawn } from './SwerveChassis';
import { FuelSystem, FUEL_MASS, FUEL_RADIUS } from './FuelSystem';
import type { Fuel } from './FuelSystem';
import type { RobotDefinition, RobotPose } from '../robot/RobotDefinition';
import { REBLITZ_CARGO, REBLITZ_FEEDER_POCKET } from '../robot/robots/2910-reblitz/cargo';
import { REBLITZ, STARTING_POSE } from '../robot/RobotDefinition';
import { add, sub, scale, lerp, rotate, unrotate, v3 } from './vector';
import type { Vector } from './vector';
import { Shooter } from './Shooter';
import type { ShooterTelemetry } from './Shooter';
import { GameplayContacts } from './GameplayContacts';

export type MechanismInput = { intake: boolean; reverse: boolean; shoot?: boolean; toggleIntake?: boolean; climb?: boolean; supply?: boolean };
export const NEUTRAL_MECHANISMS: MechanismInput = { intake: false, reverse: false, shoot: false };
/** Compatibility exports for existing 2910 benches; every robot now supplies its own cargo layout. */
export const STORAGE_SLOTS: Vector[] = REBLITZ_CARGO.map(([x, y, z]) => v3(x, y, z));
export const FEEDER_POCKET = REBLITZ_FEEDER_POCKET;
export const INTAKE = { capacity: STORAGE_SLOTS.length, deploySeconds: 0.18, compressSeconds: 0.45, transferSeconds: 0.3, capturePerSecond: 50, ejectPerSecond: 12 };
/** Eight balls fit with the mechanism fully in; excess cargo limits compression. */
export const cargoExtension = (count: number, capacity = INTAKE.capacity) => Math.max(0, Math.min(1, (count - 8) / Math.max(1, capacity - 8)));
export type MechanismTelemetry = {
  count: number; capacity: number; transferring: number; stored: number; loose: number;
  mode: 'Stowed' | 'Deployed' | 'Deploying' | 'Compressing' | 'Intaking' | 'Holding' | 'Full' | 'Reversing' | 'Outlet blocked' | 'Spilling' | 'Pose preview';
  climb: Climber['telemetry'];
  intakeStatus: 'Retracted' | 'Extended' | 'Extending' | 'Retracting' | 'Cargo limited';
  mass: number; intake: number; hopper: number; hood: number; preview: boolean;
  feeding: number; airborne: number; shooter: ShooterTelemetry;
};

/** Fixed-tick mechanism state. Rendering and DOM never own fuel or actuation. */
export class RobotSimulation {
  readonly storageSlots: Vector[];
  readonly pickup: NonNullable<RobotDefinition['pickup']>;
  readonly chassis: SwerveChassis;
  readonly climber: Climber;
  readonly shooter: Shooter;
  readonly contacts: GameplayContacts;
  readonly hopper: HopperDynamics;

  input = { ...NEUTRAL_MECHANISMS };
  inspectionPose: RobotPose | null = null;
  rollerAngle = 0;
  kickerDeployment = 0;
  actuatorsEnabled = true;
  private deployed = false;
  private intakeOut = true;
  private toggleHeld = false;
  private intakeTarget = 0;
  private pendingIntakeToggles = 0;
  private captureCredit = 0;
  private ejectCredit = 0;
  private overturnedFor = 0;
  private outletBlocked = false;
  private payloadSignature = '';

  constructor(private world: RAPIER.World, readonly fuel: FuelSystem, private fieldElements: Map<number, string>, definition: RobotDefinition = REBLITZ, readonly owner = 'robot-0') {
    this.storageSlots = definition.cargoSlots.map(([x, y, z]) => v3(x, y, z));
    if (this.storageSlots.length !== definition.mechanisms.capacity) throw new Error(`Invalid cargo layout for ${definition.id}`);
    this.pickup = definition.pickup;
    this.hopper = new HopperDynamics(definition);
    this.chassis = new SwerveChassis(world, definition, fieldElements);
    this.climber = new Climber(world, this.chassis, fieldElements);
    this.chassis.setPose(STARTING_POSE);
    this.shooter = new Shooter(world, this.chassis, fuel, this.owner, () => this.updatePayload());
    this.contacts = new GameplayContacts(world, this.chassis, fuel, fieldElements);
  }
  get mechanism() { return this.chassis.definition.mechanisms; }
  get capacity() { return this.mechanism.capacity; }
  get hopperMinimumLift() {
    const lift = this.chassis.definition.hopper.autoLift;
    return lift ? Math.max(0, Math.min(1, (this.held.length - lift.loweredCapacity) / (this.capacity - lift.loweredCapacity))) : 0;
  }
  get hopperLiftTarget() {
    return this.chassis.definition.hopper.autoLift && (this.input.intake || this.input.reverse) ? 1 : this.hopperMinimumLift;
  }
  get held() { return this.fuel.ownedBy(this.owner); }
  private storedPosition(slot: number) {
    const p = this.storageSlots[slot];
    // Initial preload/transfer packing; stored cargo then evolves in HopperDynamics.
    // Keep the original feeder entry pocket fixed on 2910.
    return { ...p, x: p.x + (slot === this.chassis.definition.hopper.fixedSlot ? 0 : this.chassis.definition.hopper.stowTravel * (1 - (this.chassis.definition.hopper.intakeCurve ? this.chassis.pose.hopper : this.chassis.pose.intake))) };
  }
  preload(ids: number[]) {
    for (const id of ids.slice(0, 8)) {
      const slot = this.storageSlots.findIndex((_, i) => i < this.capacity && !this.held.some(f => f.slot === i));
      const f = this.fuel.records[id];
      if (slot < 0 || !f || !this.fuel.capture(f, this.owner, slot, this.storedPosition(slot))) continue;
      f.state = 'stored';
    }
    this.updatePayload();
  }
  clearInput() { this.input = { ...NEUTRAL_MECHANISMS }; this.toggleHeld = false; this.pendingIntakeToggles = 0; this.captureCredit = this.ejectCredit = 0; this.shooter.stopRequest(); this.climber.clearInput(); }
  inspect(pose: RobotPose | null) {
    this.clearInput(); this.inspectionPose = pose ? { ...pose } : null;
    if (pose) this.chassis.setPose(pose);
  }
  reset() {
    this.climber.reset(); this.hopper.reset();
    this.clearInput(); this.deployed = false; this.intakeOut = true; this.intakeTarget = 0; this.inspectionPose = null; this.actuatorsEnabled = true;
    this.overturnedFor = 0; this.outletBlocked = false; this.rollerAngle = 0; this.kickerDeployment = 0;
    this.chassis.reset(); this.chassis.setPose(STARTING_POSE); this.updatePayload();
    this.shooter.reset();
  }
  respawn(spawn: DriveSpawn) {
    this.climber.reset(); this.hopper.reset();
    this.clearInput(); this.inspectionPose = null; this.overturnedFor = 0; this.outletBlocked = false;
    this.chassis.reset(spawn); // Held IDs and cargo remain owned by this robot.
    this.deployed = true; this.kickerDeployment = 1;
    this.chassis.setPose({ intake: 1, hopper: 1, hood: 0 });
    this.shooter.reset(false);
    this.updatePayload();
  }
  requestClimbToggle() { this.climber.requestToggle(); }
  requestIntakeToggle() { if (this.chassis.definition.intake.stowTravel || this.chassis.definition.intake.manualRetraction) this.pendingIntakeToggles++; }
  preStep(dt: number) {
    if (this.actuatorsEnabled && !this.inspectionPose && this.pendingIntakeToggles % 2 === 1) this.intakeOut = !this.intakeOut;
    this.pendingIntakeToggles = 0;
    if (this.actuatorsEnabled && !this.inspectionPose && (this.chassis.definition.intake.stowTravel || this.chassis.definition.intake.manualRetraction) && this.input.toggleIntake && !this.toggleHeld) this.intakeOut = !this.intakeOut;
    this.toggleHeld = !!this.input.toggleIntake;
    const held = this.held;
    const shoot = !!this.input.shoot && !this.input.reverse && !this.inspectionPose && this.actuatorsEnabled && !this.climber.attached;
    const aimTurn = this.inspectionPose ? undefined : this.shooter.preStep(dt, shoot, this.actuatorsEnabled);
    if (!this.inspectionPose && this.actuatorsEnabled) {
      const demand = this.input.reverse || (this.input.intake && (!shoot || this.mechanism.simultaneousIntake));
      const approach = (v: number, target: number, seconds: number) => v + Math.max(-dt / seconds, Math.min(dt / seconds, target - v));
      const compress = shoot || (!!(this.chassis.definition.intake.stowTravel || this.chassis.definition.intake.manualRetraction) && !this.intakeOut && !this.input.intake && !this.input.reverse);
      const manual = this.chassis.definition.intake.manualRetraction && !this.intakeOut && !demand;
      const target = demand ? 1 : manual ? cargoExtension(held.length, this.capacity) : this.mechanism.compress && this.deployed && compress ? cargoExtension(held.length, this.capacity) : 1;
      this.intakeTarget = target;
      const intake = approach(this.chassis.pose.intake, target, target < this.chassis.pose.intake ? INTAKE.compressSeconds : INTAKE.deploySeconds);
      const hopper = this.chassis.definition.hopper.intakeCurve ? linkedHopperExtension(this.chassis.definition, intake) : (this.chassis.definition.hopper.coupledToIntake || this.chassis.definition.hopper.stowTravel && this.chassis.definition.intake.stowTravel) ? intake : approach(this.chassis.pose.hopper, 1, INTAKE.deploySeconds);
      if (hopper === 1 && intake === 1) this.deployed = true;
      if (this.chassis.definition.intake.passiveKicker && intake > .1) this.kickerDeployment = Math.min(1, this.kickerDeployment + dt / .25);
      this.chassis.setPose({ intake, hopper, hood: this.shooter.hood, climber: this.climber.telemetry.extension });
      if (demand) this.rollerAngle += (this.input.reverse ? -1 : 1) * 32 * dt;
    }
    for (const f of held) {
      if (f.state === 'transferring') {
        if (!this.actuatorsEnabled) continue;
        f.age += dt;
        const t = Math.min(1, f.age / INTAKE.transferSeconds);
        const entry = this.chassis.definition.hopper.entry, end = entry ? v3(...entry) : this.storedPosition(f.slot);
        const control = v3(-0.4, 0.25, f.start.z * 0.5 + end.z * 0.5);
        f.local = lerp(lerp(f.start, control, t), lerp(control, end, t), t);
        if (t === 1) f.state = 'stored';
      } else if (f.state === 'stored' && !this.chassis.definition.hopper.volume) f.local = this.storedPosition(f.slot);
    }
    if (!this.inspectionPose && this.chassis.definition.hopper.volume) {
      const body = this.chassis.body, q = this.chassis.renderRotation;
      const spills = this.hopper.step(dt, held, this.chassis.pose, {
        position: body.translation(), velocity: body.linvel(), angularVelocity: body.angvel(), rotation: q,
      });
      for (const spill of spills) {
        const f = this.fuel.records[spill.id];
        if (f.owner !== this.owner || f.state !== 'stored') continue;
        const position = add(body.translation(), rotate(f.local, q));
        const velocity = add(body.velocityAtPoint(position), rotate(spill.velocity, q));
        this.fuel.release(f, position, velocity);
      }
    }
    this.updatePayload();
    if (!this.climber.attached) this.chassis.step(dt, aimTurn, this.actuatorsEnabled);
    else { this.chassis.body.resetForces(false); this.chassis.body.resetTorques(false); }
  }
  postStep(dt: number) {
    if (this.inspectionPose || !this.actuatorsEnabled) return;
    const up = rotate(v3(0, 1, 0), this.chassis.body.rotation());
    this.overturnedFor = up.y < 0.4 ? this.overturnedFor + dt : 0;
    const spilling = this.overturnedFor > 0.25;
    const shoot = !!this.input.shoot && !this.input.reverse && !spilling && !this.climber.attached;
    this.shooter.postStep(dt, shoot);
    this.updatePayload();
    this.outletBlocked = false;
    if (spilling || this.input.reverse) {
      this.captureCredit = 0;
      if (!spilling && this.chassis.pose.intake > 0.92 && up.y > 0.7) this.reverseLooseFuel(dt);
      if (spilling || this.chassis.pose.intake > 0.92) {
        this.ejectCredit = Math.min(1, this.ejectCredit + dt * INTAKE.ejectPerSecond);
        const next = this.held[0];
        if (next && this.ejectCredit >= 1 && this.eject(next, spilling)) this.ejectCredit -= 1;
      }
      return;
    }
    this.ejectCredit = 0;
    if (shoot && !this.mechanism.simultaneousIntake) { this.captureCredit = 0; return; }
    const held = this.held;
    if (!this.input.intake || this.chassis.pose.intake < 0.92 || this.chassis.pose.hopper < 0.95 || held.length >= this.capacity || up.y < 0.7) { this.captureCredit = 0; return; }
    this.captureCredit = Math.min(4, this.captureCredit + dt * this.mechanism.intakeRate);
    if (this.captureCredit < 1) return;
    const body = this.chassis.body, position = body.translation(), q = body.rotation();
    // Query first, commit second. Disabled bodies are never loose ammunition.
    const candidates: { fuel: Fuel; local: Vector; impulse: Vector; position: Vector }[] = [];
    for (const f of this.fuel.records) {
      if (f.state !== 'loose' || f.availableAt > this.fuel.time) continue;
      const p = f.body.translation(), local = unrotate(sub(p, position), q);
      if (local.x < this.pickup.minX || local.x > this.pickup.maxX || Math.abs(local.z) > this.pickup.halfWidth || local.y < -0.21 || local.y > 0.025) continue;
      const relative = sub(f.body.linvel(), body.velocityAtPoint(p));
      if (unrotate(relative, q).x < -0.6) continue; // Rapidly departing fuel is not pulled backwards into the robot.
      const mouth = this.toWorld(v3(this.pickup.mouthX, -0.10, local.z));
      if (!this.clearFieldPath(p, mouth)) continue;
      candidates.push({ fuel: f, local, impulse: scale(relative, FUEL_MASS), position: { ...p } });
    }
    candidates.sort((a, b) => b.local.x - a.local.x || a.fuel.id - b.fuel.id);
    const occupied = new Set(held.map(f => f.slot));
    for (const candidate of candidates.slice(0, Math.min(Math.floor(this.captureCredit), this.capacity - held.length))) {
      const slot = this.storageSlots.findIndex((_, i) => i < this.capacity && !occupied.has(i));
      if (slot < 0 || !this.fuel.capture(candidate.fuel, this.owner, slot, candidate.local)) continue;
      occupied.add(slot); this.captureCredit--;
      this.updatePayload();
      body.applyImpulseAtPoint(candidate.impulse, candidate.position, true);
    }
  }
  private reverseLooseFuel(dt: number) {
    const body = this.chassis.body, q = body.rotation();
    for (const f of this.fuel.records) {
      if (f.state !== 'loose') continue;
      const p = f.body.translation(), local = unrotate(sub(p, body.translation()), q);
      if (local.x < this.pickup.minX || local.x > this.pickup.maxX || Math.abs(local.z) > this.pickup.halfWidth || local.y < -0.21 || local.y > 0.025) continue;
      if (!this.clearFieldPath(p, this.toWorld(v3(this.pickup.mouthX, -0.10, local.z)))) continue;
      const relative = unrotate(sub(f.body.linvel(), body.velocityAtPoint(p)), q);
      const impulse = rotate(v3(-Math.min(Math.max(0, 2.2 + relative.x), 16 * dt) * FUEL_MASS, 0, 0), q);
      f.body.applyImpulse(impulse, true); body.applyImpulseAtPoint(scale(impulse, -1), p, true);
    }
  }
  private clearFieldPath(from: Vector, to: Vector) {
    return !this.world.castShape(from, { x: 0, y: 0, z: 0, w: 1 }, sub(to, from), new RAPIER.Ball(0.055), 0, 1, true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, this.chassis.body,
      c => this.fieldElements.has(c.handle) && this.fieldElements.get(c.handle) !== 'floor');
  }
  private eject(f: Fuel, spilling: boolean) {
    const body = this.chassis.body, q = body.rotation();
    const lanes = [this.storageSlots[f.slot].z, -0.2286, -0.0762, 0.0762, 0.2286];
    for (const z of lanes) {
      const local = v3(this.pickup.ejectX, -0.115, z);
      const position = this.toWorld(local);
      if (!this.clearFieldPath(this.toWorld(v3(this.pickup.mouthX, -0.10, z)), position)) continue;
      let blocked = false;
      this.world.intersectionsWithShape(position, q, new RAPIER.Ball(FUEL_RADIUS + 0.003), () => { blocked = true; return false; },
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
      if (blocked) continue;
      const relative = rotate(spilling ? v3(-0.3, 0.25, z) : v3(-2.2, 0.35, 0), q);
      const velocity = add(body.velocityAtPoint(position), relative);
      if (!this.fuel.release(f, position, velocity)) return false;
      this.updatePayload(); body.applyImpulseAtPoint(scale(relative, -FUEL_MASS), position, true);
      return true;
    }
    this.outletBlocked = true;
    return false;
  }
  private updatePayload() {
    const points = this.held.map(f => f.local);
    const signature = points.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`).join(';');
    if (signature === this.payloadSignature) return;
    this.payloadSignature = signature; this.chassis.setPayload(points, FUEL_MASS, FUEL_RADIUS);
  }
  toWorld(local: Vector) { return add(this.chassis.body.translation(), rotate(local, this.chassis.body.rotation())); }
  renderPosition(fuel: Fuel) {
    if (fuel.owner !== this.owner) return this.fuel.renderPosition(fuel);
    return add(this.chassis.body.translation(), rotate(fuel.local, this.chassis.renderRotation));
  }
  get telemetry(): MechanismTelemetry {
    const held = this.held, counts = this.fuel.counts;
    const mode = this.inspectionPose ? 'Pose preview' : this.overturnedFor > 0.25 ? 'Spilling' : this.outletBlocked ? 'Outlet blocked'
      : this.input.reverse ? 'Reversing' : !this.deployed ? 'Deploying' : this.mechanism.compress && this.input.shoot && this.chassis.pose.intake > cargoExtension(held.length, this.capacity) + 0.01 ? 'Compressing'
      : this.input.intake ? this.chassis.pose.intake < 0.92 ? 'Deploying' : held.length === this.capacity ? 'Full' : 'Intaking' : held.length ? 'Holding' : this.chassis.pose.intake > 0.92 ? 'Deployed' : 'Stowed';
    const wantsIn = (this.mechanism.compress && !!this.input.shoot) || (!!(this.chassis.definition.intake.stowTravel || this.chassis.definition.intake.manualRetraction) && !this.intakeOut && !this.input.intake && !this.input.reverse);
    const intakeStatus = wantsIn && this.intakeTarget > .02 && Math.abs(this.chassis.pose.intake - this.intakeTarget) < .02 ? 'Cargo limited'
      : this.chassis.pose.intake < .02 ? 'Retracted' : this.chassis.pose.intake > .98 ? 'Extended' : this.intakeTarget > this.chassis.pose.intake ? 'Extending' : 'Retracting';
    return { intakeStatus, climb: this.climber.telemetry, count: held.length, capacity: this.capacity, transferring: counts.transferring, stored: counts.stored, loose: counts.loose,
      mode, mass: this.chassis.totalMass, intake: this.chassis.pose.intake, hopper: this.chassis.pose.hopper, hood: this.chassis.pose.hood, preview: !!this.inspectionPose,
      feeding: counts.feeding, airborne: counts.airborne, shooter: this.shooter.telemetry };
  }
}
