import { REBLITZ } from './robots/2910-reblitz/definition';
import { PRISMARINE } from './robots/8592-prismarine/definition';
import { KEPLER } from './robots/1690-kepler/definition';

// Integration point: one import and entry per robot. Preserve existing IDs/order.
export { REBLITZ, KEPLER };
export const ROBOTS = { '2910-reblitz': REBLITZ, '1690-kepler': KEPLER, '8592-prismarine': PRISMARINE };
export type RobotId = keyof typeof ROBOTS;
