import type {RobotVisualDefinition} from '../../types';
import {STANDARD_VISUAL} from '../../defaults';
export const MATTERHORN_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis','intake','hopper','shooter-drum',
    ...['front-left','front-right','rear-left','rear-right'].flatMap(id=>[`module-${id}-wheel`,`module-${id}-fork`])],
  poseNodes: {intake:'intake',hopper:'hopper'},
  spin: [
    {prefix:'intake-roller-',source:'feeder',factor:1},
    {prefix:'feeder-roller-',source:'feeder',factor:1},
    {prefix:'feeder-floor-',source:'feeder',factor:-1},
    {node:'shooter-drum',source:'shooter',factor:1,axis:'z'},
  ],
};
