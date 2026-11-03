import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const PRISMARINE_VISUAL = {
  ...STANDARD_VISUAL,
  requiredNodes: [
    'chassis',
    'intake',
    'turret',
    'turret-hood',
    'feeder-rotor',
    'intake-roller-783',
    'intake-roller-913',
    'intake-roller-941',
    'feeder-roller-206',
    'feeder-roller-226',
    'feeder-roller-240',
    'feeder-roller-244',
    'shooter-roller-360',
    'shooter-roller-418',
    'shooter-roller-426',
  ],
  poseNodes: { intake: 'intake' },
  turret: 'turret',
  turretHood: 'turret-hood',
  spin: [
    { prefix: 'intake-roller-', source: 'intake', factor: 1, axis: 'z' },
    { prefix: 'feeder-roller-', source: 'feeder', factor: 1, axis: 'x' },
    { prefix: 'shooter-roller-', source: 'shooter', factor: -1, axis: 'z' },
    { node: 'feeder-rotor', source: 'feeder', factor: 0.35, axis: 'y' },
  ],
  numberSize: [0.27, 0.078],
} satisfies RobotVisualDefinition;
