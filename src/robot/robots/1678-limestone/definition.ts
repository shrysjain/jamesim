import type { Vec3 } from '../../../field/types';
import type { RobotDefinition, RobotCollider } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { LIMESTONE_VISUAL } from './visual';

/** 1678-26c release CAD. Team code verifies wheelbase, speed and actuator travels.
 * Empty mass/inertia, collection/fire rates, capacity and launch-angle fit are gameplay estimates;
 * see README.md. Intake −X, fixed three-wide shooter +X. */
export const LIMESTONE: RobotDefinition = {
  ...STANDARD_SWERVE,
  id: '1678-limestone', teamNumber: '1678', name: '1678 Citrus Circuits · Limestone',
  summary: 'Three-wide shooter · expanding hopper · L1 climb',
  model: '/assets/robots/1678-limestone/robot.glb', visual: LIMESTONE_VISUAL,
  mass: 55, inertia: [2.9, 5.5, 3.0], length: .8509, width: .8509,
  drive: { maxSpeed: 4.39, acceleration: 10, grip: 1.05 },
  modules: swerveModules(.276225, .276225),
  intake: { pivot: [-.30465, -.0541, 0], stowedAngle: -132 * Math.PI / 180, manualRetraction: true },
  hopper: { stowTravel: .303211, coupledToIntake: true, volume: {
    frontX: -.644, backX: .225, halfWidth: .310, floorY: -.089, floorSlope: -.25,
    ceilingY: .317, ceilingTravel: .2159, frontTravel: .303211,
  } },
  hood: { pivot: [.28815, .25385, 0], maxAngle: 35 * Math.PI / 180 },
  shooterGeometry: {
    pivot: [.28815, .25385, 0], drumRadius: .0455, guideLength: .155, turretRadiansPerSecond: 3,
    minElevation: 37.5 * Math.PI / 180, maxElevation: 72.5 * Math.PI / 180,
    movingAccuracy: .90,
  },
  climb: { kind: 'side-hook-l1', approachAxis: 'x', hookOffsetsZ: [-.33, .33],
    hook: [.075, .303, 0], travel: .2159, maxLift: .159, rate: .20, deploySeconds: .55 },
  mechanisms: { capacity: 32, intakeRate: 36, compress: true, lanes: [-.17, 0, .17], fireRate: 24,
    turret: false, movingShots: true, simultaneousIntake: true, climb: true },
  // Two layers fit under the lowered lid. Seeds are entry positions, never a pinned visual stack.
  cargoSlots: Array.from({ length: 32 }, (_, i): Vec3 => {
    const layer = Math.floor(i / 16), row = Math.floor(i % 16 / 4), column = i % 4;
    const x = -.398 + row * .151 + (column % 2) * .0755;
    return [x, -.089 - .25 * x + .080 + layer * .1511, (column - 1.5) * .151];
  }).sort((a,b) => a[0]-b[0]),
  pickup: { minX: -.665, maxX: -.48, halfWidth: .30, mouthX: -.56, ejectX: -.685 },
  colliders: [
    ...[-1,1].flatMap((sign): RobotCollider[] => [
      { part: 'chassis', center: [sign * .384175, -.12616, 0], halfExtents: [.041275, .05715, .42545], radius: .008 },
      { part: 'chassis', center: [0, -.12616, sign * .384175], halfExtents: [.3429, .05715, .041275], radius: .008 },
      { part: 'chassis', center: [.01, .095, sign * .321], halfExtents: [.321, .22, .004] },
      { part: 'hopper', center: [-.312, .12, sign * .344], halfExtents: [.331, .16, .003] },
      { part: 'intake', center: [-.46, -.025, sign * .333], halfExtents: [.16, .06, .006], radius: .004 },
      { part: 'climber', center: [-.025, .11, sign * .330], halfExtents: [.026, .205, .013] },
    ]),
    { part: 'chassis', center: [0, -.182, 0], halfExtents: [.33, .003, .33], radius: .006 },
    { part: 'hopper', center: [-.643, .135, 0], halfExtents: [.003, .15, .337] },
    { part: 'intake', center: [-.561, -.066, 0], halfExtents: [.0254, .0254, .310], radius: .004 },
    { part: 'climber', center: [-.15, .322, 0], halfExtents: [.19, .003, .33] },
  ],
};
