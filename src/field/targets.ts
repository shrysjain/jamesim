import { v3 } from '../sim/vector';
import type { Vector } from '../sim/vector';

export type Alliance = 'blue' | 'red';
// Official manual §5.3: 158.6 in zone depth. CAD frame is field-centered, blue +X.
export const FIELD_HALF_LENGTH = 8.27024;
export const FIELD_HALF_WIDTH = 4.03479;
export const ALLIANCE_LINE = FIELD_HALF_LENGTH - 158.6 * 0.0254;
// Funnel center from the prepared official CAD, rather than the net's bounding box.
export const HUB_CENTER_X = 3.6449;
export type ShotTarget = { kind: 'Hub' | 'Pass'; position: Vector };

export function shotTarget(position: Vector, alliance: Alliance): ShotTarget {
  const sign = alliance === 'blue' ? 1 : -1;
  // Aim-assist mode uses the chassis center, not a full match-rule bumper test.
  if (position.x * sign >= ALLIANCE_LINE) return { kind: 'Hub', position: v3(sign * HUB_CENTER_X, 1.95, 0) };
  // Closest floor point, inset to leave room for the entire ball and the bump edge.
  return { kind: 'Pass', position: v3(sign * (ALLIANCE_LINE + 0.45), 0.09,
    Math.max(-FIELD_HALF_WIDTH + 0.45, Math.min(FIELD_HALF_WIDTH - 0.45, position.z))) };
}
