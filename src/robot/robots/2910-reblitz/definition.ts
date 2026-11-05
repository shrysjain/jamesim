// Performance evidence, estimate ranges and retained CAD limits: docs/ROBOT_PERFORMANCE_RESEARCH.md.
import type { RobotDefinition, RobotCollider } from '../../types';
import { STANDARD_SWERVE } from '../../defaults';
import { REBLITZ_VISUAL } from './visual';
import { REBLITZ_CARGO, REBLITZ_FEEDER_POCKET, REBLITZ_VOLUME } from './cargo';

/** CAD dimensions in meters; empty mass/inertia remain estimates.
 * +X is the shooter end; the intake is at −X. Source (X,Y,Z) → (Y,Z−.21665,X).
 */
export const REBLITZ: RobotDefinition = {
  id: '2910-reblitz', teamNumber: '2910', visual: REBLITZ_VISUAL, name: '2910 Re•Blitz', model: '/assets/robots/2910-reblitz/robot.glb',
  summary: 'Chassis aim · four shooting lanes',
  mechanisms: { capacity: REBLITZ_CARGO.length, intakeRate: 44, compress: true, lanes: [-0.2286, -0.0762, 0.0762, 0.2286], fireRate: 32, turret: false, movingShots: false, movingPasses: true, climb: false },
  ...STANDARD_SWERVE,
  cargoSlots: REBLITZ_CARGO,
  pickup: { minX: -.79, maxX: -.44, halfWidth: .29, mouthX: -.53, ejectX: -.755 },
  shooterGeometry: { pivot: [.282575, .25325, 0], drumRadius: .0508, guideLength: .155, turretRadiansPerSecond: 3,
    passRange: 33 * .3048, movingAccuracy: .20,
    movingLimits: { hub: { speed: .18, turnRate: .3 }, pass: { speed: 2, turnRate: .25 } },
    spread: { yaw: .026, elevation: .030, speed: .030, flyerChance: .08, backspin: 30 } },
  drive: { maxSpeed: 14.4 * .3048, acceleration: 9.5, grip: 1.10 },
  mass: 56, inertia: [3.1, 6.2, 3.5], length: 0.8509, width: 0.85725,
  modules: [
    { name: 'module-front-left', x: 0.282575, z: -0.276225 },
    { name: 'module-front-right', x: 0.282575, z: 0.276225 },
    { name: 'module-rear-left', x: -0.282575, z: -0.276225 },
    { name: 'module-rear-right', x: -0.282575, z: 0.276225 },
  ],
  intake: { pivot: [-0.27305, -0.0467875, 0], stowedAngle: -114 * Math.PI / 180 },
  hopper: { stowTravel: 0.29845, fixedSlot: REBLITZ_FEEDER_POCKET, volume: REBLITZ_VOLUME }, // measured between collecting and starting CAD configurations
  hood: { pivot: [0.282575, 0.25325, 0], maxAngle: 37 * Math.PI / 180 },
  colliders: [
    // Bumpers match the CAD envelope; contact surfaces use rounded edges.
    // Four rails and a smooth, low bellypan leave the upper ball paths open.
    ...[-1, 1].flatMap((sign): RobotCollider[] => [
      { part: 'chassis', center: [sign * 0.38735, -0.12616, 0], halfExtents: [0.0381, 0.05715, 0.428625], radius: 0.008 },
      { part: 'chassis', center: [0, -0.12616, sign * 0.390525], halfExtents: [0.34925, 0.05715, 0.0381], radius: 0.008 },
      { part: 'chassis', center: [0.035, 0.07, sign * 0.348], halfExtents: [0.315, 0.25, 0.006] },
      { part: 'hopper', center: [-0.29845, 0.15165, sign * 0.34965], halfExtents: [0.3429, 0.1778, 0.00119] },
      // Intake side plates: conservative convex envelopes, with an open center.
      { part: 'intake', center: [-0.48361, -0.08203, sign * 0.33774], halfExtents: [0.15298, 0.094, 0.00754], radius: 0.005 },
    ]),
    { part: 'chassis', center: [0, -0.18215, 0], halfExtents: [0.3429, 0.002, 0.33655], radius: 0.006 },
    { part: 'hopper', center: [-0.22915, 0.32826, 0], halfExtents: [0.2736, 0.00119, 0.34845] },
    { part: 'hopper', center: [-0.64016, 0.08235, 0], halfExtents: [0.00119, 0.1085, 0.34845] },
    { part: 'intake', center: [-0.61119, 0.001155, 0], halfExtents: [0.0254, 0.0254, 0.3302], radius: 0.004 },
    { part: 'hood', center: [0.08085, 0.244, 0], halfExtents: [0.022, 0.04, 0.311] },
  ],
};
