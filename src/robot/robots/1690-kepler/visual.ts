import type { RobotVisualDefinition } from '../../types';
import { STANDARD_VISUAL } from '../../defaults';
export const KEPLER_VISUAL: RobotVisualDefinition = {
  ...STANDARD_VISUAL,
  requiredNodes: ['chassis', 'intake', 'turret', 'turret-hood', 'passive-kicker', 'climber'],
  poseNodes: { intake: 'intake' },
  turret: 'turret', turretHood: 'turret-hood',
  kicker: { node: 'passive-kicker', radians: 163 * Math.PI / 180 },
  climber: 'climber',
};
