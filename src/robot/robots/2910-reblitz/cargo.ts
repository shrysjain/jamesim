import type { Vec3 } from '../../../field/types';
// Original 2910 packing, retained exactly; these positions seed local hopper physics.
const spacing = .151, rowPitch = spacing * Math.sqrt(3) / 2, layerPitch = spacing * Math.sqrt(2 / 3);
export const REBLITZ_CARGO: Vec3[] = [0, 1, 2].flatMap(layer =>
  [0, 1, 2, 3].flatMap(row => Array.from({ length: layer === 1 ? 4 : 5 }, (_, column): Vec3 => [
    -.56 + row * spacing + (column % 2) * spacing / 2 + (layer === 1 ? spacing / 2 : 0),
    -.022 + layer * layerPitch, (column - 2) * rowPitch + (layer === 1 ? rowPitch / 3 : 0),
  ]).filter(p => p[0] < 0)));
export const REBLITZ_FEEDER_POCKET = REBLITZ_CARGO.length;
REBLITZ_CARGO.push([.13, .04, 0]);
