import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CollisionAsset, Vec3 } from '../../../field/types';
import { ALLIANCE_LINE } from '../../../field/targets';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import { NEUTRAL_INPUT } from '../../../sim/SwerveChassis';
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.ceil(seconds * 120); i++) s.update(1 / 120); };
async function setup(alliance: 'blue' | 'red', position: Vec3, robot: '6800-downpour' | '2910-reblitz' = '6800-downpour') {
  const s = await FieldSimulation.create(field, Array.from({ length: 8 }, (_, i): Vec3 => [0, .08, i * .16]), true);
  s.startSession({ ...DEFAULT_MATCH, robot, alliance, preloads: 8 }, true);
  s.robot!.teleport(position, alliance === 'blue' ? Math.PI : 0); run(s, .6); return s;
}
describe('Downpour real-field launch behavior', () => {
  for (const alliance of ['blue', 'red'] as const) it(`${alliance}: waits for motion to stop, then sends real fuel through the official hub mouth`, async () => {
    const sign = alliance === 'blue' ? 1 : -1, s = await setup(alliance, [sign * 6.5, .26, -1.6]);
    try {
      const r = s.robotController!, handles = s.fuel.map(b => b.handle);
      r.chassis.input = { ...NEUTRAL_INPUT, strafe: .18 }; r.input.shoot = true; run(s, 1);
      expect(r.shooter.shotsFired).toBe(0);
      r.chassis.input = { ...NEUTRAL_INPUT }; run(s, 8);
      expect(r.shooter.shotsFired).toBe(8); expect(s.hubs.telemetry[alliance].hits).toBeGreaterThan(0);
      expect(s.hubs.telemetry[alliance].processed).toBeGreaterThan(0);
      expect(s.fuel.map(b => b.handle)).toEqual(handles);
      expect(new Set(r.shooter.shots.map(e => e.id)).size).toBe(8);
      for (const event of r.shooter.shots) expect(event.target.kind).toBe('Hub');
    } finally { s.dispose(); }
  });
  it.each(['6800-downpour', '2910-reblitz'] as const)('%s: turns from the 180-degree tie and physically passes without replacing bodies', async robot => {
    const s = await setup('blue', [0, .26, 1.5], robot);
    try {
      const r = s.robotController!, handles = s.fuel.map(b => b.handle); r.input.shoot = true; run(s, 7);
      expect(r.shooter.shotsFired, JSON.stringify({ shooter: r.shooter.telemetry, pose: r.chassis.pose, position: r.chassis.body.translation() })).toBe(8);
      for (const event of r.shooter.shots) expect(event.target.kind).toBe('Pass');
      expect(s.fuel.filter(b => b.translation().x > ALLIANCE_LINE).length).toBeGreaterThanOrEqual(4);
      expect(s.fuel.map(b => b.handle)).toEqual(handles);
    } finally { s.dispose(); }
  });
});
