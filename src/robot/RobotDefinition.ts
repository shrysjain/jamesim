import type { Vec3 } from '../field/types';

export type RobotPart = 'chassis' | 'intake' | 'hopper' | 'hood';
export type RobotCollider = { part: RobotPart; center: Vec3; halfExtents: Vec3; radius?: number };
export type RobotPose = { intake: number; hopper: number; hood: number };
export type RobotDefinition = {
  id: string; name: string; model: string;
  mass: number; inertia: Vec3; length: number; width: number;
  wheelRadius: number; mountY: number; springLength: number; travel: number; bumperCenterY: number;
  modules: { name: string; x: number; z: number }[];
  intake: { pivot: Vec3; stowedAngle: number; stowTravel?: number };
  hopper: { stowTravel: number };
  hood: { pivot: Vec3; maxAngle: number };
  colliders: RobotCollider[];
  cargoSlots?: Vec3[];
  pickup?: { minX: number; maxX: number; halfWidth: number; mouthX: number; ejectX: number };
  shooterGeometry?: { pivot: Vec3; drumRadius: number; guideLength: number; turretRadiansPerSecond: number };
  mechanisms: { capacity: number; intakeRate: number; compress: boolean; lanes: number[]; fireRate: number; turret: boolean; movingShots: boolean; climb: boolean };
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
  hopper: { stowTravel: 0.29845 }, // measured between collecting and starting CAD configurations
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
  return { angle, pivot, shift };
}

export const STARTING_POSE: RobotPose = { intake: 0, hopper: 0, hood: 0 };

/** Provisional gameplay model; replace estimates after verifying the FRSim card.
 * Procedural geometry is original and does not claim to reproduce team CAD. */
export const HIGH_TIDE: RobotDefinition = {
  ...REBLITZ, id: '4414-high-tide', name: '4414 High Tide · Ripcurrent', model: '',
  mass: 54, inertia: [3, 5.8, 3.2],
  mechanisms: { capacity: 85, intakeRate: 20, compress: true, lanes: [0], fireRate: 8, turret: true, movingShots: true, climb: false },
  // 25 × 32 in frame, plus approximate 3 in bumper allowance on each edge.
  length: 38 * 0.0254, width: 31 * 0.0254,
  modules: REBLITZ.modules.map(m => ({ ...m, x: Math.sign(m.x) * .33, z: Math.sign(m.z) * .23 })),
  cargoSlots: Array.from({ length: 85 }, (_, i): Vec3 => {
    const layer = Math.floor(i / 30), row = Math.floor(i % 30 / 5), column = i % 5;
    return [-.85 + row * .151 + (column % 2) * .151 / 2 + (layer % 2) * .151 / 2, -.022 + layer * .151 * Math.sqrt(2 / 3), (column - 2) * .151 * Math.sqrt(3) / 2 + (layer % 2) * .151 * Math.sqrt(3) / 6];
  }),
  pickup: { minX: -1.15, maxX: -.88, halfWidth: .29, mouthX: -.94, ejectX: -1.14 },
  shooterGeometry: { pivot: [.12, .25325, 0], drumRadius: .0381, guideLength: .155, turretRadiansPerSecond: 3 },
  hopper: { stowTravel: .45 }, intake: { pivot: [-0.27305, -0.0467875, 0], stowedAngle: 0, stowTravel: .45 },
  colliders: [
    ...[-1, 1].flatMap((sign): RobotCollider[] => [
      { part: 'chassis', center: [sign * .4445, -.12616, 0], halfExtents: [.0381, .05715, .3937], radius: .008 },
      { part: 'chassis', center: [0, -.12616, sign * .3556], halfExtents: [.4064, .05715, .0381], radius: .008 },
    ]),
    { part: 'chassis', center: [0, -.18215, 0], halfExtents: [.4, .002, .31], radius: .006 },
    ...[-1, 1].map((sign): RobotCollider => ({ part: 'hopper', center: [-.59, .08, sign * .34], halfExtents: [.36, .15, .008] })),
    { part: 'intake', center: [-1.04, -.10, 0], halfExtents: [.035, .035, .32], radius: .008 },
    { part: 'hopper', center: [-.96, .10, 0], halfExtents: [.008, .16, .34] },
  ],
};
export const TOWER_TRAINER: RobotDefinition = { ...HIGH_TIDE, id: 'tower-trainer', name: 'Tower trainer (original)', cargoSlots: undefined, pickup: undefined, hopper: { stowTravel: 0 }, intake: { ...REBLITZ.intake, stowedAngle: 0 }, length: REBLITZ.length, width: REBLITZ.width, modules: REBLITZ.modules, colliders: REBLITZ.colliders.filter(c => c.part === 'chassis' && c.center[1] < 0), mechanisms: { ...HIGH_TIDE.mechanisms, capacity: 24, climb: true } };
export const ROBOTS = { '2910-reblitz': REBLITZ, '4414-high-tide': HIGH_TIDE, 'tower-trainer': TOWER_TRAINER };
export type RobotId = keyof typeof ROBOTS;
