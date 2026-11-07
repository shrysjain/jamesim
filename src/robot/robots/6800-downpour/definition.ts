import type { Vec3 } from '../../../field/types';
import type { RobotDefinition, RobotCollider, HopperObstacle } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { DOWNPOUR_VISUAL } from './visual';

// Conservative cargo contacts around the actual moving tubes, crossbars and
// side plates. Field colliders alone do not contact owned hopper fuel.
export const DOWNPOUR_INTAKE_CONTACTS: HopperObstacle[] = [
  { part: 'intake', center: [-.59221, -.00476, 0], halfExtents: [.0264, .0264, .2915] },
  { part: 'intake', center: [-.61171, .05173, 0], halfExtents: [.0137, .0137, .3185] },
  { part: 'intake', center: [-.49177, -.14112, 0], halfExtents: [.0137, .0137, .3185] },
  { part: 'intake', center: [-.38435, -.01303, 0], halfExtents: [.0086, .0094, .3185] },
  { part: 'intake', center: [-.45255, -.08834, 0], halfExtents: [.0086, .0094, .3185] },
  ...[-1, 1].map((sign): HopperObstacle => ({ part: 'intake',
    center: [-.48503, -.03499, sign * .32065], halfExtents: [.1718, .1443, .0042] })),
];

/** Contributor's exact Downpour export: native(X,Y,Z)→(-Z,Y-.223,X).
 * CAD geometry and team packet identify a fixed four-wide drum. Performance is
 * estimated; packet volumes are not treated as a count of full-size fuel. */
export const DOWNPOUR: RobotDefinition = {
  ...STANDARD_SWERVE,
  id: '6800-downpour', teamNumber: '6800', name: '6800 Valor · Downpour',
  summary: 'Four-wide drum · pivoting intake · expanding hopper',
  model: '/assets/robots/6800-downpour/robot.glb', visual: DOWNPOUR_VISUAL,
  mass: 56, inertia: [3.2, 5.9, 3.6], length: .8432, width: .8432,
  // The export uses the same .223 m carpet reference as STANDARD_SWERVE.
  // Keep its standard numerical support length; the old override sank the
  // rigid CAD wheels and unloaded every tire when a tower foot caught a bumper.
  bumperCenterY: -.1341,
  modules: swerveModules(.2794, .2794),
  drive: { maxSpeed: 4.8, acceleration: 10, grip: 1.05 },
  intake: { pivot: [-.3032, -.03169, 0], stowedAngle: -110 * Math.PI / 180, manualRetraction: true },
  // The measured back-panel inner face is X=-.6405245; keep a 1mm contact margin.
  hopper: { stowTravel: .30, obstacles: DOWNPOUR_INTAKE_CONTACTS,
    volume: { frontX: -.6395, backX: .04, halfWidth: .337, floorY: -.015, ceilingY: .39, frontTravel: 0 } },
  hood: { pivot: [.26035, .25149, 0], maxAngle: 38 * Math.PI / 180 },
  shooterGeometry: {
    pivot: [.26035, .25149, 0], drumRadius: .0508, guideLength: .14,
    turretRadiansPerSecond: 4, minElevation: 40 * Math.PI / 180, maxElevation: 78 * Math.PI / 180,
    passRange: 10, movingAccuracy: .85, feedAcrossLanes: true,
    spread: { yaw: .032, elevation: .035, speed: .035, flyerChance: .10, backspin: 28 },
    // Centers clear the actual floor and run behind the three measured feeder shafts.
    feedPath: [[-.20, .065, 0], [.02, .065, 0], [.219, .071, 0], [.187, .14, 0], [.155, .208, 0]],
  },
  mechanisms: { capacity: 48, intakeRate: 42, compress: true, lanes: [-.2286, -.0762, .0762, .2286], fireRate: 25, feedSeconds: .30, turret: false, movingShots: false, simultaneousIntake: true, climb: false },
  cargoSlots: Array.from({ length: 48 }, (_, i): Vec3 => {
    const layer = Math.floor(i / 16), row = Math.floor(i % 16 / 4), column = i % 4;
    return [-.564 + row * .1507 + (layer % 2) * .07535, .061 + layer * Math.sqrt(.1507 ** 2 - .07535 ** 2 - .035 ** 2), (column - 1.5) * .151 + (layer % 2) * .035];
  }).sort((a, b) => b[0] - a[0]),
  pickup: { minX: -.72, maxX: -.46, halfWidth: .305, mouthX: -.53, ejectX: -.73 },
  colliders: [
    ...[-1, 1].flatMap((sign): RobotCollider[] => [
      { part: 'chassis', center: [sign * .393, -.1341, 0], halfExtents: [.0286, .05715, .4216], radius: .008 },
      { part: 'chassis', center: [0, -.1341, sign * .393], halfExtents: [.3644, .05715, .0286], radius: .008 },
      { part: 'chassis', center: [.00715, .1167, sign * .354], halfExtents: [.35, .1937, .0016] },
      { part: 'hopper', center: [-.40327, .16695, sign * .3418], halfExtents: [.23935, .14345, .0016] },
      { part: 'intake', center: [-.485, -.035, sign * .3206], halfExtents: [.17, .14, .0032], radius: .004 },
    ]),
    { part: 'chassis', center: [0, -.184, 0], halfExtents: [.317, .002, .317], radius: .004 },
    { part: 'hopper', center: [-.64132, .20695, 0], halfExtents: [.001, .10345, .3402] },
    { part: 'intake', center: [-.49177, -.14112, 0], halfExtents: [.0147, .0147, .3175], radius: .004 },
    { part: 'intake', center: [-.59221, -.00476, 0], halfExtents: [.0294, .0294, .29], radius: .004 },
    { part: 'hood', center: [.05589, .29516, 0], halfExtents: [.021, .021, .3032] },
  ],
};
