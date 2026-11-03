import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const INFRARED_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis', 'intake', 'hood', 'shooter-drum'],
  poseNodes: { intake: 'intake', hood: 'hood' },
  spin: [
    { prefix: 'intake-roller-', source: 'intake', factor: 1, axis: 'z' },
    { prefix: 'feeder-floor-', source: 'feeder', factor: -1, axis: 'z' },
    { prefix: 'feeder-vertical-', source: 'feeder', factor: 1, axis: 'z' },
    { prefix: 'hood-roller-', source: 'shooter', factor: 1, axis: 'z' },
    { node: 'shooter-drum', source: 'shooter', factor: -1, axis: 'z' },
  ],
};
