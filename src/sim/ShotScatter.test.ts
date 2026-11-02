import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ROBOTS } from '../robot/registry';
import type { RobotId } from '../robot/registry';
import type { CollisionAsset } from '../field/types';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { DEFAULT_SHOT_SPREAD, sampleShotScatter } from './ShotScatter';

const rng = () => { let state = 20261102; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; };
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
describe('physical shooting uncertainty', () => {
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
  it('gives original fuel bodies different physical rebounds while keeping their materials on reset', async () => {
    const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [10, .1, 10] }], meshes: [] };
    const s = await FieldSimulation.create(floor, Array.from({ length: 8 }, (_, i) => [i * .4, 2, 0]));
    try {
      const materials = s.fuel.map(b => b.collider(0).restitution()), handles = s.fuel.map(b => b.handle);
      expect(new Set(materials).size).toBe(8); expect(Math.min(...materials)).toBeGreaterThan(.379); expect(Math.max(...materials)).toBeLessThan(.541);
      s.fuel.forEach(b => b.wakeUp()); s.setRunning(true); const peaks = s.fuel.map(() => 0);
      for (let i = 0; i < 160; i++) { s.update(1 / 120); if (i > 85) s.fuel.forEach((b, n) => { peaks[n] = Math.max(peaks[n], b.translation().y); }); }
      expect(Math.max(...peaks) - Math.min(...peaks)).toBeGreaterThan(.03);
      s.fuelSystem.reset(); expect(s.fuel.map(b => b.collider(0).restitution())).toEqual(materials); expect(s.fuel.map(b => b.handle)).toEqual(handles);
    } finally { s.dispose(); }
  });
  for (const id of Object.keys(ROBOTS) as RobotId[]) it(`${id}: preserves full-load IDs and produces physical misses at varied range/motion`, async () => {
    const count = ROBOTS[id].mechanisms.capacity;
    const s = await FieldSimulation.create(field, Array.from({ length: count }, (_, i) => [0, .08, (i % 20) * .16]), true);
    const hits: number[] = [];
    try {
      const handles = s.fuel.map(f => f.handle);
      for (const moving of [false, true]) {
        s.startSession({ ...DEFAULT_MATCH, robot: id, preloads: 0 }, true);
        s.robot!.teleport(moving ? [7.2, .26, 2.8] : [6.2, .26, 1.5], Math.PI);
        const r = s.robotController!; r.input.intake = true; run(s, .8); r.input.intake = false;
        for (const [i, f] of s.fuelSystem.records.entries()) { s.fuelSystem.capture(f, r.owner, i, r.storageSlots[i]); f.state = 'stored'; }
        r.input.shoot = true; if (moving) r.chassis.input = { ...NEUTRAL_INPUT, strafe: .05 };
        let spin = 0;
        for (let i = 0; i < 1200; i++) { s.update(1 / 120); if (!spin && r.shooter.shots.length) { const a = s.fuel[r.shooter.shots[0].id].angvel(); spin = Math.hypot(a.x, a.y, a.z); } }
        expect(r.shooter.shotsFired, JSON.stringify(r.shooter.telemetry)).toBe(count);
        expect(new Set(r.shooter.shots.map(e => e.id)).size).toBe(count); expect(spin).toBeGreaterThan(5);
        expect(s.fuel.map(f => f.handle)).toEqual(handles); hits.push(s.hubs.telemetry.blue.hits);
      }
      console.log('Physical accuracy sample', JSON.stringify({ id, count, stationaryHits: hits[0], distantMovingHits: hits[1] }));
      expect(hits[0]).toBeGreaterThanOrEqual(Math.floor(count * .5));
      expect(hits[1]).toBeGreaterThanOrEqual(Math.floor(count * .25));
      expect(hits[0] + hits[1]).toBeLessThan(count * 2);
    } finally { s.dispose(); }
  }, 30000);
});
