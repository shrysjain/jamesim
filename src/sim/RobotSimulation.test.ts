import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { FieldSimulation } from './FieldSimulation';
import { INTAKE, STORAGE_SLOTS } from './RobotSimulation';
import { FUEL_MASS, FUEL_RADIUS } from './FuelSystem';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { CollisionGroups } from './collisionGroups';
import type { CollisionAsset, Vec3 } from '../field/types';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -0.1, 0], halfExtents: [25, 0.1, 25] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
async function setup(count = 8, asset = floor) {
  const initial: Vec3[] = Array.from({ length: count }, (_, i) => [-4 - i * 0.155, 0.0755, 2]);
  const sim = await FieldSimulation.create(asset, initial, true);
  sim.robot!.teleport([0, 0.26, 0], 0); sim.setRunning(true); run(sim, 0.4);
  return sim;
}
function placeAtMouth(s: FieldSimulation, ids: number[]) {
  ids.forEach((id, i) => {
    const p = s.robotController!.toWorld({ x: -0.71, y: -0.147, z: [-0.2286, -0.0762, 0.0762, 0.2286][i % 4] });
    const b = s.fuel[id]; b.setTranslation(p, true); b.setLinvel({ x: 0, y: 0, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true);
  });
  s.world.propagateModifiedBodyPositionsToColliders();
}
function deploy(s: FieldSimulation) { s.robotController!.input = { intake: true, reverse: false }; run(s, 0.7); }
function fill(s: FieldSimulation, count: number) {
  deploy(s);
  for (let i = 0; i < count; i += 4) { placeAtMouth(s, Array.from({ length: Math.min(4, count - i) }, (_, j) => i + j)); run(s, 0.3); }
  run(s, 0.35);
}
function conserved(s: FieldSimulation) {
  const all = s.fuelSystem.records, c = s.fuelSystem.counts;
  expect(c.loose + c.stored + c.transferring).toBe(c.total);
  expect(new Set(all.map(f => f.body.handle)).size).toBe(all.length);
  for (const f of all) {
    expect(f.body.isEnabled()).toBe(f.state === 'loose');
    expect(f.owner === null).toBe(f.state === 'loose');
  }
  const held = s.robotController!.held;
  expect(new Set(held.map(f => f.slot)).size).toBe(held.length);
  expect(s.robot!.body.mass()).toBeCloseTo(56 + held.length * FUEL_MASS, 3);
}

describe('Jamesim intake, storage and reverse', () => {
  it('starts retracted and passively deploys both assemblies without running the rollers', async () => {
    const s = await setup();
    try {
      s.reset(); s.robot!.teleport([0, 0.26, 0]);
      expect(s.robotController!.held).toHaveLength(0); expect(s.robot!.pose.intake).toBe(0); expect(s.robot!.pose.hopper).toBe(0);
      s.setRunning(true); run(s, 0.05); expect(s.robotController!.rollerAngle).toBe(0);
      expect(s.robot!.pose.intake).toBeGreaterThan(0); expect(s.robot!.pose.intake).toBeLessThan(0.5);
      expect(s.robot!.pose.hopper).toBe(s.robot!.pose.intake);
      s.robotController!.input.intake = true; run(s, 0.6); placeAtMouth(s, [0, 1, 2, 3]); run(s, 0.05);
      expect(s.robotController!.held.length).toBeGreaterThan(0);
      expect(s.fuelSystem.counts.transferring).toBeGreaterThan(0);
      run(s, 0.6); expect(s.robotController!.held).toHaveLength(4);
      expect(s.fuelSystem.counts.stored).toBe(4); conserved(s);
      s.robotController!.input.intake = false; const roller = s.robotController!.rollerAngle; run(s, 0.5);
      expect(s.robot!.pose.intake).toBe(1); expect(s.robot!.pose.hopper).toBe(1);
      expect(s.robotController!.rollerAngle).toBe(roller);
      placeAtMouth(s, [4]); run(s, 0.2); expect(s.fuelSystem.records[4].state).toBe('loose');
      expect(s.robotController!.held.map(f => f.id).sort()).toEqual([0, 1, 2, 3]);
    } finally { s.dispose(); }
  });

  it('compresses only the intake as cargo space permits and pops out again without Shift', async () => {
    const s = await setup(INTAKE.capacity);
    try {
      fill(s, INTAKE.capacity); s.robotController!.input = { intake: false, reverse: false, shoot: true };
      let compressedWithCargo = false, lastCount = INTAKE.capacity;
      for (let i = 0; i < 720; i++) {
        run(s, 1 / 120);
        const r = s.robotController!, extension = s.robot!.pose.intake;
        expect(s.robot!.pose.hopper).toBe(1);
        if (r.held.length === INTAKE.capacity) expect(extension).toBe(1);
        if (extension < 0.9 && r.held.length > 0) compressedWithCargo = true;
        expect(r.held.length).toBeLessThanOrEqual(lastCount); lastCount = r.held.length;
      }
      expect(compressedWithCargo).toBe(true); expect(s.robotController!.held).toHaveLength(0);
      expect(s.robot!.pose.intake).toBe(0); expect(s.robot!.pose.hopper).toBe(1);
      s.robotController!.clearInput(); run(s, 0.25);
      expect(s.robot!.pose.intake).toBe(1); expect(s.robot!.pose.hopper).toBe(1);
    } finally { s.dispose(); }
  });

  it('captures only when running, deployed, in reach, and with a valid approach', async () => {
    const s = await setup();
    try {
      placeAtMouth(s, [0]); run(s, 0.1); expect(s.robotController!.held).toHaveLength(0);
      deploy(s);
      const b = s.fuel[1]; b.setTranslation(s.robotController!.toWorld({ x: -0.72, y: -0.147, z: 0 }), true);
      b.setLinvel({ x: -3, y: 0, z: 0 }, true);
      const side = s.fuel[2]; side.setTranslation(s.robotController!.toWorld({ x: -0.7, y: -0.147, z: 0.5 }), true);
      const high = s.fuel[3]; high.setTranslation(s.robotController!.toWorld({ x: -0.7, y: 0.4, z: 0 }), true);
      run(s, 0.05);
      for (const id of [1, 2, 3]) expect(s.fuelSystem.records[id].state).toBe('loose');
      s.setRunning(false); const before = s.fuelSystem.time; s.robotController!.input.intake = true; run(s, 1);
      expect(s.fuelSystem.time).toBe(before); conserved(s);
    } finally { s.dispose(); }
  });

  it('enforces capacity and non-overlapping visible slots without consuming extra ammunition', async () => {
    const s = await setup(INTAKE.capacity + 4);
    try {
      fill(s, INTAKE.capacity); expect(s.robotController!.held).toHaveLength(INTAKE.capacity);
      placeAtMouth(s, [INTAKE.capacity, INTAKE.capacity + 1]); run(s, 0.5);
      expect(s.robotController!.held).toHaveLength(INTAKE.capacity); expect(s.robotController!.telemetry.mode).toBe('Full');
      expect(s.fuelSystem.records[INTAKE.capacity].state).toBe('loose'); conserved(s);
      for (let i = 0; i < STORAGE_SLOTS.length; i++) {
        const a = STORAGE_SLOTS[i]; expect(a.y + FUEL_RADIUS).toBeLessThan(0.3295); expect(Math.abs(a.z) + FUEL_RADIUS).toBeLessThan(0.349);
        for (const b of STORAGE_SLOTS.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThanOrEqual(FUEL_RADIUS * 2);
      }
    } finally { s.dispose(); }
  });

  it('reverses with priority over intake, reuses bodies, and removes payload mass exactly once', async () => {
    const s = await setup();
    try {
      fill(s, 4); expect(s.robotController!.held).toHaveLength(4);
      const handles = s.fuel.map(b => b.handle);
      s.robotController!.input = { intake: true, reverse: true }; run(s, 1);
      expect(s.robotController!.held).toHaveLength(0);
      expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(s.fuel[0].translation().x).toBeLessThan(s.robot!.body.translation().x - 0.7);
      conserved(s);
    } finally { s.dispose(); }
  });

  it('reverse rollers push loose reachable fuel outward without capturing it', async () => {
    const s = await setup();
    try {
      s.robotController!.input = { intake: false, reverse: true }; run(s, 0.7);
      placeAtMouth(s, [0]); const before = s.fuel[0].translation().x; run(s, 0.2);
      expect(s.robotController!.held).toHaveLength(0);
      expect(s.fuel[0].translation().x).toBeLessThan(before - 0.08); conserved(s);
    } finally { s.dispose(); }
  });

  it('does not capture through a barrier or eject into one; blocked fuel stays owned until clear', async () => {
    const s = await setup();
    try {
      fill(s, 1); expect(s.robotController!.held).toHaveLength(1);
      const wall = s.world.createCollider(RAPIER.ColliderDesc.cuboid(0.005, 0.25, 0.5).setTranslation(-0.68, 0.25, 0).setCollisionGroups(CollisionGroups.field));
      s.colliderElements.set(wall.handle, 'test-wall');
      s.fuel[1].setTranslation({ x: -0.77, y: 0.0755, z: 0 }, true); s.fuel[1].setLinvel({ x: 0, y: 0, z: 0 }, true);
      run(s, 0.3); expect(s.fuelSystem.records[1].state).toBe('loose');
      s.robotController!.input = { intake: false, reverse: true }; run(s, 0.4);
      expect(s.robotController!.held).toHaveLength(1); expect(s.robotController!.telemetry.mode).toBe('Outlet blocked'); conserved(s);
      s.colliderElements.delete(wall.handle); s.world.removeCollider(wall, true); run(s, 0.5);
      expect(s.robotController!.held).toHaveLength(0); conserved(s);
    } finally { s.dispose(); }
  });

  it('pauses transfer, retains held IDs on robot respawn, and restores initial loose fuel on world reset', async () => {
    const s = await setup();
    try {
      deploy(s); placeAtMouth(s, [0, 1, 2, 3]); run(s, 0.05);
      expect(s.fuelSystem.counts.transferring).toBeGreaterThan(0);
      const ids = s.robotController!.held.map(f => f.id); s.setRunning(false);
      const before = s.robotController!.held.map(f => [f.age, { ...f.local }]); run(s, 3);
      expect(s.robotController!.held.map(f => [f.age, f.local])).toEqual(before);
      s.robotController!.respawn('practice'); expect(s.robotController!.held.map(f => f.id)).toEqual(ids); conserved(s);
      s.reset(); expect(s.robotController!.held).toHaveLength(0); expect(s.robot!.pose.intake).toBe(0); expect(s.robot!.pose.hopper).toBe(0);
      s.fuel.forEach((b, i) => { expect(b.translation().x).toBeCloseTo(-4 - i * 0.155); expect(b.isEnabled()).toBe(true); }); conserved(s);
    } finally { s.dispose(); }
  });

  it('retains cargo and recovers ground support after off-axis rotation drift', async () => {
    const s = await setup();
    try {
      fill(s, 4); s.robotController!.clearInput();
      s.robot!.body.setRotation({ x: 0.02, y: 0.4, z: -0.03, w: Math.sqrt(1 - 0.4 ** 2 - 0.02 ** 2 - 0.03 ** 2) }, true);
      s.robot!.body.setAngvel({ x: 0.2, y: 1.5, z: -0.3 }, true); run(s, 1.2);
      expect(s.robot!.body.rotation().x).toBe(0); expect(s.robot!.body.rotation().z).toBe(0);
      expect(s.robot!.body.translation().y).toBeLessThan(0.24);
      expect(s.robot!.telemetry.grounded).toBe(4);
      expect(s.robotController!.held).toHaveLength(4); conserved(s);
    } finally { s.dispose(); }
  });

  it('carries a full hopper through a trench and over a bump with physical payload mass', async () => {
    const field = JSON.parse(readFileSync(new URL('../../public/assets/field-collisions.json', import.meta.url), 'utf8')) as CollisionAsset;
    const s = await setup(INTAKE.capacity, field);
    try {
      fill(s, INTAKE.capacity); expect(s.robotController!.held).toHaveLength(INTAKE.capacity);
      s.robotController!.clearInput(); run(s, 0.5);
      for (const z of [3.35, 1.65]) {
        s.robot!.teleport([5.35, 0.26, z], 0); s.robot!.input = { ...NEUTRAL_INPUT, forward: -1, slow: true };
        run(s, 3.2);
        expect(s.robot!.body.translation().x).toBeLessThan(3); expect(s.robot!.telemetry.tilt).toBeLessThan(15);
        expect(s.robotController!.held).toHaveLength(INTAKE.capacity); conserved(s);
      }
    } finally { s.dispose(); }
  }, 30_000);
});
