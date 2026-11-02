import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const ERA_II_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis','intake','turret','turret-hood','shooter-drum','indexer-disk',
    'intake-roller-0','intake-roller-1','feeder-roller-0','feeder-roller-1'],
  poseNodes: { intake: 'intake' },
  turret: 'turret', turretHood: 'turret-hood',
  spin: [
    { node: 'indexer-disk', source: 'indexer', factor: 1, axis: 'y' },
    ...STANDARD_VISUAL.spin,
  ],
  numberSize: [.28,.078],
};
