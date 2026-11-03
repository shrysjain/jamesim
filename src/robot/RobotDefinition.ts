/** Compatibility entry point. New robot modules import types/defaults directly to avoid registry cycles. */
export type * from './types';
export { COLLECTING_POSE, STARTING_POSE, partTransform, supportsIntakeToggle } from './poses';
export { REBLITZ, KEPLER, ROBOTS } from './registry';
export type { RobotId } from './registry';
