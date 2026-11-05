import { expect, it } from 'vitest';
import { selectShotTarget } from './passTargets';
import { ALLIANCE_LINE } from './targets';
import { fieldFootprints } from './layout';
import { v3 } from '../sim/vector';

it.each(['blue', 'red'] as const)('%s keeps the home-zone target when reachable and stages toward it otherwise', alliance => {
  const sign = alliance === 'blue' ? 1 : -1;
  expect(selectShotTarget(v3(sign * 6, .223, 1.5), alliance, 9).target.kind).toBe('Hub');
  const normal = selectShotTarget(v3(0, .223, sign * 1.5), alliance, 9);
  expect(normal.intermediate).toBe(false); expect(normal.target.kind).toBe('Pass');
  expect(normal.target.position.x * sign).toBeCloseTo(ALLIANCE_LINE + .45);
  const source = v3(-sign * 6.2, .223, sign * 1.5), staged = selectShotTarget(source, alliance, 10);
  expect(staged.intermediate).toBe(true); expect(staged.target.kind).toBe('Pass');
  const p = staged.target.position;
  expect((p.x - source.x) * sign).toBeGreaterThan(1);
  expect(Math.hypot(p.x - source.x, p.z - source.z)).toBeLessThanOrEqual(10);
  for (const b of [...fieldFootprints('blue'), ...fieldFootprints('red')]) {
    expect(p.x >= b.minX - .1 && p.x <= b.maxX + .1 && p.z >= b.minZ - .1 && p.z <= b.maxZ + .1).toBe(false);
  }
});

it('preserves negative-X intermediate targets and accounts for a deeper preferred landing', () => {
  expect(selectShotTarget(v3(-7.8, .223, 1.5), 'blue', 3).target.position.x).toBeLessThan(0);
  expect(selectShotTarget(v3(-4.3, .223, 3.5), 'blue', 9, .8).intermediate).toBe(true);
  const normal = selectShotTarget(v3(0, .223, 1.5), 'blue', 9, .8);
  expect(normal.target.position.x).toBeCloseTo(ALLIANCE_LINE + .45 + .8);
});
