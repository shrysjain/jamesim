import type { RobotDefinition, RobotVisualDefinition } from './types';

/** Shared simulator baseline for robots without definition-owned drive tuning. */
export const DEFAULT_DRIVE = { maxSpeed: 16.7 * .3048, acceleration: 33 * .3048, grip: 1.05 };

/** Numerical ground-support convention; CAD modules are rigid, without suspension travel.
 * These support defaults are not measured dimensions for a new team. */
export const STANDARD_SWERVE = {
  wheelRadius: .0508, mountY: -.06, springLength: .12, travel: .08, bumperCenterY: -.12616,
} satisfies Pick<RobotDefinition, 'wheelRadius' | 'mountY' | 'springLength' | 'travel' | 'bumperCenterY'>;
export const swerveModules = (x: number, z: number) => [
  { name: 'module-front-left', x, z: -z }, { name: 'module-front-right', x, z },
  { name: 'module-rear-left', x: -x, z: -z }, { name: 'module-rear-right', x: -x, z },
];

/** Existing roller conventions. A robot may supply its own bindings without editing RobotView. */
export const STANDARD_VISUAL = {
  bumperMaterial: 'bumper', previewHeight: .223, numberSize: [.295, .083], numberOffset: .0015,
  spin: [
    { prefix: 'intake-roller-', source: 'intake', factor: 1 },
    { prefix: 'feeder-roller-', source: 'feeder', factor: 1 },
    { node: 'shooter-drum', source: 'shooter', factor: -1, axis: 'z' },
    { prefix: 'hood-roller-', source: 'shooter', factor: -1, axis: 'z' },
    { node: 'shooter-flywheel', source: 'shooter', factor: -6.7, axis: 'z' },
  ],
} satisfies Pick<RobotVisualDefinition, 'bumperMaterial' | 'previewHeight' | 'numberSize' | 'numberOffset' | 'spin'>;
