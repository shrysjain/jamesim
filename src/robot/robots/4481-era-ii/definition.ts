// Performance evidence, estimate ranges and retained CAD limits: docs/ROBOT_PERFORMANCE_RESEARCH.md.
import type { RobotDefinition, RobotCollider } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { ERA_II_VISUAL } from './visual';
import { ERA_CARGO, ERA_HOPPER } from './cargo';
import { ERA_INTAKE_PANELS } from './intakeContacts';
const DEG = Math.PI/180;
/** Owner-supplied Worlds CAD + pinned official 2026 code. Rates, mass/inertia,
 * capacity, scatter and SI launch-angle mapping are estimates: see README. */
export const ERA_II: RobotDefinition = {
  ...STANDARD_SWERVE,
  id: '4481-era-ii', teamNumber: '4481', name: '4481 Rembrandts · Era II',
  summary: '370° turret · adjustable hood · rotating indexer',
  model: '/assets/robots/4481-era-ii/robot.glb', visual: ERA_II_VISUAL,
  mass: 59, inertia: [3.4,6.2,3.7], length: .8524, width: .8524,
  springLength: .1122, bumperCenterY: -.10275,
  drive: { maxSpeed: 5.8, acceleration: 9.4, brakeAcceleration: 18.8, grip: 1.05 },
  modules: swerveModules(.27332,.27332),
  // The source carriage deploys passively. Owner-requested gameplay compression
  // retracts it as shooting empties the hopper; the separate lower kicker stays down.
  // Travel is an estimate fitted along the measured inclined slide direction.
  intake: { pivot: [0,0,0], stowedAngle: 0, stowTravel: .26, stowRise: .095, manualRetraction: false, passiveKicker: true },
  hopper: ERA_HOPPER,
  hood: { pivot: [.2425,.25535,-.15], maxAngle: 26*DEG },
  shooterGeometry: {
    pivot: [.2425,.25535,-.15], turretPivot: [.15,.17315,-.15],
    drumRadius: .040, guideLength: .09, turretRadiansPerSecond: 5,
    turretLimits: [-182.8*DEG,182.8*DEG],
    trenchSafety: { retractSeconds: .15, radius: .15 },
    minElevation: 49*DEG, maxElevation: 75*DEG, passRange: 10,
    movingAccuracy: .80, movingLimits: { hub: { speed: 1.7, turnRate: 1 }, pass: { speed: 3, turnRate: 3 } },
    spread: { yaw: .028, elevation: .032, speed: .032, flyerChance: .08, backspin: 28 },
    feedPath: [[-.038,-.015,0],[.06,.04,-.15],[.15,.115,-.15],[.15,.18,-.15]],
  },
  mechanisms: { capacity: ERA_CARGO.length, intakeRate: 38, compress: true,
    lanes: [0], fireRate: 12, feedSeconds: .28, turret: true, movingShots: true,
    simultaneousIntake: true, climb: false },
  cargoSlots: ERA_CARGO,
  pickup: { minX: -.72, maxX: -.52, halfWidth: .29, mouthX: -.614, ejectX: -.73 },
  colliders: [
    ...[-1,1].flatMap((sign): RobotCollider[] => [
      { part: 'chassis', center: [sign*.38565,-.10275,0], halfExtents: [.04055,.05715,.4262], radius: .008 },
      { part: 'chassis', center: [0,-.10275,sign*.38565], halfExtents: [.3451,.05715,.04055], radius: .008 },
      { part: 'chassis', center: [0,.115,sign*.348], halfExtents: [.348,.2125,.002] },
    ]),
    { part: 'chassis', center: [0,-.1546,0], halfExtents: [.335,.002,.335] },
    { part: 'chassis', center: [.348,.115,0], halfExtents: [.002,.2125,.348] },
    { part: 'chassis', center: [.15,.065,-.15], halfExtents: [.16,.138,.094] },
    { part: 'intake', center: [-.614,-.063,0], halfExtents: [.025,.025,.29], radius: .003 },
    { part: 'intake', center: [-.5718,.0276,0], halfExtents: [.025,.025,.29], radius: .003 },
    ...ERA_INTAKE_PANELS,
  ],
};
