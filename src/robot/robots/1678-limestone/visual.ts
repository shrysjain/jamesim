import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const LIMESTONE_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis', 'intake', 'hopper', 'hood', 'climber', 'shooter-drum',
    'intake-roller-0', 'intake-roller-kicker', 'hood-roller-0', 'hood-roller-1', 'hood-roller-2'],
  poseNodes: { intake: 'intake', hopper: 'hopper', hood: 'hood' },
  climber: 'climber',
};
