import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import { NEUTRAL_INPUT } from '../../../sim/SwerveChassis';
import { toRobotInput } from '../../../sim/driveInput';
import { FUEL_MASS } from '../../../sim/FuelSystem';
import { DOWNPOUR } from './definition';
import type { CollisionAsset } from '../../../field/types';

const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [15, .1, 15] }], meshes: [] };
const counts = [0, 8, DOWNPOUR.mechanisms.capacity];

async function fixture(asset: CollisionAsset, count: number, side = 1) {
  const s = await FieldSimulation.create(asset, Array.from({ length: count }, (_, i) => [0, .08, -3 + i * .16]), true);
  s.startSession({ ...DEFAULT_MATCH, robot: '6800-downpour', preloads: Math.min(count, 8), alliance: side > 0 ? 'blue' : 'red' }, true);
  const r = s.robotController!, b = r.chassis;
  const run = (seconds: number, strafe = 0, turn = 0) => {
    for (let tick = 0; tick < Math.round(seconds * 120); tick++) {
      b.input = toRobotInput({ ...NEUTRAL_INPUT, strafe: strafe * side, turn }, b.telemetry.heading, 'field');
      s.update(1 / 120);
    }
  };
  b.teleport([7.75 * side, .26, -1.4 * side], side * Math.PI / 2); run(.7);
  for (const f of s.fuelSystem.records.filter(f => f.owner !== r.owner)) {
    const slot = r.held.length;
    s.fuelSystem.capture(f, r.owner, slot, r.storageSlots[slot]); f.state = 'stored';
  }
  return { s, r, b, run };
}

it.each(counts)('Downpour settles at its prepared CAD carpet reference with %i fuel', async count => {
  const { s, b, r, run } = await fixture(floor, count);
  try {
    const handles = s.fuel.map(f => f.handle); run(1.5);
    // The prepared model's native carpet is Y=0, normalized by Y-.223.
    // Allow normal load-dependent numerical compression, not an 8 mm offset.
    expect(Math.abs(b.body.translation().y - .223)).toBeLessThan(.003);
    expect(b.telemetry.grounded).toBe(4);
    expect(b.totalMass).toBeCloseTo(DOWNPOUR.mass + count * FUEL_MASS, 5);
    expect(r.held).toHaveLength(count); expect(s.fuel.map(f => f.handle)).toEqual(handles);
  } finally { s.dispose(); }
});

it.each(counts.flatMap(count => [1, -1].map(side => ({ count, side }))))(
  'Downpour can turn away from the tower post and withdraw with $count fuel, side $side', async ({ count, side }) => {
    const { s, r, b, run } = await fixture(field, count, side);
    try {
      const handles = s.fuel.map(f => f.handle);
      for (let tick = 0; tick < 180 && b.body.translation().z * side < -.28; tick++) run(1 / 120, -.4);
      expect(b.body.translation().z * side).toBeGreaterThan(-.35);
      run(.45, 0, .35); r.requestIntakeToggle(); run(.5); r.requestIntakeToggle(); run(.3);
      // This diagonal stance presses the bumper against the real post/foot.
      // Straight withdrawal is obstructed. Turning away must remain available.
      run(1.2, .4); const contact = { ...b.body.translation() }, heading = b.telemetry.heading;
      expect(b.telemetry.grounded).toBeGreaterThanOrEqual(2);
      run(1, 0, -1);
      expect(Math.abs(Math.atan2(Math.sin(b.telemetry.heading - heading), Math.cos(b.telemetry.heading - heading)))).toBeGreaterThan(.2);
      run(1.2, .4); run(.3);
      expect((contact.z - b.body.translation().z) * side).toBeGreaterThan(.7);
      expect(b.body.translation().y).toBeLessThan(.3); expect(b.telemetry.grounded).toBe(4);
      expect(r.held).toHaveLength(count); expect(s.fuelSystem.records).toHaveLength(count);
      expect(s.fuel.map(f => f.handle)).toEqual(handles);
      expect(b.totalMass).toBeCloseTo(DOWNPOUR.mass + count * FUEL_MASS, 5);
    } finally { s.dispose(); }
  }, 30000,
);
