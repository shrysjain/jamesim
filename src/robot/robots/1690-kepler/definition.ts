import type { RobotDefinition, RobotCollider } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { KEPLER_VISUAL } from './visual';
import { packedCargo } from '../../cargoPacking';
const volume = { frontX: -.617, backX: .3175, halfWidth: .358, floorY: -.085, ceilingY: .328, frontTravel: .312, floorSlope: -.08 };

/** Team release CAD; dimensions/frames measured from the closed/open exports.
 * Gameplay performance follows the user-supplied FRSim card; CAD mass remains estimated (docs/KEPLER.md). */
export const KEPLER: RobotDefinition = {
  ...STANDARD_SWERVE, id: '1690-kepler', teamNumber: '1690', visual: KEPLER_VISUAL, name: '1690 Orbit · Kepler', model: '/assets/robots/1690-kepler/robot.glb',
  mass: 54, inertia: [3.0, 5.6, 3.2], length: .7874, width: .889,
  springLength: .1122,
  drive: { maxSpeed: 14.4 * .3048, acceleration: 33 * .3048, grip: 130 * 4.4482216152605 / (54 * 9.81) },
  modules: swerveModules(.2505, .3013),
  intake: { pivot: [0, 0, 0], stowedAngle: 0, stowTravel: .312, stowRise: .0691, manualRetraction: true, passiveKicker: true },
  hopper: { stowTravel: 0, volume }, hood: { pivot: [.204, .241, .1872], maxAngle: (82.47 - 35) * Math.PI / 180 },
  shooterGeometry: { pivot: [.204, .241, .1872], turretPivot: [.134, -.223, .1872], drumRadius: .0502, guideLength: .155, turretRadiansPerSecond: 4, minElevation: 35 * Math.PI / 180, maxElevation: 82.47 * Math.PI / 180, passRange: 32 * .3048, movingAccuracy: .95, spread: { yaw: .022, elevation: .024, speed: .026, flyerChance: .05, backspin: 26 }, feedPath: [[.06, -.005, 0], [.134, .005, .14], [.134, .16, .1872]] },
  climb: { kind: 'side-hook-l1', maxLift: .212, rate: .30, deploySeconds: .55, travel: .30, hook: [.2675, .251, -.02155] },
  summary: 'Turret · moving shots · L1 climb',
  mechanisms: { capacity: 60, intakeRate: 40, compress: true, lanes: [0], fireRate: 13, feedSeconds: .25, turret: true, movingShots: true, simultaneousIntake: true, climb: true },
  cargoSlots: packedCargo(volume, [1, 0, .036, 0]).slice(0, 60).sort((a, b) => b[0] - a[0]),
  pickup: { minX: -.71, maxX: -.45, halfWidth: .30, mouthX: -.56, ejectX: -.72 },
  colliders: [
    ...[-1, 1].flatMap((sign): RobotCollider[] => [
      { part: 'chassis', center: [sign * .3556, -.12616, 0], halfExtents: [.0381, .05715, .4445], radius: .008 },
      { part: 'chassis', center: [0, -.12616, sign * .4064], halfExtents: [.3175, .05715, .0381], radius: .008 },
      { part: 'chassis', center: [0, .075, sign * .365], halfExtents: [.317, .24, .004] },
      { part: 'intake', center: [-.32, .09, sign * .355], halfExtents: [.29, .17, .006] },
    ]),
    { part: 'chassis', center: [0, -.182, 0], halfExtents: [.31, .003, .36], radius: .006 },
    { part: 'intake', center: [-.5593, -.062, 0], halfExtents: [.021, .021, .3235], radius: .004 },
  ],
};
