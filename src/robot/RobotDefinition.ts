import type { Vec3 } from '../field/types';

export type RobotPart = 'chassis' | 'intake' | 'hopper' | 'hood';
export type RobotCollider = { part: RobotPart; center: Vec3; halfExtents: Vec3; radius?: number };
export type RobotPose = { intake: number; hopper: number; hood: number };
export type HopperVolume = {
  frontX: number; backX: number; halfWidth: number; floorY: number; ceilingY: number;
  frontTravel: number; floorSlope?: number; slopedFront?: boolean;
};
export type RobotDefinition = {
  id: string; name: string; model: string;
  mass: number; inertia: Vec3; length: number; width: number;
  wheelRadius: number; mountY: number; springLength: number; travel: number; bumperCenterY: number;
  drive?: { maxSpeed: number; acceleration: number; grip: number };
  modules: { name: string; x: number; z: number }[];
  intake: { pivot: Vec3; stowedAngle: number; stowTravel?: number; stowRise?: number; manualRetraction?: boolean; passiveKicker?: boolean };
  hopper: { stowTravel: number; volume?: HopperVolume; fixedSlot?: number };
  hood: { pivot: Vec3; maxAngle: number };
  colliders: RobotCollider[];
  climb?: { maxLift: number; rate: number; deploySeconds: number; travel: number; hook: Vec3 };
  cargoSlots?: Vec3[];
  pickup?: { minX: number; maxX: number; halfWidth: number; mouthX: number; ejectX: number };
  shooterGeometry?: { pivot: Vec3; drumRadius: number; guideLength: number; turretRadiansPerSecond: number; turretPivot?: Vec3; minElevation?: number; maxElevation?: number; passRange?: number; movingAccuracy?: number; feedPath?: Vec3[] };
  mechanisms: { capacity: number; intakeRate: number; compress: boolean; lanes: number[]; fireRate: number; feedSeconds?: number; turret: boolean; movingShots: boolean; simultaneousIntake?: boolean; climb: boolean };
};

/** CAD dimensions in meters; empty mass/inertia remain estimates.
 * +X is the shooter end; the intake is at −X. Source (X,Y,Z) → (Y,Z−.21665,X).
 */
export const REBLITZ: RobotDefinition = {
  id: '2910-reblitz', name: '2910 Re•Blitz', model: '/assets/robots/2910-reblitz/robot.glb',
  mechanisms: { capacity: 55, intakeRate: 50, compress: true, lanes: [-0.2286, -0.0762, 0.0762, 0.2286], fireRate: 32, turret: false, movingShots: false, climb: false },
  mass: 56, inertia: [3.1, 6.2, 3.5], length: 0.8509, width: 0.85725,
  wheelRadius: 0.0508, mountY: -0.06, springLength: 0.12, travel: 0.08, bumperCenterY: -0.12616,
  modules: [
    { name: 'module-front-left', x: 0.282575, z: -0.276225 },
    { name: 'module-front-right', x: 0.282575, z: 0.276225 },
    { name: 'module-rear-left', x: -0.282575, z: -0.276225 },
    { name: 'module-rear-right', x: -0.282575, z: 0.276225 },
  ],
  intake: { pivot: [-0.27305, -0.0467875, 0], stowedAngle: -114 * Math.PI / 180 },
  hopper: { stowTravel: 0.29845, fixedSlot: 54, volume: { frontX: -.63897, backX: .30, halfWidth: .34845, floorY: -.10, ceilingY: .327, frontTravel: .29845, slopedFront: true } }, // measured between collecting and starting CAD configurations
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

export const COLLECTING_POSE: RobotPose = { intake: 1, hopper: 1, hood: 0 };
export function partTransform(definition: RobotDefinition, part: RobotPart, pose: RobotPose) {
  const angle = part === 'intake' ? definition.intake.stowedAngle * (1 - pose.intake) : part === 'hood' ? -definition.hood.maxAngle * pose.hood : 0;
  const pivot = part === 'intake' ? definition.intake.pivot : part === 'hood' ? definition.hood.pivot : [0, 0, 0];
  const shift = part === 'hopper' ? definition.hopper.stowTravel * (1 - pose.hopper) : part === 'intake' ? (definition.intake.stowTravel ?? 0) * (1 - pose.intake) : 0;
  const rise = part === 'intake' ? (definition.intake.stowRise ?? 0) * (1 - pose.intake) : 0;
  return { angle, pivot, shift, rise };
}

export const STARTING_POSE: RobotPose = { intake: 0, hopper: 0, hood: 0 };

/** Team release CAD; dimensions/frames measured from the closed/open exports.
 * Gameplay performance follows the user-supplied FRSim card; CAD mass remains estimated (docs/KEPLER.md). */
export const KEPLER: RobotDefinition = {
  ...REBLITZ, id: '1690-kepler', name: '1690 Orbit · Kepler', model: '/assets/robots/1690-kepler/robot.glb',
  mass: 54, inertia: [3.0, 5.6, 3.2], length: .7874, width: .889,
  springLength: .1122,
  drive: { maxSpeed: 14.4 * .3048, acceleration: 33 * .3048, grip: 130 * 4.4482216152605 / (54 * 9.81) },
  modules: REBLITZ.modules.map(m => ({ ...m, x: Math.sign(m.x) * .2505, z: Math.sign(m.z) * .3013 })),
  intake: { pivot: [0, 0, 0], stowedAngle: 0, stowTravel: .312, stowRise: .0691, manualRetraction: true, passiveKicker: true },
  hopper: { stowTravel: 0, volume: { frontX: -.617, backX: .3175, halfWidth: .358, floorY: -.085, ceilingY: .328, frontTravel: .312, floorSlope: -.08 } }, hood: { pivot: [.204, .241, .1872], maxAngle: (82.47 - 35) * Math.PI / 180 },
  shooterGeometry: { pivot: [.204, .241, .1872], turretPivot: [.134, -.223, .1872], drumRadius: .0502, guideLength: .155, turretRadiansPerSecond: 4, minElevation: 35 * Math.PI / 180, maxElevation: 82.47 * Math.PI / 180, passRange: 32 * .3048, movingAccuracy: .95, feedPath: [[.06, -.005, 0], [.134, .005, .14], [.134, .16, .1872]] },
  climb: { maxLift: .212, rate: .30, deploySeconds: .55, travel: .30, hook: [.2675, .251, -.02155] },
  mechanisms: { capacity: 50, intakeRate: 40, compress: true, lanes: [0], fireRate: 13, feedSeconds: .25, turret: true, movingShots: true, simultaneousIntake: true, climb: true },
  cargoSlots: Array.from({ length: 50 }, (_, i): Vec3 => {
    const layer = Math.floor(i / 20), row = Math.floor(i % 20 / 5), column = i % 5;
    return [-.39 + row * .151 + (column % 2) * .0755 + (layer % 2) * .0755,
      -.022 + layer * .151 * Math.sqrt(2 / 3),
      (column - 2) * .151 * Math.sqrt(3) / 2 + ((layer % 2) - .5) * .151 * Math.sqrt(3) / 6];
  }).sort((a, b) => b[0] - a[0]),
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
export const ROBOTS = { '2910-reblitz': REBLITZ, '1690-kepler': KEPLER };
export type RobotId = keyof typeof ROBOTS;
