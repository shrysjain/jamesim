import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { FieldSimulation } from './FieldSimulation';
import { HUB_RETURN } from './HubSystem';
import { HUBS, HUB_MOUTH_Y, insideHubMouth } from '../field/hubs';
import { FUEL_MASS, FUEL_RADIUS } from './FuelSystem';
import { STORAGE_SLOTS } from './RobotSimulation';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { v3 } from './vector';
import type { CollisionAsset, Vec3 } from '../field/types';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -0.1, 0], halfExtents: [25, 0.1, 25] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
async function setup(initial: Vec3[], robot = false, asset = floor) {
  const s = await FieldSimulation.create(asset, initial, robot, true);
  s.fuel.forEach(b => b.wakeUp()); s.setRunning(true); return s;
}
function conserved(s: FieldSimulation) {
  const c = s.fuelSystem.counts;
  expect(c.loose + c.airborne + c.stored + c.transferring + c.feeding + c.hubTransit).toBe(c.total);
  expect(s.hubs.telemetry.inTransit).toBe(c.hubTransit);
  expect(new Set(s.fuelSystem.records.map(f => f.body.handle)).size).toBe(c.total);
  for (const f of s.fuelSystem.records) {
    expect(f.body.isEnabled()).toBe(f.owner === null);
    if (f.state === 'hubTransit') expect(f.owner?.startsWith('hub-')).toBe(true);
  }
  if (s.robot) expect(s.robot.body.mass()).toBeCloseTo(56 + s.robotController!.held.length * FUEL_MASS, 3);
}

describe('Jamesim hub entries and returns', () => {
  it('tests the hexagonal mouth with ball-radius clearance, including all six edges', () => {
    const hub = HUBS[0];
    expect(insideHubMouth(hub.center, hub, FUEL_RADIUS)).toBe(true);
    for (const angle of [Math.PI / 6, Math.PI / 2, Math.PI * 5 / 6, Math.PI * 7 / 6, Math.PI * 3 / 2, Math.PI * 11 / 6]) {
      expect(insideHubMouth(v3(hub.center.x + Math.cos(angle) * 0.44, HUB_MOUTH_Y, Math.sin(angle) * 0.44), hub, FUEL_RADIUS)).toBe(true);
      expect(insideHubMouth(v3(hub.center.x + Math.cos(angle) * 0.46, HUB_MOUTH_Y, Math.sin(angle) * 0.46), hub, FUEL_RADIUS)).toBe(false);
    }
    // This lies within the opening's bounding box but beyond a slanted side.
    expect(insideHubMouth(v3(hub.center.x + 0.5, HUB_MOUTH_Y, 0.3), hub, FUEL_RADIUS)).toBe(false);
  });

  it('counts both hubs once, preserves IDs through finite transit, and returns physical bodies', async () => {
    const s = await setup(HUBS.map(h => [h.center.x, 2.02, 0]));
    try {
      const handles = s.fuel.map(b => b.handle); run(s, 0.25);
      expect(s.hubs.telemetry.blue.hits).toBe(1); expect(s.hubs.telemetry.red.hits).toBe(1);
      expect(s.fuelSystem.counts.hubTransit).toBe(2); expect(s.hubs.telemetry.returned).toBe(0); conserved(s);
      const positions = s.fuelSystem.records.map(f => ({ ...f.local })); run(s, 0.1);
      expect(s.fuelSystem.records[0].local.y).toBeLessThan(positions[0].y);
      run(s, 1); expect(s.hubs.telemetry.returned).toBe(2); expect(s.fuelSystem.counts.loose).toBe(2);
      expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(s.hubs.telemetry.blue.hits).toBe(1); conserved(s);
      expect(s.fuel[0].translation().x).toBeLessThan(HUBS[0].center.x - 0.68);
      expect(s.fuel[1].translation().x).toBeGreaterThan(HUBS[1].center.x + 0.68);
    } finally { s.dispose(); }
  });

  it('rejects upward crossings, side entries below the lip, near misses and grazing edges', async () => {
    const x = HUBS[0].center.x;
    const s = await setup([[x, 1.65, 0], [x, 1.5, 0.8], [x + 0.65, 2, 0], [x, 2, 0.49]]);
    try {
      s.fuel[0].setLinvel(v3(0, 4, 0), true); s.fuel[1].setLinvel(v3(0, 0, -5), true);
      run(s, 0.22); expect(s.hubs.telemetry.blue.hits).toBe(0); expect(s.hubs.events).toHaveLength(0); conserved(s);
    } finally { s.dispose(); }
  });

  it('interpolates fast crossings rather than testing only the end position', async () => {
    const x = HUBS[0].center.x;
    const s = await setup([[x, 2, 0], [x + 0.9, 2, 0]]);
    try {
      s.fuel[0].setLinvel(v3(0, -80, 0), true);
      s.fuel[1].setLinvel(v3(-120, -80, 0), true);
      run(s, 1 / 120);
      expect(s.hubs.telemetry.blue.hits).toBe(1); expect(s.hubs.events[0].id).toBe(0);
      expect(s.fuelSystem.records[1].state).toBe('loose'); conserved(s);
    } finally { s.dispose(); }
  });

  it('retains queued IDs at blocked exits and releases after clearance without recounting', async () => {
    const hub = HUBS[0], s = await setup([[hub.center.x, 2, 0]]);
    try {
      const wall = s.world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 0.25, 0.8).setTranslation(hub.outlets[0].position.x, 0.895, 0));
      s.world.propagateModifiedBodyPositionsToColliders(); run(s, 2);
      expect(s.hubs.telemetry.blue).toMatchObject({ hits: 1, returned: 0, queued: 1, blocked: 4 }); conserved(s);
      s.world.removeCollider(wall, true); run(s, 0.25);
      expect(s.hubs.telemetry.blue).toMatchObject({ hits: 1, returned: 1, queued: 0 }); conserved(s);
    } finally { s.dispose(); }
  });

  it('limits outlet cadence and returns simultaneous entries without overlap or deletion', async () => {
    const hub = HUBS[0];
    const initial: Vec3[] = Array.from({ length: 8 }, (_, i) => [-5 - i * 0.16, 0.076, 3]);
    const s = await setup(initial);
    try {
      const drop = (ids: number[]) => {
        ids.forEach((id, i) => { s.fuel[id].setTranslation(v3(hub.center.x + (i % 2 ? 0.13 : -0.13), 1.92, i < 2 ? -0.15 : 0.15), true); s.fuel[id].setLinvel(v3(0, -3, 0), true); });
        s.world.propagateModifiedBodyPositionsToColliders();
      };
      drop([0, 1, 2, 3]); run(s, 0.1); drop([4, 5, 6, 7]); run(s, 0.1);
      expect(s.hubs.telemetry.blue.hits).toBe(8);
      const times: number[][] = [[], [], [], []];
      for (let i = 0; i < 200; i++) {
        const owners = s.fuelSystem.records.map(f => f.owner); run(s, 1 / 120);
        s.fuelSystem.records.forEach((f, id) => {
          if (!owners[id] || f.owner !== null) return;
          const z = f.body.translation().z, lane = hub.outlets.findIndex(o => Math.abs(o.position.z - z) < 1e-5);
          expect(lane).toBeGreaterThanOrEqual(0); times[lane].push(s.fuelSystem.time);
          s.world.intersectionsWithShape(f.body.translation(), f.body.rotation(), new RAPIER.Ball(FUEL_RADIUS * 0.99), other => { expect(other.parent()?.handle).toBe(f.body.handle); return true; });
        });
        conserved(s);
      }
      expect(s.hubs.telemetry.blue.returned).toBe(8);
      for (const lane of times) for (let i = 1; i < lane.length; i++) expect(lane[i] - lane[i - 1]).toBeGreaterThanOrEqual(HUB_RETURN.outletInterval - 1e-6);
    } finally { s.dispose(); }
  });

  it('freezes processing on pause, keeps hits on robot respawn, and resets the whole practice deterministically', async () => {
    const initial: Vec3[] = [[HUBS[0].center.x, 2, 0]], s = await setup(initial, true);
    try {
      const initialPose = { ...s.fuel[0].translation() };
      run(s, 0.25); expect(s.hubs.telemetry.blue.hits).toBe(1);
      s.setRunning(false); const age = s.fuelSystem.records[0].age, position = { ...s.fuelSystem.records[0].local };
      run(s, 2); expect(s.fuelSystem.records[0].age).toBe(age); expect(s.fuelSystem.records[0].local).toEqual(position);
      s.robotController!.respawn('practice'); expect(s.hubs.telemetry.blue.hits).toBe(1); expect(s.hubs.telemetry.inTransit).toBe(1);
      s.setRunning(true); run(s, 0.75); const first = { p: { ...s.fuel[0].translation() }, v: { ...s.fuel[0].linvel() } };
      s.reset(); expect(s.hubs.telemetry.blue.hits).toBe(0); expect(s.hubs.telemetry.inTransit).toBe(0);
      expect(s.fuel[0].translation()).toEqual(initialPose); expect(s.fuel[0].isEnabled()).toBe(true); conserved(s);
      s.fuel[0].wakeUp(); s.setRunning(true); run(s, 1);
      expect(s.fuel[0].translation()).toEqual(first.p); expect(s.fuel[0].linvel()).toEqual(first.v);
    } finally { s.dispose(); }
  });

  it('completes official-field shooting, returns, recollection and another hit using only the same balls', async () => {
    const asset = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
    const s = await setup(Array.from({ length: 4 }, (_, i) => [-6 - i * 0.16, 0.076, -3]), true, asset);
    try {
      const r = s.robotController!; r.chassis.teleport([6.1, 0.26, 2.1], Math.PI); run(s, 0.4);
      s.fuelSystem.records.forEach((f, i) => { s.fuelSystem.capture(f, r.owner, i, STORAGE_SLOTS[i]); f.state = 'stored'; f.local = { ...STORAGE_SLOTS[i] }; });
      r.input.shoot = true; run(s, 4);
      expect(r.shooter.shotsFired).toBe(4); expect(s.hubs.telemetry.blue.hits).toBe(4);
      expect(s.hubs.telemetry.blue.returned).toBe(4); conserved(s);
      r.clearInput(); run(s, 1);
      const ball = s.fuel[0].translation();
      // Hold the returned ball for a straight intake approach; its randomized
      // outlet can otherwise roll laterally out of this fixture's drive lane.
      s.fuel[0].setLinvel({ x: 0, y: 0, z: 0 }, true);
      s.fuel[0].setAngvel({ x: 0, y: 0, z: 0 }, true);
      r.chassis.teleport([ball.x - 1.6, 0.26, ball.z], Math.PI);
      r.input = { intake: true, reverse: false }; r.chassis.input = { ...NEUTRAL_INPUT, forward: -0.4 }; run(s, 1.3);
      expect(r.held.length).toBeGreaterThan(0); conserved(s);
      const recaptured = new Set(r.held.map(f => f.id));
      r.respawn('practice'); r.input.shoot = true; run(s, 4);
      expect(s.hubs.telemetry.blue.hits).toBeGreaterThan(4);
      expect(r.shooter.shots.some(e => recaptured.has(e.id) && e.time > 5)).toBe(true); conserved(s);
    } finally { s.dispose(); }
  });
});
