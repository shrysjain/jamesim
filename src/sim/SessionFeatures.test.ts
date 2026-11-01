import { describe, expect, it } from 'vitest';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH, MatchRules } from './MatchRules';
import type { CollisionAsset } from '../field/types';
const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [25, .1, 25] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
describe('session extensions', () => {
  it('switches robot bodies while retaining every fuel ID and restarts red configuration', async () => {
    const s = await FieldSimulation.create(floor, Array.from({ length: 30 }, (_, i) => [0, .08, i * .16]), true);
    try {
      const handles = s.fuel.map(f => f.handle);
      s.startMatch({ ...DEFAULT_MATCH, robot: '4414-high-tide', alliance: 'red', spawn: 'left', preloads: 4 });
      expect(s.robotController!.capacity).toBe(24); expect(s.robotController!.held.length).toBe(4);
      expect(s.robotController!.shooter.alliance).toBe('red'); expect(s.robot!.body.translation().x).toBeLessThan(0);
      run(s, .5); s.restartMatch(); expect(s.match.elapsed).toBe(0); expect(s.robotController!.held.length).toBe(4);
      s.startMatch(DEFAULT_MATCH); expect(s.robot!.definition.id).toBe('2910-reblitz'); expect(s.fuel.map(f => f.handle)).toEqual(handles);
    } finally { s.dispose(); }
  });
  it('attaches only a capable robot near its own tower, holds support, lowers and resets', async () => {
    const s = await FieldSimulation.create(floor, [], true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: 'tower-trainer', preloads: 0 });
      s.robot!.teleport([6.7, .26, -.288925]); run(s, 1);
      s.robotController!.input.climb = true; run(s, 5);
      expect(s.robotController!.climber.attached).toBe(true);
      s.robotController!.input.climb = false; run(s, .5); expect(s.robotController!.climber.level).toBe(3);
      const y = s.robot!.body.translation().y; run(s, .5); expect(s.robot!.body.translation().y).toBeCloseTo(y, 2);
      s.robotController!.input.lower = true; run(s, 6); expect(s.robotController!.climber.attached).toBe(false);
      s.restartMatch(); expect(s.robotController!.climber.attached).toBe(false);
    } finally { s.dispose(); }
  });
  it('aims and fires the single turret lane without turning the chassis', async () => {
    const s = await FieldSimulation.create(floor, Array.from({ length: 8 }, (_, i) => [0, .08, i * .16]), true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: '4414-high-tide' }); run(s, 1);
      const yaw = s.robot!.telemetry.heading;
      s.robotController!.input.shoot = true; run(s, 8);
      expect(s.robotController!.shooter.shotsFired).toBe(8);
      expect(s.robotController!.shooter.shots.every(shot => shot.lane === 0)).toBe(true);
      expect(s.robot!.telemetry.heading).toBeCloseTo(yaw, 1);
    } finally { s.dispose(); }
  });

  it('draws finite human stock from existing fuel and preserves supply on release', async () => {
    const s = await FieldSimulation.create(floor, Array.from({ length: 40 }, (_, i) => [0, .08, i * .16]), true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, preloads: 0, humanSupply: true });
      expect(s.fuelSystem.ownedBy('human-blue')).toHaveLength(12);
      s.robotController!.input.supply = true; run(s, 2);
      expect(s.humanPlayer.delivered).toBeGreaterThan(0);
      expect(s.fuelSystem.records).toHaveLength(40);
      s.restartMatch(); expect(s.humanPlayer.delivered).toBe(0); expect(s.fuelSystem.ownedBy('human-blue')).toHaveLength(12);
    } finally { s.dispose(); }
  });
  it('keeps fuel targets independent of tower and penalty points', () => {
    const m = new MatchRules(); m.start(DEFAULT_MATCH); m.assessTower('blue', 1, 'auto'); m.assessTower('blue', 3, 'teleop'); m.recordPenalty('red', true);
    expect(m.telemetry.blue).toMatchObject({ total: 60, autoTower: 15, teleopTower: 30, penalties: 15, energized: false, traversal: false, bonusRP: 0 });
  });
});
