import type { Vec3 } from '../../../field/types';
import type { RobotDefinition, RobotCollider } from '../../types';
import { STANDARD_SWERVE, swerveModules } from '../../defaults';
import { PRISMARINE_VISUAL } from './visual';

/** User-provided ProductionMain CAD; measured envelopes, estimated performance where noted in README. */
export const PRISMARINE: RobotDefinition = {
  ...STANDARD_SWERVE,
  id: '8592-prismarine',
  teamNumber: '8592',
  name: '8592 Newton Squared · Prismarine',
  summary: 'Turret · fixed 64° shooter · rotary indexer',
  model: '/assets/robots/8592-prismarine/robot.glb',
  visual: PRISMARINE_VISUAL,
  mass: 54.4,
  inertia: [3.2, 5.8, 3.5],
  length: 0.7792,
  width: 0.8871,
  bumperCenterY: -0.1273,
  springLength: 0.1122,
  drive: { maxSpeed: 4.73, acceleration: 8, brakeAcceleration: 16, grip: 1.05 },
  modules: swerveModules(0.250825, 0.301625),
  intake: {
    pivot: [0, 0, 0],
    stowedAngle: 0,
    stowTravel: 0.2,
    stowRise: 0.087,
    manualRetraction: true,
  },
  hopper: {
    stowTravel: 0,
    volume: {
      frontX: -0.51,
      backX: 0.3,
      halfWidth: 0.345,
      floorY: -0.015,
      ceilingY: 0.3,
      frontTravel: 0.2,
    },
  },
  hood: { pivot: [0.01, 0.421, 0], maxAngle: 0 },
  shooterGeometry: {
    pivot: [0.01, 0.421, 0],
    turretPivot: [0, 0.2997, 0],
    drumRadius: 0.0286,
    guideLength: 0.06,
    turretRadiansPerSecond: 4,
    fixedElevation: (64 * Math.PI) / 180,
    minElevation: (64 * Math.PI) / 180,
    maxElevation: (64 * Math.PI) / 180,
    passRange: 8,
    feedPath: [
      [0, 0.025, 0],
      [0, 0.16, 0],
      [0.01, 0.32, 0],
    ],
  },
  mechanisms: {
    capacity: 40,
    intakeRate: 24,
    compress: false,
    lanes: [0],
    fireRate: 8,
    feedSeconds: 0.3,
    turret: true,
    movingShots: false,
    simultaneousIntake: true,
    climb: false,
  },
  cargoSlots: Array.from({ length: 40 }, (_, i): Vec3 => {
    const layer = Math.floor(i / 20),
      row = Math.floor((i % 20) / 5),
      col = i % 5;
    return [
      -0.42 + row * 0.151 + (col % 2) * 0.0755 + layer * 0.0755,
      0.061 + layer * 0.151 * Math.sqrt(2 / 3),
      ((col - 2) * 0.151 * Math.sqrt(3)) / 2 +
        ((layer - 0.5) * 0.151 * Math.sqrt(3)) / 6,
    ];
  }).sort((a, b) => b[0] - a[0]),
  pickup: {
    minX: -0.64,
    maxX: -0.43,
    halfWidth: 0.28,
    mouthX: -0.53,
    ejectX: -0.65,
  },
  colliders: [
    // Upper frame reaches ~.73 m above carpet and strikes the trench beam.
    // Four thin rails leave the central rotating muzzle/launch channel clear.
    ...[-1, 1].flatMap((sign): RobotCollider[] => [
      {
        part: 'chassis',
        center: [sign * 0.18, 0.405, 0],
        halfExtents: [0.015, 0.105, 0.165],
        radius: 0.004,
      },
      {
        part: 'chassis',
        center: [0, 0.405, sign * 0.18],
        halfExtents: [0.165, 0.105, 0.015],
        radius: 0.004,
      },
    ]),
    ...[-1, 1].flatMap((sign): RobotCollider[] => [
      {
        part: 'chassis',
        center: [sign * 0.3515, -0.1273, 0],
        halfExtents: [0.0381, 0.0615, 0.44355],
        radius: 0.008,
      },
      {
        part: 'chassis',
        center: [0, -0.1273, sign * 0.40545],
        halfExtents: [0.3134, 0.0615, 0.0381],
        radius: 0.008,
      },
      {
        part: 'chassis',
        center: [0.097, 0.115, sign * 0.3675],
        halfExtents: [0.225, 0.14, 0.003],
      },
      {
        part: 'intake',
        center: [-0.36, 0.105, sign * 0.365],
        halfExtents: [0.15, 0.19, 0.003],
      },
    ]),
    {
      part: 'chassis',
      center: [0, -0.182, 0],
      halfExtents: [0.31, 0.003, 0.35],
      radius: 0.005,
    },
    {
      part: 'intake',
      center: [-0.535, -0.089, 0],
      halfExtents: [0.02, 0.02, 0.27],
      radius: 0.004,
    },
  ],
};
