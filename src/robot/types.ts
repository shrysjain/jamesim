import type { Vec3 } from '../field/types';

export type RobotPart = 'chassis' | 'intake' | 'hopper' | 'hood';
export type RobotCollider = { part: RobotPart; center: Vec3; halfExtents: Vec3; radius?: number };
export type RobotPose = { intake: number; hopper: number; hood: number };
export type HopperVolume = {
  frontX: number; backX: number; halfWidth: number; floorY: number; ceilingY: number;
  frontTravel: number; floorSlope?: number; slopedFront?: boolean;
};
export type RobotDefinition = {
  id: string; teamNumber: string; name: string; summary: string; model: string;
  visual: RobotVisualDefinition;
  mass: number; inertia: Vec3; length: number; width: number;
  wheelRadius: number; mountY: number; springLength: number; travel: number; bumperCenterY: number;
  drive?: { maxSpeed: number; acceleration: number; grip: number };
  modules: { name: string; x: number; z: number }[];
  intake: { pivot: Vec3; stowedAngle: number; stowTravel?: number; stowRise?: number; manualRetraction?: boolean; passiveKicker?: boolean };
  hopper: { stowTravel: number; intakeCurve?: number[]; // optional normalized slot-linkage samples, intake 0→1
    volume?: HopperVolume; fixedSlot?: number };
  hood: { pivot: Vec3; maxAngle: number };
  colliders: RobotCollider[];
  climb?: { kind: 'side-hook-l1'; maxLift: number; rate: number; deploySeconds: number; travel: number; hook: Vec3 };
  cargoSlots: Vec3[];
  pickup: { minX: number; maxX: number; halfWidth: number; mouthX: number; ejectX: number };
  shooterGeometry: { pivot: Vec3; drumRadius: number; guideLength: number; turretRadiansPerSecond: number; turretPivot?: Vec3; minElevation?: number; maxElevation?: number; passRange?: number; movingAccuracy?: number; feedPath?: Vec3[] };
  mechanisms: { capacity: number; intakeRate: number; compress: boolean; lanes: number[]; fireRate: number; feedSeconds?: number; turret: boolean; movingShots: boolean; simultaneousIntake?: boolean; climb: boolean };
};

/** Browser-independent model contract. Nodes use glTF extras.mechanism, not exporter names. */
export type SpinSource = 'intake' | 'feeder' | 'shooter';
export type SpinBinding = {
  node?: string; prefix?: string; source: SpinSource; factor: number;
  axis?: 'x' | 'y' | 'z'; // otherwise use node extras.spinAxis, falling back to Z
};
export type RobotVisualDefinition = {
  requiredNodes: string[];
  poseNodes: Partial<Record<RobotPart, string>>;
  spin: SpinBinding[];
  turret?: string; turretHood?: string;
  kicker?: { node: string; radians: number };
  climber?: string; // side-hook-l1: translate Y by extension × climb.travel
  bumperMaterial: string;
  previewHeight: number;
  numberSize: [number, number];
  numberOffset: number;
};
