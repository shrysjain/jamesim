import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { FieldSimulation } from './FieldSimulation';
import { ROBOTS } from '../robot/registry';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { toRobotInput } from './driveInput';
import type { CollisionAsset } from '../field/types';
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;

it.each([1, -1])('follows the low CAD tower base without false ramps and keeps feet/rung solid, side %i', async side => {
  const s = await FieldSimulation.create(field, [], false, true);
  try {
    s.setRunning(true); s.update(1 / 120);
    const down = (x: number, z: number) => s.world.castRay(new RAPIER.Ray({ x: x * side, y: .1, z: z * side }, { x: 0, y: -1, z: 0 }), .11, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    const gap = down(7.75, -.45), foot = down(7.2, .175);
    expect(gap).not.toBeNull(); expect(.1 - gap!.timeOfImpact).toBeCloseTo(.005095, 4);
    expect(foot).not.toBeNull(); expect(.1 - foot!.timeOfImpact).toBeCloseTo(.024399, 4);
    const rung = s.world.castRay(new RAPIER.Ray({ x: 7.208 * side, y: .4, z: -.28 * side }, { x: 0, y: 1, z: 0 }), .4, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    expect(rung).not.toBeNull(); expect(.4 + rung!.timeOfImpact).toBeGreaterThan(.66);
  } finally { s.dispose(); }
});

const cases = (Object.keys(ROBOTS) as (keyof typeof ROBOTS)[]).flatMap(id => [1, -1].map(side => ({ id, side })));
it.each(cases)('$id enters the tower from the side and reverses clear, side $side', async ({ id, side }) => {
  const count = 8, s = await FieldSimulation.create(field, Array.from({ length: count }, (_, i) => [0, .08, -3 + i * .16]), true);
  const run = (seconds: number, strafe = 0) => {
    for (let tick = 0; tick < Math.round(seconds * 120); tick++) {
      s.robot!.input = toRobotInput({ ...NEUTRAL_INPUT, strafe: strafe * side }, s.robot!.telemetry.heading, 'field'); s.update(1 / 120);
    }
  };
  try {
    s.startSession({ ...DEFAULT_MATCH, robot: id, preloads: count, alliance: side > 0 ? 'blue' : 'red' }, true);
    const handles = s.fuel.map(b => b.handle);
    // Approach from the outpost side, clear of the neighbouring depot, with
    // the intake leading. Mirror the whole pose on the opposite alliance.
    s.robot!.teleport([7.75 * side, .26, -1.4 * side], side * Math.PI / 2); run(.7);
    const before = { ...s.robot!.body.translation() };
    // End the approach inside the base, rather than letting faster robots
    // cross the far post and making the reverse a second entry from that side.
    for (let tick = 0; tick < 180 && s.robot!.body.translation().z * side < -.28; tick++) run(1 / 120, -.4);
    const entered = { ...s.robot!.body.translation() };
    expect((entered.z - before.z) * side).toBeGreaterThan(.8);
    run(1, .4); expect((entered.z - s.robot!.body.translation().z) * side).toBeGreaterThan(.5);
    run(.5, .4); run(.4);
    expect(s.robot!.body.translation().y).toBeLessThan(.3);
    expect(s.robot!.telemetry.grounded).toBeGreaterThanOrEqual(3);
    expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(s.fuelSystem.records).toHaveLength(count);
  } finally { s.dispose(); }
}, 30000);
