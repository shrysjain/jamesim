import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const ERA_II_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis','intake','turret','turret-hood','shooter-drum','indexer-disk',
    'intake-roller-0','intake-roller-1','feeder-roller-0','feeder-roller-1','feeder-roller-2','passive-kicker'],
  poseNodes: { intake: 'intake' },
  turret: 'turret', turretHood: 'turret-hood',
  kicker: { node: 'passive-kicker', radians: 110*Math.PI/180 },
  spin: [
    { node: 'indexer-disk', source: 'indexer', factor: 1, axis: 'y' },
    { node: 'feeder-roller-2', source: 'feeder', factor: -1, axis: 'x' },
    ...STANDARD_VISUAL.spin,
  ],
  numberSize: [.35,.0975],
};
