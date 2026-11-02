import type { RobotDefinition, RobotCollider } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { INFRARED_VISUAL } from './visual';
import { INFRARED_CARGO } from './cargo';

/** 2026 Final Machine. CAD and team-code measurements versus tuning estimates: README.md. */
export const INFRARED: RobotDefinition = {
  ...STANDARD_SWERVE,
  id: '3847-infrared', teamNumber: '3847', name: '3847 Spectrum · Infrared FM',
  model: '/assets/robots/3847-infrared/robot.glb', visual: INFRARED_VISUAL,
  summary: 'Final Machine · sliding intake · adjustable hood',
  mass: 58, inertia: [3.3, 6.0, 3.7], length: .83089, width: .8395,
  drive: { maxSpeed: 5.12, acceleration: 10, grip: 1.05 },
  modules: swerveModules(.276225, .276225),
  intake: { pivot: [0, 0, 0], stowedAngle: 0, stowTravel: .3048, manualRetraction: true },
  hopper: { stowTravel: 0, volume: { frontX: -.6403, backX: .053, halfWidth: .307, floorY: -.10, ceilingY: .337, frontTravel: .3048, floorSlope: -.18 } },
  hood: { pivot: [.2794, .4886198 - .223, 0], maxAngle: (81 - 40.68) * Math.PI / 180 },
  shooterGeometry: {
    pivot: [.2723, .4888 - .223, 0], drumRadius: .0389, guideLength: .17, turretRadiansPerSecond: 3,
    minElevation: 40.68 * Math.PI / 180, maxElevation: 81 * Math.PI / 180,
    feedAcrossLanes: true, laneJitter: .20 / 3,
    movingAccuracy: .87, passRange: 9, passLandingExtra: .8,
    spread: { yaw: .035, elevation: .034, speed: .035, flyerChance: .10, backspin: 30 },
    // Along the bed, then on the hopper-facing side of the vertical rollers.
    feedPath: [[-.04, -.02, 0], [-.025, .2847 - .223, 0], [-.025, .3997 - .223, 0], [.08, .47 - .223, 0]],
  },
  mechanisms: { capacity: INFRARED_CARGO.length, intakeRate: 35, compress: true, lanes: [-.40 / 3, 0, .40 / 3], fireRate: 15, feedSeconds: .28, turret: false, movingShots: true, simultaneousIntake: true, climb: false },
  cargoSlots: INFRARED_CARGO,
  pickup: { minX: -.74, maxX: -.46, halfWidth: .29, mouthX: -.61, ejectX: -.75 },
  colliders: [
    ...[-1, 1].flatMap((sign): RobotCollider[] => [
      { part: 'chassis', center: [sign * .377345, -.12616, 0], halfExtents: [.0381, .0595, .41975], radius: .008 },
      { part: 'chassis', center: [0, -.12616, sign * .38165], halfExtents: [.33925, .0595, .0381], radius: .008 },
      { part: 'chassis', center: [-.15, .13, sign * .3124], halfExtents: [.19, .18, .0025] },
      { part: 'chassis', center: [.1898, .066, sign * .315], halfExtents: [.158, .244, .0025] },
      { part: 'intake', center: [-.42, .10, sign * .338], halfExtents: [.23, .17, .004] },
    ]),
    { part: 'chassis', center: [0, -.182, 0], halfExtents: [.34, .003, .34], radius: .006 },
    { part: 'intake', center: [-.6454, .0375, 0], halfExtents: [.003, .067, .3378] },
    { part: 'intake', center: [-.61075, -.0295, 0], halfExtents: [.0254, .0254, .2972], radius: .004 },
  ],
};
