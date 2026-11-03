import type { Vec3 } from '../field/types';
import type { HopperVolume } from './types';

/** Full-size close-packed entry seeds; carried fuel subsequently moves in the
 * shared solver. Phase/orientation are fitted to each robot's own CAD envelope. */
export function packedCargo(v: HopperVolume, phase: [number, number, number, number], keepAway: Vec3[] = []): Vec3[] {
  const [orientation, ox, oy, oz] = phase, spacing = .151, radius = .075;
  const rowPitch = spacing * Math.sqrt(3) / 2, layerPitch = spacing * Math.sqrt(2 / 3), slope = v.floorSlope ?? 0;
  const bottom = Math.min(v.floorY + slope * v.frontX, v.floorY + slope * v.backX) + radius * Math.sqrt(1 + slope * slope);
  const points: Vec3[] = [];
  for (let layer = 0; layer < 6; layer++) for (let row = 0; row < 10; row++) for (let column = 0; column < 10; column++) {
    const a = row * rowPitch + (layer % 2) * rowPitch / 3, b = (column + (row % 2) / 2 + (layer % 2) / 2) * spacing;
    const p: Vec3 = [v.frontX + radius + ox + (orientation ? b : a), bottom + oy + layer * layerPitch, -v.halfWidth + radius + oz + (orientation ? a : b)];
    if (p[0] > v.backX - radius || p[2] > v.halfWidth - radius || p[1] + radius > v.ceilingY
      || p[1] - radius * Math.sqrt(1 + slope * slope) < v.floorY + slope * p[0]
      || v.slopedFront && p[1] - p[0] + radius * Math.SQRT2 > .832565
      || keepAway.some(q => Math.hypot(...p.map((x, i) => x - q[i])) < spacing)) continue;
    points.push(p);
  }
  return points;
}
