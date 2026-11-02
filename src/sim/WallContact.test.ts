import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CollisionAsset } from '../field/types';
import { ROBOTS } from '../robot/registry';
import { FieldSimulation } from './FieldSimulation';
import { RobotSimulation } from './RobotSimulation';
import { NEUTRAL_INPUT } from './SwerveChassis';

const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
const wall: CollisionAsset = { boxes: [
  { element: 'floor', center: [0, -.1, 0], halfExtents: [15, .1, 15] },
  { element: 'wall', center: [2.05, .5, 0], halfExtents: [.05, .5, 10] },
], meshes: [] };
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;

for (const definition of Object.values(ROBOTS)) describe(`${definition.id}: wall contact`, () => {
  for (const loaded of [false, true]) it(`slides along a wall and reverses away ${loaded ? 'with cargo' : 'empty'}`, async () => {
    const count = loaded ? definition.mechanisms.capacity : 0;
    const s = await FieldSimulation.create(wall, Array.from({ length: count }, (_, i) => [0, .08, -5 + i * .16]));
    s.robotController = new RobotSimulation(s.world, s.fuelSystem, s.colliderElements, definition);
    try {
      const r = s.robot!; r.teleport([0, .26, 0]); s.setRunning(true);
      s.robotController.input.intake = true; run(s, .8); s.robotController.input.intake = false;
      for (const [i, f] of s.fuelSystem.records.entries()) {
        s.fuelSystem.capture(f, s.robotController.owner, i, s.robotController.storageSlots[i]); f.state = 'stored';
      }
      const handles = s.fuel.map(f => f.handle);
      r.input = { ...NEUTRAL_INPUT, forward: 1 }; run(s, 1.3);
      const contact = { ...r.body.translation() };
      expect(contact.x).toBeLessThan(2 - definition.length / 2 + .02);
      r.input = { ...NEUTRAL_INPUT, forward: 1, strafe: .15 }; run(s, 1.5);
      const slide = { ...r.body.translation() };
      expect(slide.z - contact.z).toBeGreaterThan(.2);
      expect(slide.y).toBeLessThan(.35); expect(r.telemetry.grounded).toBe(4);
      r.input = { ...NEUTRAL_INPUT, forward: -1 }; run(s, 1);
      expect(r.body.translation().x).toBeLessThan(slide.x - .8);
      expect(s.fuel.map(f => f.handle)).toEqual(handles);
    } finally { s.dispose(); }
  });
  it('slides on both real perimeter sides, turns and drives clear without climbing the rail', async () => {
    for (const sign of [-1, 1]) {
      const s = await FieldSimulation.create(field, []);
      s.robotController = new RobotSimulation(s.world, s.fuelSystem, s.colliderElements, definition);
      try {
        const r = s.robot!; r.teleport([6 * sign, .26, 2.5 * sign]); s.setRunning(true); run(s, .6);
        r.input = { ...NEUTRAL_INPUT, strafe: sign }; run(s, 1.2);
        const contact = { ...r.body.translation() };
        r.input = { ...NEUTRAL_INPUT, strafe: sign, forward: .15 * sign }; run(s, 1.5);
        expect((r.body.translation().x - contact.x) * sign).toBeGreaterThan(.2);
        expect(Math.abs(r.body.translation().z) + definition.width / 2).toBeLessThan(4.12);
        expect(r.body.translation().y).toBeLessThan(.35); expect(r.telemetry.grounded).toBe(4);
        r.input = { ...NEUTRAL_INPUT, strafe: -sign }; run(s, 1.2);
        expect(Math.abs(r.body.translation().z)).toBeLessThan(Math.abs(contact.z) - .5);
        r.input = { ...NEUTRAL_INPUT, turn: .3 * sign }; run(s, .6);
        expect(Math.abs(r.telemetry.turnRate)).toBeGreaterThan(.5);
      } finally { s.dispose(); }
    }
  });
});
