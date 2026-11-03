import { REBLITZ } from './robots/2910-reblitz/definition';
import { DOWNPOUR } from './robots/6800-downpour/definition';
import { KEPLER } from './robots/1690-kepler/definition';

// Integration point: one import and entry per robot. Preserve existing IDs/order.
export { REBLITZ, KEPLER };
export const ROBOTS = { '2910-reblitz': REBLITZ, '1690-kepler': KEPLER, '6800-downpour': DOWNPOUR };
export type RobotId = keyof typeof ROBOTS;
