import { REBLITZ } from './robots/2910-reblitz/definition';
import { KEPLER } from './robots/1690-kepler/definition';
import { LIMESTONE } from './robots/1678-limestone/definition';
import { DARWIN } from './robots/6328-darwin/definition';

// Integration point: one import and entry per robot. Preserve existing IDs/order.
export { REBLITZ, KEPLER };
export const ROBOTS = { '2910-reblitz': REBLITZ, '1690-kepler': KEPLER, '6328-darwin': DARWIN, '1678-limestone': LIMESTONE };
export type RobotId = keyof typeof ROBOTS;
