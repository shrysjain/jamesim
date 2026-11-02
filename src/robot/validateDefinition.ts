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
  if (d.hopper.autoLift) check(!!d.climb && (d.hopper.volume?.ceilingTravel ?? 0) > 0 && Number.isInteger(d.hopper.autoLift.loweredCapacity) && d.hopper.autoLift.loweredCapacity > 0 && d.hopper.autoLift.loweredCapacity < m.capacity,
    'Automatic hopper lift requires the real vertical stage and a valid lowered capacity.');
  if (d.hopper.volume?.rim) check(Object.values(d.hopper.volume.rim).every(y => Number.isFinite(y) && y > d.hopper.volume!.floorY), 'Open hopper wall tops must be finite and above its floor.');
  check(!d.hopper.entry || vector(d.hopper.entry), 'Hopper entry must be a finite local position.');
  check(vector(d.intake.pivot) && vector(d.hood.pivot) && Number.isFinite(d.intake.stowedAngle) && Number.isFinite(d.hood.maxAngle), 'Mechanism transforms must be finite.');
  check(d.colliders.length > 0 && d.colliders.every(c => ['chassis', 'intake', 'hopper', 'hood', 'climber'].includes(c.part) && vector(c.center) && c.halfExtents.every(positive) && (c.radius === undefined || Number.isFinite(c.radius) && c.radius >= 0)), 'Collider envelopes must be finite with positive extents.');
  check(Object.values(d.pickup).every(Number.isFinite) && d.pickup.minX < d.pickup.maxX && positive(d.pickup.halfWidth), 'Pickup bounds must be finite and ordered.');
  const geometry = d.shooterGeometry;
  check(vector(geometry.pivot) && [geometry.drumRadius, geometry.guideLength, geometry.turretRadiansPerSecond].every(positive), 'Shooter geometry must be finite and positive.');
  check(!m.turret || !!geometry.turretPivot && vector(geometry.turretPivot), 'A turret requires its bearing pivot.');
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
  check(v.spin.every(b => !!b.node !== !!b.prefix && Number.isFinite(b.factor) && ['intake', 'feeder', 'shooter'].includes(b.source)), 'Spin bindings require exactly one node or prefix and a finite factor.');
  check(!!v.bumperMaterial && positive(v.previewHeight) && v.numberSize.length === 2 && v.numberSize.every(positive) && positive(v.numberOffset), 'Visual placement/material metadata is incomplete.');
  // Keep definitions serializable: deterministic numbers/data, no browser or mutable instance state.
  const walk = (value: unknown): boolean => typeof value === 'number' ? Number.isFinite(value) : value === null || ['string', 'boolean', 'undefined'].includes(typeof value) ? true : typeof value === 'object' && Object.values(value).every(walk);
  check(walk(d), 'Definitions must contain finite, serializable data only.');
  return errors;
}
