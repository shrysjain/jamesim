import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
// These semantic names must match extras.mechanism in the prepared GLB.
// Adapt names/bindings to the actual robot. Remove assemblies it does not have.
export const VISUAL = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis', 'intake', 'hopper', 'hood'],
  poseNodes: { intake: 'intake', hopper: 'hopper', hood: 'hood' },
} satisfies RobotVisualDefinition;
