import { describe, expect, it } from 'vitest';
import type { CollisionAsset } from '../field/types';
import { ROBOTS, type RobotId } from '../robot/registry';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { sampleShotScatter, DEFAULT_SHOT_SPREAD } from './ShotScatter';
const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [25, .1, 25] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
async function fixture(id: RobotId, passing = false) {
  const s = await FieldSimulation.create(floor, Array.from({ length: 8 }, (_, i) => [0, .08, 4 + i * .16]), true);
  s.startSession({ ...DEFAULT_MATCH, robot: id, preloads: 0 }, true);
  const offset = ROBOTS[id].shooterGeometry.yawOffset ?? 0;
  s.robot!.teleport([passing ? 0 : 6.2, .26, 0], (passing ? 0 : Math.PI) - offset);
  run(s, .7);
  const r = s.robotController!;
  for (const [i, f] of s.fuelSystem.records.entries()) { s.fuelSystem.capture(f, r.owner, i, r.storageSlots[i]); f.state = 'stored'; }
  return s;
}
describe('researched shooting behavior', () => {
  for (const id of ['6328-darwin', '1678-limestone', '9496-matterhorn', '3847-infrared'] as const) {
    it(`${id}: waits above its hub speed envelope, then fires the same fuel after settling`, async () => {
      const s = await fixture(id);
      try {
        const r = s.robotController!, handles = s.fuel.map(f => f.handle);
        r.input.shoot = true;
        for (let i = 0; i < 120; i++) { r.chassis.body.setLinvel({ x: 0, y: 0, z: ROBOTS[id].shooterGeometry.movingLimits!.hub.speed + .5 }, true); s.update(1 / 120); }
        expect(r.shooter.shotsFired).toBe(0); expect(r.held).toHaveLength(8);
        r.chassis.body.setLinvel({ x: 0, y: 0, z: 0 }, true); run(s, 5);
        expect(r.shooter.shotsFired, JSON.stringify(r.shooter.telemetry)).toBe(8);
        expect(new Set(r.shooter.shots.map(shot => shot.id)).size).toBe(8);
        expect(s.fuel.map(f => f.handle)).toEqual(handles);
      } finally { s.dispose(); }
    });
  }
  it('Re•Blitz can pass while translating but must settle for hub shots', async () => {
    for (const passing of [false, true]) {
      const s = await fixture('2910-reblitz', passing);
      try {
        const r = s.robotController!, handles = s.fuel.map(f => f.handle); r.input.shoot = true;
        for (let i = 0; i < 240; i++) { r.chassis.body.setLinvel({ x: .7, y: 0, z: 0 }, true); s.update(1 / 120); }
        expect(r.shooter.solution?.target.kind).toBe(passing ? 'Pass' : 'Hub');
        expect(r.shooter.shotsFired, JSON.stringify(r.shooter.telemetry)).toBe(passing ? 8 : 0);
        expect(s.fuel.map(f => f.handle)).toEqual(handles);
        if (!passing) { r.chassis.body.setLinvel({ x: 0, y: 0, z: 0 }, true); run(s, 4); expect(r.shooter.shotsFired).toBe(8); }
      } finally { s.dispose(); }
    }
  });
  it('reduces moving-shot quality without degrading the same stationary launch profile', () => {
    const variance = (rating: number, speed: number) => {
      let state = 20261102;
      const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
      return Array.from({ length: 4000 }, () => sampleShotScatter(DEFAULT_SHOT_SPREAD, rating, speed, 0, random)).reduce((sum, s) => sum + s.yaw ** 2, 0);
    };
    expect(variance(.2, 0)).toBe(variance(.95, 0));
    expect(variance(.2, 1)).toBeGreaterThan(variance(.95, 1) * 3);
  });
});
