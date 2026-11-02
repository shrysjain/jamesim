import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const DARWIN_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis','intake','hopper','hood','roof','shooter-drum','shooter-flywheel','intake-roller-0'],
  poseNodes: {intake:'intake',hopper:'hopper',hood:'hood'},
  spin: [
    {node:'intake-roller-0',source:'intake',factor:1,axis:'z'},
    {prefix:'feeder-roller-',source:'feeder',factor:1,axis:'z'},
    {node:'shooter-drum',source:'shooter',factor:-1,axis:'z'},
    {node:'shooter-flywheel',source:'shooter',factor:-1,axis:'z'},
  ],
};
