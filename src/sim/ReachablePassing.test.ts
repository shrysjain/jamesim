import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { RobotSimulation } from './RobotSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { REBLITZ } from '../robot/registry';
import { ALLIANCE_LINE } from '../field/targets';
import type { CollisionAsset } from '../field/types';
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };

const cases = (['blue', 'red'] as const).flatMap(alliance => [false, true].map(facingAway => ({ alliance, facingAway })));
it.each(cases)('$alliance physically passes original fuel from the opposing zone with facingAway=$facingAway', async ({ alliance, facingAway }) => {
  const sign = alliance === 'blue' ? 1 : -1, sourceX = -sign * 6.2, z = sign * 1.65;
  const s = await FieldSimulation.create(field, [[0, .08, 3], [.2, .08, 3]], true);
  try {
    s.startSession({ ...DEFAULT_MATCH, alliance, preloads: 2 }, true);
    const r = s.robotController!, handles = s.fuel.map(b => b.handle);
    r.chassis.teleport([sourceX, .26, z], (sign === 1 ? 0 : Math.PI) + (facingAway ? Math.PI : 0)); run(s, .6);
    r.input.shoot = true; run(s, 5);
    expect(r.shooter.shotsFired, JSON.stringify(r.shooter.telemetry)).toBe(2);
    expect(r.held).toHaveLength(0);
    for (const shot of r.shooter.shots) {
      expect(shot.target.kind).toBe('Pass'); expect((shot.target.position.x - sourceX) * sign).toBeGreaterThan(1);
      expect(shot.target.position.x * sign).toBeLessThan(ALLIANCE_LINE);
      expect(Math.hypot(shot.target.position.x - sourceX, shot.target.position.z - z)).toBeLessThanOrEqual(33 * .3048);
      expect(shot.velocity.x * sign).toBeGreaterThan(0);
    }
    expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(s.fuelSystem.records).toHaveLength(2);
    expect(s.fuelSystem.records.every(f => f.owner === null && f.body.isEnabled())).toBe(true);
  } finally { s.dispose(); }
}, 30000);

it('does not mirror a short-range pass target across midfield', async () => {
  const s = await FieldSimulation.create(field, [], false);
  try {
    s.robotController = new RobotSimulation(s.world, s.fuelSystem, s.colliderElements,
      { ...REBLITZ, shooterGeometry: { ...REBLITZ.shooterGeometry, passRange: 3 } });
    s.startSession({ ...DEFAULT_MATCH, preloads: 0 }, true);
    s.robot!.teleport([-7.5, .26, 1.65]); run(s, .6);
    const solution = s.robotController.shooter.solve();
    expect(solution).not.toBeNull(); expect(solution!.target.kind).toBe('Pass');
    expect(solution!.target.position.x).toBeLessThan(0);
    expect(Math.hypot(solution!.target.position.x - s.robot!.body.translation().x,
      solution!.target.position.z - s.robot!.body.translation().z)).toBeLessThanOrEqual(3);
  } finally { s.dispose(); }
});
