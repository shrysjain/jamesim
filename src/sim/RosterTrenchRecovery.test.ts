import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { ROBOTS } from '../robot/registry';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { toRobotInput } from './driveInput';
import { FUEL_MASS } from './FuelSystem';
import type { CollisionAsset } from '../field/types';

const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const cases = (Object.keys(ROBOTS) as (keyof typeof ROBOTS)[]).flatMap(id =>
  [1, -1].flatMap(side => [0, .25].map(angle => ({ id, side, angle }))));

it.each(cases)('$id withdraws from the trench fully loaded, side $side, angle $angle', async ({ id, side, angle }) => {
  const d = ROBOTS[id], count = d.mechanisms.capacity;
  const s = await FieldSimulation.create(field, Array.from({ length: count }, (_, i) =>
    [(i % 10) * .16, .08, -3 + Math.floor(i / 10) * .16]), true);
  const run = (seconds: number, forward = 0) => {
    for (let tick = 0; tick < Math.round(seconds * 120); tick++) {
      s.robot!.input = toRobotInput({ ...NEUTRAL_INPUT, forward: forward * side }, s.robot!.telemetry.heading, 'field');
      s.update(1 / 120);
    }
  };
  try {
    s.startSession({ ...DEFAULT_MATCH, robot: id, preloads: 0, alliance: side > 0 ? 'blue' : 'red' }, true);
    const r = s.robotController!, b = r.chassis, handles = s.fuel.map(f => f.handle);
    b.teleport([side * 5.35, .26, side * 3.2], (side > 0 ? Math.PI : 0) + angle); run(.7);
    for (const [slot, f] of s.fuelSystem.records.entries()) {
      expect(s.fuelSystem.capture(f, r.owner, slot, r.storageSlots[slot])).toBe(true); f.state = 'stored';
    }
    expect(r.held).toHaveLength(count); run(.4); run(1.8, .4);
    const contact = { ...b.body.translation() };
    expect(contact.x * side).toBeLessThan(5);
    run(1, -.4);
    expect((b.body.translation().x - contact.x) * side).toBeGreaterThan(.5);
    expect(b.body.translation().y).toBeLessThan(.3);
    expect(b.telemetry.grounded).toBeGreaterThanOrEqual(3);
    // An uncovered hopper may spill physically. Every original fuel must still
    // exist, and only the remaining owned load contributes to chassis mass.
    expect(s.fuel.map(f => f.handle)).toEqual(handles);
    expect(s.fuelSystem.records).toHaveLength(count);
    expect(b.totalMass).toBeCloseTo(d.mass + r.held.length * FUEL_MASS, 5);
  } finally { s.dispose(); }
}, 30000);
