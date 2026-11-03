import { describe, expect, it } from 'vitest';
import type { RobotId } from '../registry';
import { ROBOTS } from '../registry';
import { FieldSimulation } from '../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../sim/MatchRules';
import type { CollisionAsset, Vec3 } from '../../field/types';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [25, .1, 25] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.ceil(seconds * 120); i++) s.update(1 / 120); };
/** Shared robot smoke acceptance. Team-specific field/shot/climb cases belong beside the robot. */
export function robotAcceptance(id: RobotId) {
  describe(`${id}: shared robot acceptance`, () => {
    for (const alliance of ['blue', 'red'] as const) it(`${alliance}: preload, collect, reverse, fire, pause and restart preserve fuel bodies and definition data`, async () => {
      const definition = ROBOTS[id], before = JSON.stringify(definition), count = Math.min(8, definition.mechanisms.capacity);
      const seeds: Vec3[] = Array.from({ length: count + 1 }, (_, i) => [0, .08, i * .16]);
      const s = await FieldSimulation.create(floor, seeds, true);
      try {
        const config = { ...DEFAULT_MATCH, robot: id, alliance, preloads: count };
        s.startSession(config, true); run(s, .6);
        const r = s.robotController!, handles = s.fuel.map(b => b.handle);
        expect(r.held).toHaveLength(count);
        expect(r.chassis.body.mass()).toBeGreaterThan(definition.mass);
        expect(r.chassis.telemetry.grounded).toBe(4);
        const extra = s.fuelSystem.records.find(f => f.owner === null)!;
        const pickup = definition.pickup;
        extra.body.setTranslation(r.toWorld({ x: (pickup.minX + pickup.maxX) / 2, y: -.147, z: 0 }), true);
        extra.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        s.world.propagateModifiedBodyPositionsToColliders();
        r.input.intake = true; run(s, .5);
        if (count < r.capacity) expect(extra.owner).toBe(r.owner);
        r.input.intake = false; r.input.reverse = true; run(s, 1);
        expect(r.held.length).toBeLessThan(count);
        s.startSession(config, true);
        // Exercise feeding at a known shooting range, independent of legal match-start placement.
        const sign = alliance === 'blue' ? 1 : -1;
        r.chassis.teleport([sign * 6.1, .26, sign * 2.1], sign === 1 ? 0 : Math.PI); run(s, .6);
        const owned = r.held.map(f => f.id).sort();
        r.input.shoot = true; run(s, 6 + count / Math.min(20, definition.mechanisms.fireRate));
        expect(r.shooter.shotsFired).toBe(count);
        expect(r.shooter.shots.map(shot => shot.id).sort()).toEqual(owned);
        const time = s.fuelSystem.time, position = { ...r.chassis.body.translation() };
        s.setRunning(false); run(s, .5);
        expect(s.fuelSystem.time).toBe(time); expect(r.chassis.body.translation()).toEqual(position);
        s.startSession(config, true);
        expect(r.held).toHaveLength(count); expect(r.shooter.shotsFired).toBe(0);
        expect(s.fuel.map(b => b.handle)).toEqual(handles);
        expect(new Set(s.fuelSystem.records.map(f => f.id)).size).toBe(seeds.length);
        expect(JSON.stringify(definition)).toBe(before);
      } finally { s.dispose(); }
    });
  });
}
