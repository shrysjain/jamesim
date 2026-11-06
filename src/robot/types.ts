import type { Vec3 } from '../field/types';

export type RobotPart = 'chassis' | 'intake' | 'opposedIntake' | 'hopper' | 'hood' | 'climber';
export type RobotCollider = { part: RobotPart; center: Vec3; halfExtents: Vec3; radius?: number };
export type RobotPose = { intake: number; opposedIntake?: number; hopper: number; hood: number; climber?: number };
export type HopperVolume = {
  frontX: number; backX: number; halfWidth: number; floorY: number; ceilingY: number;
  frontTravel: number; backTravel?: number; ceilingTravel?: number; // roof follows the vertical climber/lid stage
  floorSlope?: number; slopedFront?: boolean;
  /** Finite wall tops; open hoppers have no dynamic ceiling. */
  rim?: { front: number; back: number; sides: number };
};
/** Estimated launch standard deviations: radians, fractional speed, and rad/s backspin. */
export type ShotSpread = { yaw: number; elevation: number; speed: number; flyerChance: number; backspin: number };
export type HopperObstacle = { center: Vec3; halfExtents: Vec3; angle?: number;
  part?: 'intake' | 'opposedIntake' | 'hopper';
  /** Vertical round solids use equal X/Z radii. An annulus keeps its center open. */
  shape?: 'box' | 'cylinder' | 'annulus'; innerRadius?: number;
  /** Local rectangular bounds for a round platform that ends at the frame. */
  clipHalfExtents?: Vec3 };
export type HopperFloorPoint = { x: number; y: number; part?: 'intake' | 'opposedIntake' | 'hopper' };
/** A second, oppositely facing mouth uses positive local X. */
export type PickupRegion = { minX: number; maxX: number; halfWidth: number; mouthX: number; ejectX: number };
export type RobotDefinition = {
  id: string; teamNumber: string; name: string; summary: string; model: string;
  visual: RobotVisualDefinition;
  mass: number; inertia: Vec3; length: number; width: number;
  wheelRadius: number; mountY: number; springLength: number; travel: number; bumperCenterY: number;
  drive?: { maxSpeed: number; acceleration: number; grip: number;
    /** Optional unloaded wheel braking response; chassis forces remain grip-limited. */
    brakeAcceleration?: number };
  modules: { name: string; x: number; z: number }[];
  intake: { pivot: Vec3; stowedAngle: number; stowTravel?: number; stowRise?: number; manualRetraction?: boolean; /** Optional lower slide fraction during automatic shooting compression; manual stow remains available. */ shootingMinExtension?: number; passiveKicker?: boolean; opposed?: { pivot: Vec3; stowTravel: number; stowRise?: number } };
  hopper: { stowTravel: number; coupledToIntake?: boolean; autoLift?: { loweredCapacity: number }; intakeCurve?: number[];
    volume?: HopperVolume; fixedSlot?: number; entry?: Vec3; entryHalfWidth?: number;
    /** Fixed internal CAD envelopes, e.g. an indexer cone or feed tower. */
    obstacles?: HopperObstacle[];
    /** Measured roller/tray top profile in deployed chassis coordinates. */
    floorProfile?: HopperFloorPoint[];
    /** Optional contact response for loose cargo; existing robots keep their prior response. */
    physics?: { restitution: number; friction: number; linearDamping?: number };
    /** Powered rotating floor, with bounded friction against supported fuel. */
    indexer?: { center: Vec3; radius: number; angularSpeed: number; friction: number } };
  hood: { pivot: Vec3; maxAngle: number };
  colliders: RobotCollider[];
  climb?: { kind: 'side-hook-l1'; approachAxis?: 'x' | 'z'; hookOffsetsZ?: number[]; maxLift: number; rate: number; deploySeconds: number; travel: number; hook: Vec3 };
  cargoSlots: Vec3[];
  pickup: PickupRegion & { opposed?: PickupRegion };
  shooterGeometry: { pivot: Vec3; drumRadius: number; guideLength: number; turretRadiansPerSecond: number; turretPivot?: Vec3; minElevation?: number; maxElevation?: number; passRange?: number; passLandingExtra?: number; movingAccuracy?: number; feedPath?: Vec3[]; feedAcrossLanes?: boolean; laneJitter?: number; yawOffset?: number; fixedElevation?: number; spread?: ShotSpread;
    /** Unwrapped cable-safe travel relative to the prepared neutral bearing. */
    turretLimits?: [number, number];
    /** Optional automatic hood retraction and firing inhibit near field trenches. */
    trenchSafety?: { retractSeconds: number; radius: number };
    movingLimits?: { hub: { speed: number; turnRate: number }; pass: { speed: number; turnRate: number } } };
  mechanisms: { capacity: number; intakeRate: number; compress: boolean; lanes: number[]; fireRate: number; feedSeconds?: number; turret: boolean; /** Hub shooting while translating; movingShots also enables the legacy moving-pass behavior. */
    movingShots: boolean;
    /** Allows moving passes without also allowing moving hub shots. */
    movingPasses?: boolean; simultaneousIntake?: boolean; climb: boolean };
};

/** Browser-independent model contract. Nodes use glTF extras.mechanism, not exporter names. */
export type SpinSource = 'intake' | 'feeder' | 'shooter' | 'indexer';
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
