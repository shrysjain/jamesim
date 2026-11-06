import { BLUE_START_OBSTACLES } from '../field/layout';
import type { Vector } from './vector';

const arms = BLUE_START_OBSTACLES.filter(o => o.kind === 'trench' && o.minY > 0);

/** Conservative swept hood envelope using the prepared field's overhead arms. */
export function needsTrenchRetraction(position: Vector, velocity: Vector, seconds: number, radius: number, acceleration: number) {
  const margin = radius + .5 * acceleration * seconds * seconds;
  const x = margin + Math.abs(velocity.x) * seconds, z = margin + Math.abs(velocity.z) * seconds;
  return [1, -1].some(side => arms.some(arm => position.x * side + x >= arm.minX && position.x * side - x <= arm.maxX
    && position.z * side + z >= arm.minZ && position.z * side - z <= arm.maxZ));
}
