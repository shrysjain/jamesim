import { REBLITZ } from './robots/2910-reblitz/definition';
import { KEPLER } from './robots/1690-kepler/definition';
import { MATTERHORN } from './robots/9496-matterhorn/definition';

// Integration point: one import and entry per robot. Preserve existing IDs/order.
export { REBLITZ, KEPLER };
export const ROBOTS = { '2910-reblitz': REBLITZ, '1690-kepler': KEPLER, '9496-matterhorn': MATTERHORN };
export type RobotId = keyof typeof ROBOTS;
