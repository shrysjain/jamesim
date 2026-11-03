import type { RobotDefinition } from './types';

/** Authoring/CI validation, deliberately outside the per-tick simulation. */
export function validateRobotDefinition(d: RobotDefinition): string[] {
  const errors: string[] = [];
  const check = (valid: boolean, message: string) => { if (!valid) errors.push(message); };
  const positive = (n: number) => Number.isFinite(n) && n > 0;
  const vector = (v: number[]) => v.length === 3 && v.every(Number.isFinite);
  check(/^[1-9]\d*$/.test(d.teamNumber) && d.id.startsWith(`${d.teamNumber}-`) && /^\d+-[a-z0-9-]+$/.test(d.id), 'ID must start with the team number and use a stable lowercase slug.');
  check(!!d.name && !!d.summary && d.model === `/assets/robots/${d.id}/robot.glb`, 'Name and prepared model path are required.');
  check([d.mass, d.length, d.width, d.wheelRadius, d.springLength, d.travel, ...d.inertia].every(positive), 'Dimensions, empty mass and inertia must be finite and positive.');
  check([d.mountY, d.bumperCenterY].every(Number.isFinite), 'Suspension/bumper offsets must be finite.');
  if (d.drive) check(Object.values(d.drive).every(positive), 'Drive tuning must be positive.');
  check(d.modules.length === 4 && new Set(d.modules.map(m => m.name)).size === 4 && d.modules.every(m => !!m.name && [m.x, m.z].every(Number.isFinite)), 'Four uniquely named swerve modules are required.');
  const m = d.mechanisms;
  check(Number.isInteger(m.capacity) && m.capacity > 0 && [m.intakeRate, m.fireRate].every(positive), 'Capacity and mechanism rates must be positive.');
  check(m.lanes.length > 0 && new Set(m.lanes).size === m.lanes.length && m.lanes.every(Number.isFinite), 'At least one unique, finite shooter lane is required.');
  check(d.cargoSlots.length === m.capacity && d.cargoSlots.every(vector), 'Provide one finite cargo seed per capacity slot.');
  check(d.hopper.fixedSlot === undefined || Number.isInteger(d.hopper.fixedSlot) && d.hopper.fixedSlot >= 0 && d.hopper.fixedSlot < m.capacity, 'Fixed cargo slot is outside capacity.');
  if (d.hopper.volume?.rim) check(Object.values(d.hopper.volume.rim).every(y => Number.isFinite(y) && y > d.hopper.volume!.floorY), 'Open hopper wall tops must be finite and above its floor.');
  check(!d.hopper.entry || vector(d.hopper.entry), 'Hopper entry must be a finite local position.');
  if (d.hopper.entryHalfWidth !== undefined) check(!!d.hopper.entry && positive(d.hopper.entryHalfWidth), 'A wide hopper entry requires a finite entry and positive half-width.');
  check(!d.hopper.obstacles || d.hopper.obstacles.every(b => vector(b.center) && b.halfExtents.length === 3 && b.halfExtents.every(positive) && (b.angle === undefined || Number.isFinite(b.angle))), 'Hopper obstacles require finite centers/angles and positive extents.');
  if (d.hopper.indexer) check(vector(d.hopper.indexer.center) && positive(d.hopper.indexer.radius) && positive(d.hopper.indexer.friction) && Number.isFinite(d.hopper.indexer.angularSpeed) && d.hopper.indexer.angularSpeed !== 0, 'Indexer requires a finite center, nonzero angular speed and positive radius/friction.');
  if (d.hopper.autoLift) check(!!d.climb && (d.hopper.volume?.ceilingTravel ?? 0) > 0 && Number.isInteger(d.hopper.autoLift.loweredCapacity) && d.hopper.autoLift.loweredCapacity > 0 && d.hopper.autoLift.loweredCapacity < m.capacity,
    'Automatic hopper lift requires the real vertical stage and a valid lowered capacity.');
  check(vector(d.intake.pivot) && vector(d.hood.pivot) && Number.isFinite(d.intake.stowedAngle) && Number.isFinite(d.hood.maxAngle), 'Mechanism transforms must be finite.');
  check(d.colliders.length > 0 && d.colliders.every(c => ['chassis', 'intake', 'opposedIntake', 'hopper', 'hood', 'climber'].includes(c.part) && vector(c.center) && c.halfExtents.every(positive) && (c.radius === undefined || Number.isFinite(c.radius) && c.radius >= 0)), 'Collider envelopes must be finite with positive extents.');
  const pickupValid = (p: typeof d.pickup) => [p.minX,p.maxX,p.halfWidth,p.mouthX,p.ejectX].every(Number.isFinite) && p.minX < p.maxX && positive(p.halfWidth);
  check(pickupValid(d.pickup), 'Pickup bounds must be finite and ordered.');
  if (d.intake.opposed || d.pickup.opposed || d.visual.poseNodes.opposedIntake || d.colliders.some(c => c.part === 'opposedIntake')) check(!!d.intake.opposed && vector(d.intake.opposed.pivot) && positive(d.intake.opposed.stowTravel) && Number.isFinite(d.intake.opposed.stowRise ?? 0) && !!d.pickup.opposed && pickupValid(d.pickup.opposed) && d.pickup.opposed.minX > 0 && d.pickup.opposed.mouthX > 0 && d.pickup.opposed.ejectX > 0 && !!d.visual.poseNodes.opposedIntake, 'An opposed intake requires matching transform, pickup and visual bindings.');
  if (d.hopper.volume?.backTravel !== undefined) check(Number.isFinite(d.hopper.volume.backTravel) && d.hopper.volume.backTravel >= 0 && !!d.intake.opposed, 'Rear hopper travel requires an opposed intake.');
  const geometry = d.shooterGeometry;
  check(vector(geometry.pivot) && [geometry.drumRadius, geometry.guideLength, geometry.turretRadiansPerSecond].every(positive), 'Shooter geometry must be finite and positive.');
  check(!m.turret || !!geometry.turretPivot && vector(geometry.turretPivot), 'A turret requires its bearing pivot.');
  if (geometry.turretLimits) check(m.turret && geometry.turretLimits.length === 2 && geometry.turretLimits.every(Number.isFinite) && geometry.turretLimits[0] <= 0 && geometry.turretLimits[1] >= 0 && geometry.turretLimits[0] < geometry.turretLimits[1], 'Turret travel must contain neutral and have ordered finite stops.');
  if (geometry.movingLimits) check(m.movingShots && [geometry.movingLimits.hub, geometry.movingLimits.pass].every(l => [l.speed, l.turnRate].every(positive)), 'Moving-shot limits require moving shots and positive speed/turn bounds.');
  check(!geometry.feedPath || geometry.feedPath.every(vector), 'Feed path points must be finite.');
  check(!geometry.feedAcrossLanes || !m.turret && !!geometry.feedPath?.length, 'Full-width feeding requires a chassis-mounted shooter and feed path.');
  if (geometry.laneJitter !== undefined) check(Number.isFinite(geometry.laneJitter) && geometry.laneJitter >= 0 && !!geometry.feedAcrossLanes, 'Lane variation requires full-width feeding and a finite nonnegative half-width.');
  check(geometry.yawOffset === undefined || Number.isFinite(geometry.yawOffset), 'Shooter yaw offset must be finite.');
  check(geometry.fixedElevation === undefined || Number.isFinite(geometry.fixedElevation) && geometry.fixedElevation > 0 && geometry.fixedElevation < Math.PI / 2, 'Fixed release elevation must lie above horizontal and below vertical.');
  if (geometry.spread) check(Object.values(geometry.spread).every(v => Number.isFinite(v) && v >= 0) && geometry.spread.flyerChance <= 1 && geometry.spread.speed < 1, 'Shot spread must be finite and nonnegative with valid probability and fractional speed.');
  check(m.climb === !!d.climb, 'Climb capability and physics profile must agree.');
  if (d.climb) check(d.climb.kind === 'side-hook-l1' && [d.climb.maxLift, d.climb.rate, d.climb.travel, d.climb.deploySeconds].every(positive) && vector(d.climb.hook), 'Unsupported or invalid climber profile.');
  if (d.climb) {
    check(d.climb.approachAxis === undefined || ['x', 'z'].includes(d.climb.approachAxis), 'Invalid climber approach axis.');
    check(d.climb.hookOffsetsZ === undefined || d.climb.hookOffsetsZ.length > 0 && d.climb.hookOffsetsZ.every(Number.isFinite), 'Hook offsets must be finite and nonempty.');
  }
  if (d.hopper.volume?.ceilingTravel !== undefined) check(!!d.climb && positive(d.hopper.volume.ceilingTravel) && d.hopper.volume.ceilingTravel === d.climb.travel, 'Moving hopper roof must match its climber stage.');
  if (d.hopper.intakeCurve) check(d.hopper.intakeCurve.length >= 2 && d.hopper.intakeCurve[0] === 0 && d.hopper.intakeCurve.at(-1) === 1 && d.hopper.intakeCurve.every((v,i,a) => Number.isFinite(v) && v >= 0 && v <= 1 && (i === 0 || v >= a[i-1])), 'Hopper linkage samples must run monotonically from zero to one.');
  const v = d.visual, names = v.requiredNodes;
  check(names.includes('chassis') && new Set(names).size === names.length, 'Declare unique required mechanism nodes, including chassis.');
  const bindings = [...Object.values(v.poseNodes), v.turret, v.turretHood, v.kicker?.node, v.climber].filter((n): n is string => !!n);
  check(bindings.every(n => names.includes(n)), 'Every bound assembly must be declared required.');
  check(!m.turret || !!v.turret && !!v.turretHood, 'Turret capability requires turret/hood visual bindings.');
  check(!d.climb || !!v.climber, 'Climb capability requires a visual binding.');
  check(!d.intake.passiveKicker || !!v.kicker, 'Passive kicker requires a visual binding.');
  check(!v.spin.some(b => b.source === 'indexer') || !!d.hopper.indexer, 'Indexer animation requires a physical indexer definition.');
  check(v.spin.every(b => !!b.node !== !!b.prefix && Number.isFinite(b.factor) && ['intake', 'feeder', 'shooter', 'indexer'].includes(b.source)), 'Spin bindings require exactly one node or prefix and a finite factor.');
  check(!!v.bumperMaterial && positive(v.previewHeight) && v.numberSize.length === 2 && v.numberSize.every(positive) && positive(v.numberOffset), 'Visual placement/material metadata is incomplete.');
  // Keep definitions serializable: deterministic numbers/data, no browser or mutable instance state.
  const walk = (value: unknown): boolean => typeof value === 'number' ? Number.isFinite(value) : value === null || ['string', 'boolean', 'undefined'].includes(typeof value) ? true : typeof value === 'object' && Object.values(value).every(walk);
  check(walk(d), 'Definitions must contain finite, serializable data only.');
  if (geometry.passLandingExtra !== undefined) check(Number.isFinite(geometry.passLandingExtra) && geometry.passLandingExtra >= 0, 'Pass landing inset must be finite and nonnegative.');
  return errors;
}
