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
  [1, -1].flatMap(side => [0, 8, ROBOTS[id].mechanisms.capacity].map(count => ({ id, side, count }))));

type Scenario = (typeof cases)[number];
async function attempt({ id, side, count }: Scenario, releaseSeconds: number) {
  const d = ROBOTS[id], s = await FieldSimulation.create(field,
    Array.from({ length: count }, (_, i) => [0, .08, -3 + i * .16]), true);
  try {
    s.startSession({ ...DEFAULT_MATCH, robot: id, preloads: Math.min(count, 8), alliance: side > 0 ? 'blue' : 'red' }, true);
    const r = s.robotController!, b = r.chassis, handles = s.fuel.map(f => f.handle);
    let turning = false, yawTravel = 0;
    const run = (seconds: number, strafe = 0, turn = 0) => {
      for (let tick = 0; tick < Math.round(seconds * 120); tick++) {
        b.input = toRobotInput({ ...NEUTRAL_INPUT, strafe: strafe * side, turn }, b.telemetry.heading, 'field');
        s.update(1 / 120);
        if (turning) yawTravel += Math.abs(b.body.angvel().y) / 120;
      }
    };
    // Use the outpost-side entrance; the opposite side borders depot hardware.
    b.teleport([side * 7.75, .26, -side * 1.4], side * Math.PI / 2); run(.7);
    for (const f of s.fuelSystem.records.filter(f => f.owner !== r.owner)) {
      const slot = r.held.length;
      expect(s.fuelSystem.capture(f, r.owner, slot, r.storageSlots[slot])).toBe(true); f.state = 'stored';
    }
    expect(r.held).toHaveLength(count);
    for (let tick = 0; tick < 180 && b.body.translation().z * side < -.28; tick++) run(1 / 120, -.4);
    expect(b.body.translation().z * side).toBeGreaterThan(-.6);
    run(.45, 0, .35); r.requestIntakeToggle(); run(.5); r.requestIntakeToggle(); run(.3);
    run(1.2, .4); const contact = { ...b.body.translation() };

    // Candidate routes use only ordinary drive inputs. Releasing pressure
    // before turning can help a loaded robot; other poses turn continuously.
    run(releaseSeconds);
    turning = true; run(1, 0, -1); turning = false;
    run(1.2, .4); run(.3);
    expect(b.body.translation().y).toBeLessThan(.3); expect(b.telemetry.grounded).toBeGreaterThanOrEqual(3);
    expect(r.climber.attached).toBe(false);
    expect(s.fuel.map(f => f.handle)).toEqual(handles); expect(s.fuelSystem.records).toHaveLength(count);
    // Physical spilling from uncovered hoppers is permitted; original fuel and
    // the mass of the remaining owned load must still be conserved.
    expect(b.totalMass).toBeCloseTo(d.mass + r.held.length * FUEL_MASS, 5);
    return { releaseSeconds, yawTravel, withdrawal: (contact.z - b.body.translation().z) * side };
  } finally { s.dispose(); }
}

it.each(cases)('$id has a tower exit using ordinary controls, side $side, $count fuel', async scenario => {
  const results = [];
  // Replay the same contact history independently for each candidate. This
  // tests reachability, not that one input timing suits every mechanism/load.
  for (const releaseSeconds of [0, .6]) {
    const result = await attempt(scenario, releaseSeconds); results.push(result);
    if (result.yawTravel > .2 && result.withdrawal > .7) break;
  }
  expect(results.some(r => r.yawTravel > .2 && r.withdrawal > .7), JSON.stringify(results)).toBe(true);
}, 30000);
