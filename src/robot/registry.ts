import { SIMBOT_TIM } from './robots/1114-simbot-tim/definition';
import { REBLITZ } from './robots/2910-reblitz/definition';
import { INFRARED } from './robots/3847-infrared/definition';
import { PRISMARINE } from './robots/8592-prismarine/definition';
import { ICARUS } from './robots/5000-icarus-2/definition';
import { KEPLER } from './robots/1690-kepler/definition';
import { DARWIN } from './robots/6328-darwin/definition';
import { LIMESTONE } from './robots/1678-limestone/definition';
import { MATTERHORN } from './robots/9496-matterhorn/definition';
import { ERA_II } from './robots/4481-era-ii/definition';
import { DOWNPOUR } from './robots/6800-downpour/definition';

// Integration point: one import and entry per robot. Preserve existing IDs/order.
export { REBLITZ, KEPLER };
export const ROBOTS = {
  '2910-reblitz': REBLITZ,
  '1114-simbot-tim': SIMBOT_TIM,
  '1690-kepler': KEPLER,
  '6328-darwin': DARWIN,
  '1678-limestone': LIMESTONE,
  '9496-matterhorn': MATTERHORN,
  '3847-infrared': INFRARED,
  '5000-icarus-2': ICARUS,
  '4481-era-ii': ERA_II,
  '8592-prismarine': PRISMARINE,
  '6800-downpour': DOWNPOUR,
};
export type RobotId = keyof typeof ROBOTS;
