import type { RobotDefinition, RobotPart, RobotPose } from './types';

export const COLLECTING_POSE: RobotPose = { intake: 1, hopper: 1, hood: 0 };
export function partTransform(definition: RobotDefinition, part: RobotPart, pose: RobotPose) {
  const angle = part === 'intake' ? definition.intake.stowedAngle * (1 - pose.intake) : part === 'hood' ? -definition.hood.maxAngle * pose.hood : 0;
  const pivot = part === 'intake' ? definition.intake.pivot : part === 'hood' ? definition.hood.pivot : [0, 0, 0];
  const shift = part === 'hopper' ? definition.hopper.stowTravel * (1 - pose.hopper) : part === 'intake' ? (definition.intake.stowTravel ?? 0) * (1 - pose.intake) : 0;
  const rise = part === 'intake' ? (definition.intake.stowRise ?? 0) * (1 - pose.intake) : part === 'climber' ? (definition.climb?.travel ?? 0) * (pose.climber ?? 0) : 0;
  return { angle, pivot, shift, rise };
}

export const STARTING_POSE: RobotPose = { intake: 0, hopper: 0, hood: 0 };

/** A definition-owned linkage maps the shared intake actuator to the actual hopper slide. */
export function linkedHopperExtension(definition: RobotDefinition, intake: number): number {
  const curve = definition.hopper.intakeCurve;
  if (!curve) return intake;
  const t = Math.max(0, Math.min(1, intake)) * (curve.length - 1), i = Math.min(curve.length - 2, Math.floor(t));
  return curve[i] + (curve[i + 1] - curve[i]) * (t - i);
}
