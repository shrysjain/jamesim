import type { DriveInput } from './SwerveChassis';

export type DriveFrame = 'field' | 'robot';

/** Blue-side driver frame: forward is field −X, right is field −Z. */
export function toRobotInput(input: DriveInput, heading: number, frame: DriveFrame): DriveInput {
  if (frame === 'robot') return input;
  const c = Math.cos(heading), s = Math.sin(heading);
  return { ...input, forward: -input.forward * c + input.strafe * s, strafe: -input.forward * s - input.strafe * c };
}
