import { describe, expect, it } from 'vitest';
import type { CollisionAsset, Vec3 } from '../field/types';
import { ROBOTS } from '../robot/registry';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';

const floor: CollisionAsset = {
  boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [50, .1, 50] }], meshes: [],
};

for (const id of Object.keys(ROBOTS) as (keyof typeof ROBOTS)[]) describe(`${id}: driver response`, () => {
  const definition = ROBOTS[id];
  it.each([0, 8])('responds to starts, reversals and release with %i original preloads', async preloads => {
    const seeds = Array.from({ length: preloads }, (_, i): Vec3 => [0, .08, i * .16]);
    const sim = await FieldSimulation.create(floor, seeds, true);
    try {
      sim.startSession({ ...DEFAULT_MATCH, robot: id, preloads }, true);
      const robot = sim.robot!, bodies = sim.fuel.map(body => body.handle);
      const tick = (seconds: number) => {
        for (let i = 0; i < Math.round(seconds * 120); i++) {
          sim.update(1 / 120);
          for (const module of robot.modules) {
            // Response must still come from supported, traction-limited tires.
            expect(Math.hypot(module.force.x, module.force.z)).toBeLessThanOrEqual(robot.tuning.grip * module.load + .001);
          }
        }
      };
      const reset = () => { robot.teleport([0, .26, 0]); tick(.5); };
      reset();
      const acceleration = Math.min(robot.tuning.acceleration * definition.mass / robot.totalMass, robot.tuning.grip * 9.81);
      robot.input = { ...NEUTRAL_INPUT, forward: 1 }; tick(.1);
      expect(robot.body.linvel().x).toBeGreaterThan(acceleration * .1 * .85);
      // An ordinary direction change must reverse promptly, rather than spend
      // the next quarter-second continuing along the old direction.
      tick(.1); robot.input = { ...NEUTRAL_INPUT, forward: -1 }; tick(.25);
      expect(robot.body.linvel().x).toBeLessThan(-.2);

      reset(); robot.input = { ...NEUTRAL_INPUT, strafe: 1 }; tick(.1);
      expect(robot.body.linvel().z).toBeGreaterThan(acceleration * .06);

      reset(); robot.input = { ...NEUTRAL_INPUT, turn: 1 }; tick(.2);
      expect(robot.telemetry.turnRate).toBeGreaterThan(3.5);
      tick(1); robot.input = { ...NEUTRAL_INPUT }; tick(.35);
      expect(Math.abs(robot.telemetry.turnRate)).toBeLessThan(.1);

      reset(); robot.input = { ...NEUTRAL_INPUT, forward: 1 }; tick(2);
      const speed = robot.telemetry.speed, before = { ...robot.body.translation() };
      expect(speed).toBeCloseTo(robot.tuning.maxSpeed, 1);
      robot.input = { ...NEUTRAL_INPUT }; tick(1);
      expect(robot.telemetry.speed).toBeLessThan(.1);
      const distance = Math.hypot(robot.body.translation().x - before.x, robot.body.translation().z - before.z);
      // Ideal traction-limited braking distance plus a small controller margin.
      expect(distance).toBeLessThan(speed ** 2 / (2 * robot.tuning.grip * 9.81) + .25);
      expect(robot.telemetry.grounded).toBe(4);
      expect(robot.body.rotation().x).toBe(0); expect(robot.body.rotation().z).toBe(0);
      expect(sim.fuel.map(body => body.handle)).toEqual(bodies);
      expect(sim.robotController!.held).toHaveLength(preloads);
    } finally { sim.dispose(); }
  });
});
