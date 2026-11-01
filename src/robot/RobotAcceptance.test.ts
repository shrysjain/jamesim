import { ROBOTS } from './registry';
import type { RobotId } from './registry';
import { robotAcceptance } from './testing/robotAcceptance';
for (const id of Object.keys(ROBOTS) as RobotId[]) robotAcceptance(id);
