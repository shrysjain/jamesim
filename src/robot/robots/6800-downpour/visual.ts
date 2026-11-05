import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const DOWNPOUR_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis', 'intake', 'hopper', 'hood', 'intake-roller-main', 'shooter-drum', 'intake-crash-bar', 'intake-lower-bar', 'hood-roller-1', 'hood-roller-2', 'intake-roller-drive', 'intake-pivot-drive', 'intake-fixed-mounts'],
  spin: [
    { node: 'intake-roller-drive', source: 'intake', factor: 32 / 26 },
    { prefix: 'feeder-roller-floor-', source: 'feeder', factor: -1 },
    ...STANDARD_VISUAL.spin,
  ],
  poseNodes: { intake: 'intake', hopper: 'hopper', hood: 'hood' },
  numberSize: [.26, .075],
};
