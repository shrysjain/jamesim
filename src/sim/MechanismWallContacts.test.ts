import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import type { CollisionAsset, Vec3 } from '../field/types';
import { ROBOTS } from '../robot/registry';
import { STARTING_POSE, linkedHopperExtension, partTransform } from '../robot/poses';
import type { RobotDefinition } from '../robot/types';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { CollisionGroups } from './collisionGroups';
import { rotate, v3 } from './vector';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [20, .1, 20] }], meshes: [] };
it('publishes field contacts before the first gameplay tick without advancing fuel or match time', async () => {
  const sim = await FieldSimulation.create({ ...floor, boxes: [...floor.boxes,
    { element: 'wall', center: [1, .5, 0], halfExtents: [.004, .5, 1] }] }, [[0, .08, 2]], true);
  try {
    expect(sim.world.castRay(new RAPIER.Ray(v3(0, .4, 0), v3(1, 0, 0)), 2, true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC)?.timeOfImpact).toBeCloseTo(.996, 5);
    expect(sim.fuelSystem.time).toBe(0); expect(sim.match.elapsed).toBe(0);
    expect(sim.fuel[0].translation().y).toBeCloseTo(.08, 6);
  } finally { sim.dispose(); }
});
// Place the wall outside every original stowed proxy, rather than starting a
// mechanism inside an obstruction. This calculation also runs on the old code.
function stowedReach(definition: RobotDefinition, direction: number) {
  return Math.max(...definition.colliders.map(shape => {
    const t = partTransform(definition, shape.part, STARTING_POSE), c = Math.cos(t.angle), s = Math.sin(t.angle);
    const x = t.pivot[0] + c * (shape.center[0] - t.pivot[0]) - s * (shape.center[1] - t.pivot[1]) + t.shift;
    return direction * x + Math.abs(c) * shape.halfExtents[0] + Math.abs(s) * shape.halfExtents[1];
  }));
}

const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
for (const id of ['4481-era-ii', '1690-kepler', '6328-darwin'] as const) {
  it.each([-1, 1])(`${id}: extends against real perimeter side %i and drives back clear`, async side => {
    const sim = await FieldSimulation.create(field, Array.from({ length: 8 }, (_, i): Vec3 => [0, .08, i * .16]), true);
    try {
      sim.startSession({ ...DEFAULT_MATCH, robot: id, preloads: 8 }, true);
      const r = sim.robotController!, chassis = r.chassis, handles = sim.fuel.map(body => body.handle);
      r.inspect(STARTING_POSE);
      sim.update(1 / 120); // Populate the freshly created field's query broad phase.
      const hit = sim.world.castRay(new RAPIER.Ray(v3(6, .15, 0), v3(0, 0, side)), 5, true,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, undefined, chassis.body,
        c => sim.colliderElements.get(c.handle)?.startsWith('perimeter') ?? false);
      expect(hit).not.toBeNull();
      chassis.teleport([6, .26, side * (hit!.timeOfImpact - stowedReach(ROBOTS[id], -1) - .025)], side * Math.PI / 2);
      for (let i = 0; i < 72; i++) sim.update(1 / 120);
      r.inspect(null);
      for (let i = 0; i < 120; i++) sim.update(1 / 120);
      expect(r.activeExtension).toBeLessThan(.99);
      const along = chassis.body.translation().x;
      chassis.input = { ...NEUTRAL_INPUT, forward: -1, strafe: side * .15 };
      for (let i = 0; i < 120; i++) sim.update(1 / 120);
      expect(chassis.body.translation().x - along).toBeGreaterThan(.1);
      const before = chassis.body.translation().z;
      chassis.input = { ...NEUTRAL_INPUT, forward: 1 };
      for (let i = 0; i < 132; i++) sim.update(1 / 120);
      expect((before - chassis.body.translation().z) * side).toBeGreaterThan(.8);
      expect(r.activeExtension).toBe(1); expect(chassis.telemetry.grounded).toBe(4);
      expect(chassis.body.translation().y).toBeLessThan(.26);
      expect(sim.fuel.map(body => body.handle)).toEqual(handles); expect(r.held).toHaveLength(8);
    } finally { sim.dispose(); }
  });
}

for (const id of Object.keys(ROBOTS) as (keyof typeof ROBOTS)[]) {
  const definition = ROBOTS[id];
  for (const opposite of definition.pickup.opposed ? [false, true] : [false]) {
    describe(`${id}, ${opposite ? 'opposite' : 'primary'} wall-facing intake`, () => {
      it.each([0, 8])('stalls at the wall, retracts and drives clear with %i original preloads', async preloads => {
        const seeds = Array.from({ length: preloads }, (_, i): Vec3 => [0, .08, i * .16]);
        const sim = await FieldSimulation.create(floor, seeds, true);
        try {
          sim.startSession({ ...DEFAULT_MATCH, robot: id, preloads }, true);
          const r = sim.robotController!, chassis = r.chassis, direction = opposite ? 1 : -1;
          const yaw = preloads ? .6 : 0;
          chassis.teleport([0, .26, 0], yaw); r.inspect(STARTING_POSE);
          const run = (ticks: number) => { for (let i = 0; i < ticks; i++) sim.update(1 / 120); };
          run(72);
          const restHeight = chassis.body.translation().y, handles = sim.fuel.map(body => body.handle);
          const halfThickness = preloads ? .05 : .004, reach = stowedReach(definition, direction);
          const local = rotate(v3(direction * (reach + .02 + halfThickness), 0, 0), chassis.body.rotation());
          const wall = sim.world.createCollider(RAPIER.ColliderDesc.cuboid(halfThickness, 1, 4)
            .setTranslation(local.x, 1, local.z).setRotation(chassis.body.rotation())
            .setFriction(.65).setCollisionGroups(CollisionGroups.field));
          sim.colliderElements.set(wall.handle, 'test-wall'); run(1);
          const check = () => {
            expect(chassis.body.translation().y).toBeLessThan(restHeight + .025);
            for (let i = 0; i < chassis.body.numColliders(); i++) {
              const collider = chassis.body.collider(i);
              if (collider.collisionGroups() !== CollisionGroups.chassis) continue;
              expect(collider.contactCollider(wall, 0)?.distance ?? 0).toBeGreaterThan(-.002);
            }
            if (definition.hopper.intakeCurve) expect(chassis.pose.hopper).toBeCloseTo(linkedHopperExtension(definition, chassis.pose.intake), 6);
          };
          check(); r.inspect(null);
          if (opposite) r.requestIntakeSwitch();
          for (let i = 0; i < 120; i++) { sim.update(1 / 120); check(); }
          expect(r.activeExtension).toBeLessThan(.99);

          // Withdrawing from contact must remain possible; a zero-TOI touch
          // must not latch the mechanism in both directions.
          const blocked = r.activeExtension;
          chassis.setPose({ ...chassis.pose, intake: 0, opposedIntake: 0, hopper: 0 }, true);
          expect(r.activeExtension).toBeLessThan(blocked);
          for (let i = 0; i < 90; i++) { sim.update(1 / 120); check(); }

          const before = { ...chassis.body.translation() }, away = rotate(v3(-direction, 0, 0), chassis.body.rotation());
          chassis.input = { ...NEUTRAL_INPUT, forward: -direction };
          for (let i = 0; i < 120; i++) { sim.update(1 / 120); check(); }
          const end = chassis.body.translation();
          expect((end.x - before.x) * away.x + (end.z - before.z) * away.z).toBeGreaterThan(.8);
          expect(r.activeExtension).toBe(1); expect(chassis.telemetry.grounded).toBe(4);
          expect(sim.fuel.map(body => body.handle)).toEqual(handles);
          expect(r.held).toHaveLength(preloads);
          expect(new Set(sim.fuelSystem.records.map(f => f.id)).size).toBe(preloads);
        } finally { sim.dispose(); }
      });
    });
  }
}
