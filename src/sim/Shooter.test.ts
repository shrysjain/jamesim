import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { FieldSimulation } from './FieldSimulation';
import { STORAGE_SLOTS } from './RobotSimulation';
import { FUEL_MASS } from './FuelSystem';
import { SHOOTER, flightPosition } from './Shooter';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { ALLIANCE_LINE, shotTarget } from '../field/targets';
import { v3 } from './vector';
import type { CollisionAsset, Vec3 } from '../field/types';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -0.1, 0], halfExtents: [25, 0.1, 25] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
async function setup(count = 8, asset = floor, position: Vec3 = [6.1, 0.26, 2.1], yaw = 0) {
  const s = await FieldSimulation.create(asset, Array.from({ length: count }, (_, i) => [-6 - i * 0.155, 0.076, -3]), true);
  s.robot!.teleport(position, yaw); s.setRunning(true); run(s, 0.4);
  const r = s.robotController!;
  s.fuelSystem.records.forEach((f, i) => { s.fuelSystem.capture(f, r.owner, i, STORAGE_SLOTS[i]); f.state = 'stored'; f.local = { ...STORAGE_SLOTS[i] }; });
  return s;
}
function conserved(s: FieldSimulation) {
  const c = s.fuelSystem.counts;
  expect(c.loose + c.airborne + c.stored + c.transferring + c.feeding + c.hubTransit).toBe(c.total);
  for (const f of s.fuelSystem.records) {
    expect(f.body.isEnabled()).toBe(f.owner === null);
    expect(['loose', 'airborne'].includes(f.state)).toBe(f.owner === null);
  }
  expect(s.robot!.body.mass()).toBeCloseTo(56 + s.robotController!.held.length * FUEL_MASS, 3);
}

describe('Jamesim shooter bench', () => {
  it('uses the official alliance line and nearest inset pass point for either alliance', () => {
    expect(ALLIANCE_LINE).toBeCloseTo(4.2418, 4);
    for (const sign of [-1, 1]) {
      const alliance = sign === 1 ? 'blue' : 'red';
      expect(shotTarget(v3(sign * ALLIANCE_LINE, 0, 1), alliance).kind).toBe('Hub');
      const pass = shotTarget(v3(sign * (ALLIANCE_LINE - 0.001), 0, 1.5), alliance);
      expect(pass.kind).toBe('Pass'); expect(pass.position.x * sign).toBeCloseTo(ALLIANCE_LINE + 0.45);
      expect(pass.position.z).toBe(1.5);
      expect(Math.abs(shotTarget(v3(0, 0, 8), alliance).position.z)).toBeLessThan(4);
    }
  });

  it('predicts free physical fuel flight with the existing damping and gravity', async () => {
    const s = await FieldSimulation.create(floor, [[0, 2, 0]]);
    try {
      const p = v3(0, 2, 0), velocity = v3(8, 8, -2);
      s.fuel[0].setLinvel(velocity, true); s.setRunning(true); run(s, 1.2);
      const predicted = flightPosition(p, velocity, 1.2), actual = s.fuel[0].translation();
      expect(Math.hypot(predicted.x - actual.x, predicted.y - actual.y, predicted.z - actual.z)).toBeLessThan(0.06);
    } finally { s.dispose(); }
  });

  it('physically turns from facing away, waits for readiness, and launches all four lanes with the same IDs', async () => {
    const s = await setup(4);
    try {
      const r = s.robotController!, shooter = r.shooter, handles = s.fuel.map(b => b.handle);
      r.input.shoot = true; run(s, 0.1);
      expect(shooter.shotsFired).toBe(0); expect(shooter.rpm).toBeGreaterThan(0);
      expect(Math.abs(s.robot!.telemetry.heading)).toBeLessThan(0.4);
      run(s, 3);
      expect(shooter.shotsFired).toBe(4); expect(new Set(shooter.shots.map(e => e.lane)).size).toBe(4);
      expect(shooter.shots[0].time).toBeGreaterThan(1);
      expect(new Set(shooter.shots.map(e => e.id)).size).toBe(4);
      expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(r.held).toHaveLength(0); conserved(s);
      // Releasing aim returns yaw to the driver's command, without persisting the assist's override.
      r.input.shoot = false; s.robot!.input = { ...NEUTRAL_INPUT, turn: 0.5 }; run(s, 0.4);
      expect(s.robot!.telemetry.turnRate).toBeGreaterThan(0.8);
    } finally { s.dispose(); }
  });

  it('feeds a full hopper at a bounded rate with recovery, payload removal and no replacement ammunition', async () => {
    const s = await setup(STORAGE_SLOTS.length, floor, [6.1, 0.26, 2.1], Math.PI);
    try {
      const r = s.robotController!; r.input.shoot = true;
      let lowestAfterShot = Infinity;
      for (let i = 0; i < 600; i++) { const before = r.shooter.shotsFired; run(s, 1 / 120); if (r.shooter.shotsFired > before) lowestAfterShot = Math.min(lowestAfterShot, r.shooter.rpm); }
      expect(r.shooter.shotsFired).toBe(STORAGE_SLOTS.length); expect(r.held).toHaveLength(0); expect(lowestAfterShot).toBeGreaterThan(0);
      for (let lane = 0; lane < 4; lane++) {
        const events = r.shooter.shots.filter(e => e.lane === lane);
        for (let i = 1; i < events.length; i++) expect(events[i].time - events[i - 1].time).toBeGreaterThanOrEqual(SHOOTER.laneInterval - 1e-6);
      }
      const intervals = r.shooter.shots.slice(1).map((e, i) => e.time - r.shooter.shots[i].time);
      expect(Math.min(...intervals)).toBeGreaterThanOrEqual(1 / 120);
      expect(new Set(intervals.map(t => Math.round(t * 120))).size).toBeGreaterThan(2);
      const rate = (r.shooter.shots.length - 1) / (r.shooter.shots.at(-1)!.time - r.shooter.shots[0].time);
      expect(rate).toBeGreaterThan(28); expect(rate).toBeLessThan(33);
      expect(r.shooter.shots.at(-1)!.time - r.shooter.shots[0].time).toBeGreaterThan(0.85); conserved(s);
    } finally { s.dispose(); }
  });

  it('cancels pending feeds on release, freezes on pause, and gives reverse priority over Space', async () => {
    const s = await setup(4, floor, [6.1, 0.26, 2.1], Math.PI);
    try {
      const r = s.robotController!; r.input.shoot = true;
      for (let i = 0; i < 300 && !s.fuelSystem.counts.feeding; i++) run(s, 1 / 120);
      expect(s.fuelSystem.counts.feeding).toBeGreaterThan(0); expect(r.shooter.shotsFired).toBe(0);
      s.setRunning(false); const rpm = r.shooter.rpm, fuel = r.held.map(f => ({ ...f.local })); run(s, 1);
      expect(r.shooter.rpm).toBe(rpm); expect(r.held.map(f => f.local)).toEqual(fuel);
      s.setRunning(true); run(s, 0.3); expect(r.shooter.shotsFired).toBe(0); expect(s.fuelSystem.counts.feeding).toBe(0);
      r.input = { intake: true, reverse: true, shoot: true }; run(s, 1.5);
      expect(r.shooter.shotsFired).toBe(0); expect(r.held).toHaveLength(0); conserved(s);
      const shots = r.shooter.shotsFired; r.input = { intake: false, reverse: false, shoot: true }; run(s, 1);
      expect(r.shooter.shotsFired).toBe(shots); expect(r.shooter.telemetry.mode).toBe('Empty');
      s.robot!.input = { ...NEUTRAL_INPUT, turn: 0.5 }; run(s, 0.4);
      expect(s.robot!.telemetry.turnRate).toBeGreaterThan(0.8);
      expect(r.shooter.telemetry.mode).toBe('Empty');
      s.reset(); expect(r.shooter.rpm).toBe(0); expect(r.shooter.shotsFired).toBe(0); conserved(s);
    } finally { s.dispose(); }
  });

  it('retains feeding IDs at a blocked muzzle and releases them only after clearance', async () => {
    const s = await setup(4, floor, [6.1, 0.26, 2.1], Math.PI);
    try {
      const r = s.robotController!; r.input.shoot = true;
      for (let i = 0; i < 300 && !s.fuelSystem.counts.feeding; i++) run(s, 1 / 120);
      const muzzle = r.shooter.muzzle();
      const wall = s.world.createCollider(RAPIER.ColliderDesc.cuboid(0.25, 0.25, 0.5).setTranslation(muzzle.x, muzzle.y, muzzle.z).setCollisionGroups(0x00100002));
      s.world.propagateModifiedBodyPositionsToColliders(); run(s, 0.5);
      expect(r.shooter.shotsFired).toBe(0); expect(r.shooter.telemetry.mode).toBe('Blocked'); expect(r.held).toHaveLength(4); conserved(s);
      s.world.removeCollider(wall, true); run(s, 1); expect(r.shooter.shotsFired).toBe(4); conserved(s);
    } finally { s.dispose(); }
  });

  it('waits for driving to stop and keeps subsequent real shots inside the official hub mouth', async () => {
    const asset = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
    for (const moving of [false, true]) {
      const s = await setup(4, asset, [6.5, 0.26, -1.6], Math.PI);
      try {
        const r = s.robotController!; r.input.shoot = true;
        if (moving) s.robot!.input = { ...NEUTRAL_INPUT, strafe: 0.18 };
        const crossings = new Map<number, number>();
        for (let i = 0; i < 480; i++) {
          if (moving && i === 120) { expect(r.shooter.shotsFired).toBe(0); s.robot!.input = { ...NEUTRAL_INPUT }; }
          const previous = s.fuel.map(b => ({ ...b.translation() })); run(s, 1 / 120);
          for (const event of r.shooter.shots) {
            const before = previous[event.id], after = s.fuel[event.id].translation(), y = event.target.position.y;
            if (before.y > y && after.y <= y && !crossings.has(event.id)) {
              const t = (y - before.y) / (after.y - before.y);
              crossings.set(event.id, Math.hypot(before.x + (after.x - before.x) * t - event.target.position.x, before.z + (after.z - before.z) * t));
            }
          }
        }
        expect(r.shooter.shotsFired, `moving=${moving}`).toBe(4); expect(crossings.size).toBe(4);
        for (const miss of crossings.values()) expect(miss, `moving=${moving}`).toBeLessThan(0.37);
        conserved(s);
      } finally { s.dispose(); }
    }
  });

  it('passes physically to the closest blue-zone floor point and changes aim mode across the line', async () => {
    const s = await setup(4, floor, [0, 0.26, 1.5], 0);
    try {
      const r = s.robotController!; r.input.shoot = true; run(s, 3.5);
      expect(r.shooter.shotsFired).toBe(4);
      for (const event of r.shooter.shots) {
        expect(event.target.kind).toBe('Pass'); expect(event.target.position.z).toBeCloseTo(1.5, 1);
        const predicted = flightPosition(event.position, event.velocity, event.flightTime);
        expect(Math.hypot(predicted.x - event.target.position.x, predicted.z - event.target.position.z)).toBeLessThan(0.3);
        expect(s.fuel[event.id].translation().x).toBeGreaterThan(ALLIANCE_LINE);
      }
      r.respawn('practice'); r.input.shoot = true; run(s, 1 / 120); expect(r.shooter.telemetry.target).toBe('Hub'); conserved(s);
    } finally { s.dispose(); }
  });

  it('retains fuel when the nearest alliance-zone pass exceeds the 33-foot reach', async () => {
    const s = await setup(1, floor, [-6.2, 0.26, 1.5]);
    try {
      s.robotController!.input.shoot = true; run(s, 0.5);
      expect(s.robotController!.shooter.telemetry.mode).toBe('Out of range');
      expect(s.robotController!.shooter.shotsFired).toBe(0); expect(s.robotController!.held).toHaveLength(1); conserved(s);
    } finally { s.dispose(); }
  });

  it('blocks launches under the official trench roof and retains cargo through a robot respawn', async () => {
    const asset = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
    const s = await setup(4, asset, [3.4, 0.26, 3.35], 0);
    try {
      const r = s.robotController!; r.input.shoot = true; run(s, 2);
      expect(r.shooter.shotsFired).toBe(0); expect(r.held).toHaveLength(4); conserved(s);
      r.respawn('practice'); expect(r.held).toHaveLength(4); expect(r.shooter.rpm).toBe(0);
      r.input.shoot = true; run(s, 3); expect(r.shooter.shotsFired).toBe(4); conserved(s);
    } finally { s.dispose(); }
  });

  it('lofts central passes over the official hub net into the blue zone', async () => {
    const asset = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
    const s = await setup(4, asset, [0, 0.26, 0], 0);
    try {
      const r = s.robotController!; r.input.shoot = true;
      const landings = new Map<number, number>();
      for (let i = 0; i < 600; i++) {
        run(s, 1 / 120);
        for (const event of r.shooter.shots) {
          const p = s.fuel[event.id].translation();
          if (p.y < 0.1 && !landings.has(event.id)) landings.set(event.id, p.x);
        }
      }
      expect(r.shooter.shotsFired).toBe(4); expect(landings.size).toBe(4);
      for (const x of landings.values()) expect(x).toBeGreaterThan(ALLIANCE_LINE);
      conserved(s);
    } finally { s.dispose(); }
  });
});
