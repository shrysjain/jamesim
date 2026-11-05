import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { ROBOTS } from '../robot/registry';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { toRobotInput } from './driveInput';
import type { CollisionAsset } from '../field/types';
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const id = '1690-kepler' as const;
it.each([1, -1])('fully loaded Kepler reverses from the trench edge on field side %i', async side => {
  const d = ROBOTS[id], count = d.mechanisms.capacity;
  const s = await FieldSimulation.create(field, Array.from({ length: count }, (_, i) => [(i % 10) * .16, .08, -3 + Math.floor(i / 10) * .16]), true);
  const run = (seconds: number, forward = 0) => {
    for (let i = 0; i < Math.round(seconds * 120); i++) {
      s.robot!.input = toRobotInput({ ...NEUTRAL_INPUT, forward: forward * side }, s.robot!.telemetry.heading, 'field'); s.update(1 / 120);
    }
  };
  try {
    s.startSession({ ...DEFAULT_MATCH, robot: id, preloads: 0, alliance: side > 0 ? 'blue' : 'red' }, true);
    s.robot!.teleport([side * 5.35, .26, side * 3.2], side > 0 ? Math.PI : 0); run(.7);
    const r = s.robotController!, handles = s.fuel.map(b => b.handle);
    for (const [i, f] of s.fuelSystem.records.entries()) { expect(s.fuelSystem.capture(f, r.owner, i, r.storageSlots[i])).toBe(true); f.state = 'stored'; }
    expect(r.held).toHaveLength(count);
    run(.4); run(1.8, .4);
    const before = { ...s.robot!.body.translation() }; run(1, -.4);
    expect((s.robot!.body.translation().x - before.x) * side).toBeGreaterThan(.5);
    expect(s.robot!.body.translation().y).toBeLessThan(.3); expect(s.robot!.telemetry.grounded).toBeGreaterThanOrEqual(3);
    expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(s.fuelSystem.records).toHaveLength(count);
  } finally { s.dispose(); }
}, 30000);
