import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { HUBS } from '../field/hubs';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { v3 } from './vector';
import type { CollisionAsset } from '../field/types';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -0.1, 0], halfExtents: [25, 0.1, 25] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };

describe('timed match and shared physics integration', () => {
  it('waits for driver shooting in AUTO, then scores real shots with existing preload IDs on the full field', async () => {
    const asset = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
    const manifest = JSON.parse(readFileSync('public/assets/field-manifest.json', 'utf8'));
    const s = await FieldSimulation.create(asset, manifest.fuel, true);
    try {
      const handles = s.fuel.map(b => b.handle); s.startMatch(DEFAULT_MATCH);
      expect(s.robotController!.held).toHaveLength(8); expect(s.fuelSystem.counts.loose).toBe(496);
      expect(s.robot!.body.mass()).toBeCloseTo(57.72, 3);
      for (const f of s.robotController!.held) expect(Math.abs(f.local.x) + 0.075).toBeLessThan(0.4255);
      run(s, 1); expect(s.robotController!.shooter.shotsFired).toBe(0); expect(s.robotController!.held).toHaveLength(8);
      s.robotController!.input = { intake: false, reverse: false, shoot: true };
      run(s, 5);
      expect(s.robotController!.shooter.shotsFired).toBe(8);
      const { hits, processed, returned } = s.hubs.telemetry.blue;
      // Real launch scatter can miss. Match scoring still counts only the fuel
      // physically processed by the hub, never the number of requested shots.
      expect(hits).toBeGreaterThanOrEqual(6); expect(hits).toBeLessThanOrEqual(8);
      expect(processed).toBe(hits); expect(returned).toBe(processed); expect(s.match.telemetry.blue.auto).toBe(processed);
      expect(s.robot!.input.forward).toBe(0); expect(s.robot!.telemetry.speed).toBeLessThan(0.03);
      expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(s.fuelSystem.counts.loose).toBe(504);
    } finally { s.dispose(); }
  }, 30_000);

  it('accepts driver input during AUTO, disables scoring gaps, freezes on pause, and restarts the whole match', async () => {
    const s = await FieldSimulation.create(floor, [], true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, preloads: 0 });
      const startX = s.robot!.body.translation().x;
      s.robot!.input = { ...NEUTRAL_INPUT, forward: 1 }; run(s, 1);
      expect(s.robot!.body.translation().x - startX).toBeGreaterThan(2);
      s.setRunning(false); run(s, 2); expect(s.match.elapsed).toBe(1);
      s.setRunning(true); run(s, 19.1); expect(s.match.phase).toBe('Auto scoring'); expect(s.robotController!.actuatorsEnabled).toBe(false);
      s.robot!.input = { ...NEUTRAL_INPUT, forward: 1 }; run(s, 2.9); expect(s.match.phase).toBe('Transition'); expect(s.robot!.input.forward).toBe(0);
      s.robot!.input = { ...NEUTRAL_INPUT, forward: -0.5 }; run(s, 0.5); expect(s.robot!.telemetry.speed).toBeGreaterThan(0.3);
      s.match.endEarly(); s.robotController!.input.shoot = true; run(s, 3.1);
      expect(s.match.phase).toBe('Complete'); expect(s.running).toBe(false);
      const endedAt = s.match.elapsed; s.setRunning(true); run(s, 1); expect(s.match.elapsed).toBe(endedAt);
      s.restartMatch(); expect(s.match.phase).toBe('Auto'); expect(s.match.elapsed).toBe(0); expect(s.running).toBe(true);
      s.startPractice(); expect(s.match.phase).toBe('Practice'); expect(s.running).toBe(true);
    } finally { s.dispose(); }
  });

  it('processes a blocked return once, and permits a later new entry by the same ID to score again', async () => {
    const hub = HUBS[0], s = await FieldSimulation.create(floor, [[hub.center.x, 1.92, 0]], false, true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, preloads: 0 });
      const wall = s.world.createCollider(RAPIER.ColliderDesc.cuboid(0.2, 0.3, 0.9).setTranslation(hub.outlets[0].position.x, 0.87, 0));
      s.fuel[0].setLinvel(v3(0, -3, 0), true); s.world.propagateModifiedBodyPositionsToColliders(); run(s, 1.5);
      expect(s.hubs.telemetry.blue).toMatchObject({ hits: 1, processed: 1, returned: 0, queued: 1 }); expect(s.match.telemetry.blue.auto).toBe(1);
      s.world.removeCollider(wall, true); run(s, 0.5); expect(s.match.telemetry.blue.auto).toBe(1); expect(s.hubs.telemetry.blue.returned).toBe(1);
      s.fuel[0].setTranslation(v3(hub.center.x, 1.92, 0), true); s.fuel[0].setLinvel(v3(0, -3, 0), true);
      s.world.propagateModifiedBodyPositionsToColliders(); run(s, 0.5);
      expect(s.match.telemetry.blue.auto).toBe(2); expect(new Set(s.hubs.processedEvents.map(e => e.sequence)).size).toBe(2);
    } finally { s.dispose(); }
  });

  it('assesses the last auto processing tick before choosing hub order', async () => {
    const s = await FieldSimulation.create(floor, [[-5, 0.076, 0]], false, true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, preloads: 0, seed: 1000 }); run(s, 22 + 77 / 120);
      s.fuel[0].setTranslation(v3(HUBS[0].center.x, 1.84, 0), true); s.fuel[0].setLinvel(v3(0, -2, 0), true);
      s.world.propagateModifiedBodyPositionsToColliders(); run(s, 43 / 120);
      expect(s.match.elapsed).toBe(23); expect(s.match.telemetry.blue.auto).toBe(1);
      expect(s.match.telemetry.firstInactive).toBe('blue'); expect(s.match.telemetry.selectionReason).toBe('Auto fuel');
    } finally { s.dispose(); }
  });

  it('advances the same match ticks at different rendering rates', async () => {
    const a = await FieldSimulation.create(floor, []), b = await FieldSimulation.create(floor, []);
    try {
      for (const s of [a, b]) s.startMatch({ ...DEFAULT_MATCH, preloads: 0 });
      for (let i = 0; i < 600; i++) a.update(1 / 30);
      for (let i = 0; i < 1200; i++) b.update(1 / 60);
      expect(a.match.elapsed).toBe(20); expect(b.match.elapsed).toBe(20); expect(a.match.phase).toBe('Auto scoring');
    } finally { a.dispose(); b.dispose(); }
  });
});
