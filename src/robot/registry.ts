import { REBLITZ } from './robots/2910-reblitz/definition';
import { INFRARED } from './robots/3847-infrared/definition';
import { KEPLER } from './robots/1690-kepler/definition';
import { DARWIN } from './robots/6328-darwin/definition';
import { LIMESTONE } from './robots/1678-limestone/definition';
import { MATTERHORN } from './robots/9496-matterhorn/definition';

// Integration point: one import and entry per robot. Preserve existing IDs/order.
export { REBLITZ, KEPLER };
export const ROBOTS = { '2910-reblitz': REBLITZ, '1690-kepler': KEPLER, '6328-darwin': DARWIN, '1678-limestone': LIMESTONE, '9496-matterhorn': MATTERHORN, '3847-infrared': INFRARED };
export type RobotId = keyof typeof ROBOTS;
