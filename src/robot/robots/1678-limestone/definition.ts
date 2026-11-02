import type { RobotDefinition, RobotCollider } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { LIMESTONE_VISUAL } from './visual';
import { packedCargo } from '../../cargoPacking';
const volume = { frontX: -.644, backX: .225, halfWidth: .310, floorY: -.089, floorSlope: -.25,
  ceilingY: .317, ceilingTravel: .2159, frontTravel: .303211 };

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
  hopper: { stowTravel: .303211, coupledToIntake: true, autoLift: { loweredCapacity: 32 }, volume },
  hood: { pivot: [.28815, .25385, 0], maxAngle: 35 * Math.PI / 180 },
  shooterGeometry: {
    pivot: [.28815, .25385, 0], drumRadius: .0455, guideLength: .155, turretRadiansPerSecond: 3,
    minElevation: 37.5 * Math.PI / 180, maxElevation: 72.5 * Math.PI / 180,
    movingAccuracy: .90, spread: { yaw: .035, elevation: .038, speed: .040, flyerChance: .12, backspin: 36 },
  },
  climb: { kind: 'side-hook-l1', approachAxis: 'x', hookOffsetsZ: [-.33, .33],
    hook: [.075, .303, 0], travel: .2159, maxLift: .159, rate: .20, deploySeconds: .55 },
  mechanisms: { capacity: 70, intakeRate: 36, compress: true, lanes: [-.17, 0, .17], fireRate: 24,
    turret: false, movingShots: true, simultaneousIntake: true, climb: true },
  // Full-size seeds fit the raised juice press; partial loads occupy the lower layers first.
  cargoSlots: packedCargo({ ...volume, ceilingY: volume.ceilingY + volume.ceilingTravel }, [1, .025, .024, 0]).slice(0, 70),
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
