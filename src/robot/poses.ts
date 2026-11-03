import type { RobotDefinition, RobotPart, RobotPose } from './types';

export const COLLECTING_POSE: RobotPose = { intake: 1, hopper: 1, hood: 0 };
export function partTransform(definition: RobotDefinition, part: RobotPart, pose: RobotPose) {
  const angle = part === 'intake' ? definition.intake.stowedAngle * (1 - pose.intake) : part === 'hood' ? -definition.hood.maxAngle * pose.hood : 0;
  const pivot = part === 'opposedIntake' ? definition.intake.opposed?.pivot ?? [0, 0, 0] : part === 'intake' ? definition.intake.pivot : part === 'hood' ? definition.hood.pivot : [0, 0, 0];
  const shift = part === 'opposedIntake' ? -(definition.intake.opposed?.stowTravel ?? 0) * (1 - pose.intake) : part === 'hopper' ? definition.hopper.stowTravel * (1 - pose.hopper) : part === 'intake' ? (definition.intake.stowTravel ?? 0) * (1 - pose.intake) : 0;
  const rise = part === 'opposedIntake' ? (definition.intake.opposed?.stowRise ?? 0) * (1 - pose.intake) : part === 'intake' ? (definition.intake.stowRise ?? 0) * (1 - pose.intake) : 0;
  return { angle, pivot, shift, rise };
}

export const STARTING_POSE: RobotPose = { intake: 0, hopper: 0, hood: 0 };

/** Capability is explicit for pivot intakes; older slider definitions retain V. */
export const supportsIntakeToggle = (definition: RobotDefinition) => definition.intake.manualRetraction ?? !!definition.intake.stowTravel;
