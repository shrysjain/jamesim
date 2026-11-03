import { describe, expect, it } from 'vitest';
import { REBLITZ } from './robots/2910-reblitz/definition';
import { KEPLER } from './robots/1690-kepler/definition';
import { validateRobotDefinition } from './validateDefinition';
describe('increased full-size cargo packing', () => {
  it('increases the requested limits without shrinking fuel or changing the CAD envelope', () => {
    expect(REBLITZ.mechanisms.capacity).toBe(65); expect(KEPLER.mechanisms.capacity).toBe(60);
    for (const d of [REBLITZ, KEPLER]) {
      const v = d.hopper.volume!; expect(d.cargoSlots).toHaveLength(d.mechanisms.capacity);
      for (const p of d.cargoSlots) {
        expect(Math.abs(p[2]) + .075).toBeLessThanOrEqual(v.halfWidth + 1e-8);
        expect(p[0] - .075).toBeGreaterThanOrEqual(v.frontX - 1e-8); expect(p[0] + .075).toBeLessThanOrEqual(v.backX + 1e-8);
        expect(p[1] + .075).toBeLessThanOrEqual(v.ceilingY + 1e-8);
        expect(p[1] - .075 * Math.sqrt(1 + (v.floorSlope ?? 0)**2)).toBeGreaterThanOrEqual(v.floorY + (v.floorSlope ?? 0) * p[0] - 1e-8);
      }
      for (let i = 0; i < d.cargoSlots.length; i++) for (let j = i + 1; j < d.cargoSlots.length; j++)
        expect(Math.hypot(...d.cargoSlots[i].map((x, k) => x - d.cargoSlots[j][k]))).toBeGreaterThanOrEqual(.15);
    }
  });
  it('rejects malformed shot variation rather than silently changing launch physics', () => {
    expect(validateRobotDefinition({ ...KEPLER, shooterGeometry: { ...KEPLER.shooterGeometry, spread: { yaw: NaN, elevation: .1, speed: 1, flyerChance: 2, backspin: -1 } } }))
      .toContain('Shot spread must be finite and nonnegative with valid probability and fractional speed.');
  });
});
