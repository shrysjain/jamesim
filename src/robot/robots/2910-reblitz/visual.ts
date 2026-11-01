import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const REBLITZ_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis', 'intake', 'hopper', 'hood'],
  poseNodes: { intake: 'intake', hopper: 'hopper', hood: 'hood' },
};
