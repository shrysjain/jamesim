import { fieldFootprints } from './layout';
import { FIELD_HALF_LENGTH, FIELD_HALF_WIDTH, shotTarget } from './targets';
import type { Alliance, ShotTarget } from './targets';
import { v3 } from '../sim/vector';
import type { Vector } from '../sim/vector';

const obstacles = [...fieldFootprints('blue'), ...fieldFootprints('red')];
/** Prefer the home zone; otherwise advance toward it within the same rated range. */
export function selectShotTarget(position: Vector, alliance: Alliance, passRange: number, landingExtra = 0): { target: ShotTarget; intermediate: boolean } {
  const target = shotTarget(position, alliance), sign = alliance === 'blue' ? 1 : -1;
  if (target.kind === 'Hub') return { target, intermediate: false };
  target.position.x = sign * Math.min(FIELD_HALF_LENGTH - .55, Math.abs(target.position.x) + landingExtra);
  const dx = target.position.x - position.x, dz = target.position.z - position.z, distance = Math.hypot(dx, dz);
  if (!Number.isFinite(passRange) || passRange <= 0 || distance <= passRange) return { target, intermediate: false };
  // Leave a full fuel radius plus clearance around structures and guardrails.
  const margin = .1;
  for (let reach = passRange - margin; reach >= 1; reach -= .25) {
    const x = position.x + dx * reach / distance, z = position.z + dz * reach / distance;
    if (Math.abs(x) > FIELD_HALF_LENGTH - margin || Math.abs(z) > FIELD_HALF_WIDTH - margin) continue;
    if (obstacles.some(b => x >= b.minX - margin && x <= b.maxX + margin && z >= b.minZ - margin && z <= b.maxZ + margin)) continue;
    return { target: { kind: 'Pass', position: v3(x, .09, z) }, intermediate: true };
  }
  // Retain the unreachable target so normal range/obstruction checks keep the fuel.
  return { target, intermediate: false };
}
