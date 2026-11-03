import { describe, expect, it } from 'vitest';
import {DEFAULT_SHOT_SPREAD,sampleShotScatter} from './ShotScatter';
const rng=()=>{let state=20261102;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};};
describe('optional physical launch uncertainty',()=>{
  it('has unbiased bounded variation, occasional wider shots and reproducible spin', () => {
    const random = rng(), samples = Array.from({ length: 10000 }, () => sampleShotScatter(DEFAULT_SHOT_SPREAD, .9, 0, 0, random));
    const mean = samples.reduce((sum, s) => sum + s.yaw, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(.001);
    expect(Math.sqrt(samples.reduce((sum, s) => sum + s.yaw*s.yaw, 0) / samples.length)).toBeGreaterThan(.02);
    expect(samples.some(s => Math.abs(s.yaw) > .08)).toBe(true);
    for (const s of samples) { expect(Math.abs(s.yaw)).toBeLessThanOrEqual(.16); expect(s.speedFactor).toBeGreaterThanOrEqual(.85); expect(s.speedFactor).toBeLessThanOrEqual(1.15); expect(s.spin.z).toBeGreaterThan(0); }
    expect(sampleShotScatter(DEFAULT_SHOT_SPREAD, .9, 0, 0, rng())).toEqual(sampleShotScatter(DEFAULT_SHOT_SPREAD, .9, 0, 0, rng()));
  });
  it('scales with travel, turning and robot rating without selecting misses', () => {
    const sample = (rating: number, speed: number, turn: number) => {
      const random = rng(); return Array.from({ length: 3000 }, () => sampleShotScatter(DEFAULT_SHOT_SPREAD, rating, speed, turn, random)).reduce((sum, s) => sum + s.yaw*s.yaw, 0);
    };
    expect(sample(.9, 3, 1)).toBeGreaterThan(sample(.9, 0, 0) * 2);
    expect(sample(.95, 3, 0)).toBeLessThan(sample(.8, 3, 0));
  });
});
