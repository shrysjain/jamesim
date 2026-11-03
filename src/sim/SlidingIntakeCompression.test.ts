import { describe, expect, it } from 'vitest';
import type { CollisionAsset } from '../field/types';
import { ROBOTS } from '../robot/registry';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';

const floor: CollisionAsset = {
  boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [25, .1, 25] }],
  meshes: [],
};
const run = (simulation: FieldSimulation, seconds: number) => {
  for (let tick = 0; tick < Math.round(seconds * 120); tick++) simulation.update(1 / 120);
};

describe('automatic sliding intake compression', () => {
  for (const [id, definition] of Object.entries(ROBOTS)) {
    if (!(definition.intake.stowTravel && definition.intake.stowTravel > 0)) continue;
    it(`${id}: shooting retracts an empty intake and releasing extends it`, async () => {
      const simulation = await FieldSimulation.create(floor, [], true);
      try {
        simulation.startSession({ ...DEFAULT_MATCH, robot: id as keyof typeof ROBOTS, preloads: 0 }, true);
        const robot = simulation.robotController!;
        run(simulation, .8);
        expect(robot.chassis.pose.intake).toBe(1);
        robot.input.shoot = true;
        run(simulation, .8);
        expect(robot.chassis.pose.intake).toBeCloseTo(definition.intake.shootingMinExtension ?? 0, 6);
        robot.input.shoot = false;
        run(simulation, .8);
        expect(robot.chassis.pose.intake).toBe(1);
      } finally {
        simulation.dispose();
      }
    });
  }
});
