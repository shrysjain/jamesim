import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ROBOTS } from '../robot/registry';
import type { CollisionAsset } from '../field/types';
import { FieldSimulation } from './FieldSimulation';
import { RobotSimulation } from './RobotSimulation';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { CollisionGroups } from './collisionGroups';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [25, .1, 25] }], meshes: [] };
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };

for (const definition of Object.values(ROBOTS)) describe(`${definition.id}: rigid swerve`, () => {
  async function setup(asset = floor, loaded = false) {
    const s = await FieldSimulation.create(asset, Array.from({ length: loaded ? definition.mechanisms.capacity : 0 }, (_, i) => [0, .08, i * .16]));
    s.robotController = new RobotSimulation(s.world, s.fuelSystem, s.colliderElements, definition);
    s.robot!.teleport([0, .26, 0]); s.setRunning(true); run(s, .6);
    if (loaded) for (const [i, f] of s.fuelSystem.records.entries()) {
      s.fuelSystem.capture(f, s.robotController.owner, i, s.robotController.storageSlots[i]); f.state = 'stored';
    }
    return s;
  }

  it('keeps tire proxies fixed to the frame on the bump and in flight', async () => {
    const s = await setup(field);
    try {
      const r = s.robot!, tires = Array.from({ length: r.body.numColliders() }, (_, i) => r.body.collider(i))
        .filter(c => c.collisionGroups() === CollisionGroups.wheelFuel);
      expect(tires).toHaveLength(4);
      const mounts = tires.map(c => ({ ...c.translationWrtParent()! }));
      const fixed = () => tires.forEach((c, i) => expect(c.translationWrtParent()).toEqual(mounts[i]));
      r.teleport([5.35, .26, 1.65], Math.PI); run(s, .6);
      r.input = { ...NEUTRAL_INPUT, forward: 1, slow: true }; let peak = 0;
      for (let i = 0; i < 360; i++) { s.update(1 / 120); fixed(); peak = Math.max(peak, r.body.translation().y); }
      expect(peak).toBeGreaterThan(.32); expect(peak).toBeLessThan(.65);
      expect(r.body.translation().x).toBeLessThan(3);
      r.teleport([0, 3, 0]); r.input = { ...NEUTRAL_INPUT, turn: 1 }; run(s, .15); fixed();
      expect(r.telemetry.grounded).toBe(0); expect(Math.abs(r.telemetry.turnRate)).toBeLessThan(.001);
    } finally { s.dispose(); }
  });

  for (const loaded of [false, true]) it(`turns promptly ${loaded ? 'with a full hopper' : 'empty'}, stops cleanly and retains precision mode`, async () => {
    const s = await setup(floor, loaded);
    try {
      const r = s.robot!, handles = s.fuel.map(f => f.handle);
      r.input = { ...NEUTRAL_INPUT, turn: 1 }; run(s, .4);
      expect(r.telemetry.turnRate).toBeGreaterThan(3);
      run(s, .8); expect(r.telemetry.turnRate).toBeGreaterThan(5.5); expect(r.telemetry.turnRate).toBeLessThan(6.6);
      r.input = { ...NEUTRAL_INPUT }; run(s, .6); expect(Math.abs(r.telemetry.turnRate)).toBeLessThan(.15);
      r.input = { ...NEUTRAL_INPUT, turn: -.5, slow: true }; run(s, 1);
      expect(r.telemetry.turnRate).toBeLessThan(-1.3); expect(r.telemetry.turnRate).toBeGreaterThan(-1.8);
      expect(s.fuel.map(f => f.handle)).toEqual(handles);
      expect(r.body.rotation().x).toBe(0); expect(r.body.rotation().z).toBe(0);
    } finally { s.dispose(); }
  });
});
