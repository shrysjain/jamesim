// Copy this folder to src/robot/robots/<team>-<name>/, then replace every TODO.
// Deliberate NaNs fail validation if an unfinished definition is registered.
import type { RobotDefinition } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { VISUAL } from './visual';

export const ROBOT = {
  ...STANDARD_SWERVE, // verify/override every suspension default against this robot
  id: '0000-replace-me', teamNumber: '0000', name: 'TODO', summary: 'TODO: supported mechanisms',
  model: '/assets/robots/0000-replace-me/robot.glb', visual: VISUAL,
  mass: NaN, inertia: [NaN, NaN, NaN], length: NaN, width: NaN,
  drive: { maxSpeed: NaN, acceleration: NaN, grip: NaN },
  modules: swerveModules(NaN, NaN),
  intake: { pivot: [NaN, NaN, NaN], stowedAngle: NaN },
  hopper: { stowTravel: NaN, volume: { frontX: NaN, backX: NaN, halfWidth: NaN, floorY: NaN, ceilingY: NaN, frontTravel: NaN } },
  hood: { pivot: [NaN, NaN, NaN], maxAngle: NaN },
  colliders: [], cargoSlots: [],
  pickup: { minX: NaN, maxX: NaN, halfWidth: NaN, mouthX: NaN, ejectX: NaN },
  shooterGeometry: { pivot: [NaN, NaN, NaN], drumRadius: NaN, guideLength: NaN, turretRadiansPerSecond: NaN },
  mechanisms: { capacity: NaN, intakeRate: NaN, compress: true, lanes: [], fireRate: NaN, turret: false, movingShots: false, climb: false },
} satisfies RobotDefinition;
