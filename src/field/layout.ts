import { ALLIANCE_LINE, FIELD_HALF_WIDTH } from './targets';
import type { Alliance } from './targets';

// Manual §5.3 / G303 and footprints measured from the prepared official field CAD.
// The 2-inch starting tape extends into the alliance zone from ALLIANCE_LINE.
export const START_LINE_WIDTH = .0508;
export type FieldFootprint = {
  kind: 'hub' | 'bump' | 'trench' | 'tower' | 'depot';
  minX: number; maxX: number; minZ: number; maxZ: number;
};
const BLUE_FOOTPRINTS: FieldFootprint[] = [
  { kind: 'hub', minX: 3.048, maxX: 4.2418, minZ: -.5969, maxZ: .5969 },
  ...[-1, 1].map(sign => ({ kind: 'bump' as const, minX: 3.081082, maxX: 4.208718,
    minZ: sign < 0 ? -2.751137 : .517875, maxZ: sign < 0 ? -.517875 : 2.751137 })),
  ...[-1, 1].map(sign => ({ kind: 'trench' as const, minX: 3.048, maxX: ALLIANCE_LINE,
    minZ: sign < 0 ? -FIELD_HALF_WIDTH : 2.4511, maxZ: sign < 0 ? -2.450306 : FIELD_HALF_WIDTH })),
  { kind: 'tower', minX: 7.125938, maxX: 8.27024, minZ: -.9144, maxZ: .33655 },
  { kind: 'depot', minX: 7.584726, maxX: 8.27024, minZ: 1.397, maxZ: 2.4638 },
];
export function fieldFootprints(alliance: Alliance): FieldFootprint[] {
  return BLUE_FOOTPRINTS.map(f => alliance === 'blue' ? { ...f } :
    { ...f, minX: -f.maxX, maxX: -f.minX, minZ: -f.maxZ, maxZ: -f.minZ });
}

// Ground posts beside the ramp, plus the overhead arm (not a ground obstruction).
export const TRENCH_CLEARANCE = .56515;
export const BLUE_START_OBSTACLES = [
  ...BLUE_FOOTPRINTS.filter(f => f.kind === 'bump').map(f => ({ ...f, minY: 0, maxY: .165423 })),
  { kind: 'hub', minX: 3.054, maxX: 4.257668, minZ: -.603148, maxZ: .603148, minY: 0, maxY: 3.06 },
  ...[-1, 1].flatMap(sign => [
    { kind: 'trench', minX: 3.048, maxX: ALLIANCE_LINE,
      minZ: sign < 0 ? -2.7559 : 2.4511, maxZ: sign < 0 ? -2.450306 : 2.7559, minY: 0, maxY: .762 },
    { kind: 'trench', minX: 3.048, maxX: ALLIANCE_LINE,
      minZ: sign < 0 ? -FIELD_HALF_WIDTH : 2.7559, maxZ: sign < 0 ? -2.7559 : FIELD_HALF_WIDTH,
      minY: TRENCH_CLEARANCE, maxY: .762 },
  ]),
];
