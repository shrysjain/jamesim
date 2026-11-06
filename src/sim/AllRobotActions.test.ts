import { describe, expect, it } from 'vitest';
import type { CollisionAsset, Vec3 } from '../field/types';
import { ROBOTS } from '../robot/registry';
import { FieldSimulation } from './FieldSimulation';
import type { Fuel } from './FuelSystem';
import { FUEL_MASS } from './FuelSystem';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [30, .1, 30] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120);
};

for (const id of Object.keys(ROBOTS) as (keyof typeof ROBOTS)[]) {
  const definition = ROBOTS[id];
  for (const alliance of ['blue', 'red'] as const) {
    for (const opposite of definition.pickup.opposed ? [false, true] : [false]) {
      describe(`${id}, ${alliance}, ${opposite ? 'opposite' : 'primary'} intake`, () => {
        async function setup() {
          const seeds = Array.from({ length: 10 }, (_, i): Vec3 => [0, .08, i * .16]);
          const s = await FieldSimulation.create(floor, seeds, true);
          s.startSession({ ...DEFAULT_MATCH, robot: id, alliance, preloads: 4 });
          const sign = alliance === 'blue' ? 1 : -1;
          s.robot!.teleport([sign * 6.2, .26, 0], (alliance === 'blue' ? Math.PI : 0) - (definition.shooterGeometry.yawOffset ?? 0));
          run(s, .6);
          if (opposite) { s.robotController!.requestIntakeSwitch(); run(s, .8); }
          return s;
        }
        function atMouth(s: FieldSimulation) {
          const r = s.robotController!, pickup = opposite ? definition.pickup.opposed! : definition.pickup;
          const f = s.fuelSystem.records.find(f => f.owner === null && !r.shooter.shots.some(shot => shot.id === f.id))!;
          const point = r.toWorld({ x: (pickup.minX + pickup.maxX) / 2, y: -.145, z: 0 });
          f.body.setTranslation(point, true); f.body.setLinvel(r.chassis.body.velocityAtPoint(point), true);
          s.world.propagateModifiedBodyPositionsToColliders();
          return f;
        }
        function conserved(s: FieldSimulation, original: Fuel[], handles: number[]) {
          expect(s.fuelSystem.records).toHaveLength(original.length);
          s.fuelSystem.records.forEach((f, i) => expect(f).toBe(original[i]));
          expect(s.fuel.map(body => body.handle)).toEqual(handles);
          expect(new Set(original.map(f => f.id)).size).toBe(10);
          for (const f of original) expect(f.body.isEnabled()).toBe(f.owner === null);
          expect(s.robot!.body.mass()).toBeCloseTo(definition.mass + s.robotController!.held.length * FUEL_MASS, 3);
          if (definition.pickup.opposed) expect(Math.min(s.robot!.pose.intake, s.robot!.pose.opposedIntake!)).toBe(0);
        }

        it('collects and fires together, then retains collection and drive while shooting is held', async () => {
          const s = await setup();
          try {
            const r = s.robotController!, original = [...s.fuelSystem.records], handles = s.fuel.map(body => body.handle);
            const incoming = atMouth(s);
            r.input = { intake: true, shoot: true, reverse: false }; run(s, .15);
            expect(incoming.owner).toBe(r.owner); expect(r.activeExtension).toBe(1);
            run(s, 5);
            expect(r.shooter.shots.some(shot => shot.id === incoming.id)).toBe(true);
            r.chassis.input = { ...NEUTRAL_INPUT, strafe: .06 }; run(s, .4);
            expect(r.chassis.telemetry.speed).toBeGreaterThan(.18);
            const movingIncoming = atMouth(s), before = r.shooter.shotsFired;
            run(s, .15); expect(movingIncoming.owner).toBe(r.owner);
            run(s, 2.5);
            expect(r.chassis.telemetry.speed).toBeGreaterThan(.18);
            if (definition.mechanisms.movingShots) {
              expect(r.shooter.shots.some(shot => shot.id === movingIncoming.id)).toBe(true);
            } else {
              expect(r.shooter.shotsFired).toBe(before);
              expect(movingIncoming.owner).toBe(r.owner);
              r.chassis.input = { ...NEUTRAL_INPUT }; run(s, 3);
              expect(r.shooter.shots.some(shot => shot.id === movingIncoming.id)).toBe(true);
            }
            conserved(s, original, handles);
          } finally { s.dispose(); }
        });

        it.each([-1, 1])('keeps manual turn %i and translation available while intake and shoot are held', async direction => {
          const s = await setup();
          try {
            const r = s.robotController!, original = [...s.fuelSystem.records], handles = s.fuel.map(body => body.handle);
            r.input = { intake: true, shoot: true, reverse: false };
            r.chassis.input = { ...NEUTRAL_INPUT, strafe: .15, turn: direction * .5 };
            run(s, .3);
            expect(r.chassis.body.angvel().y * direction).toBeGreaterThan(.8);
            expect(r.chassis.telemetry.speed).toBeGreaterThan(.2);
            expect(r.activeExtension).toBe(1);
            // Keep both mechanism buttons held: releasing driver turn must
            // restore automatic alignment and firing without a new Shoot edge.
            r.chassis.input = { ...NEUTRAL_INPUT }; run(s, 4);
            expect(r.shooter.shotsFired).toBe(4);
            conserved(s, original, handles);
          } finally { s.dispose(); }
        });

        it('prioritizes reverse over intake/shoot while retaining drive, pause and disabled interlocks', async () => {
          const s = await setup();
          try {
            const r = s.robotController!, original = [...s.fuelSystem.records], handles = s.fuel.map(body => body.handle);
            const incoming = atMouth(s);
            r.input = { intake: true, shoot: true, reverse: true };
            r.chassis.input = { ...NEUTRAL_INPUT, strafe: .15 }; run(s, .8);
            expect(r.shooter.shotsFired).toBe(0); expect(incoming.owner).toBeNull();
            expect(r.held.length).toBeLessThan(4); expect(r.chassis.telemetry.speed).toBeGreaterThan(.2);
            s.setRunning(false);
            const position = { ...r.chassis.body.translation() }, roller = r.rollerAngle;
            run(s, .5); expect(r.chassis.body.translation()).toEqual(position); expect(r.rollerAngle).toBe(roller);
            expect(r.input).toMatchObject({ intake: false, shoot: false, reverse: false });
            s.setRunning(true); s.match.endEarly();
            r.input = { intake: true, shoot: true, reverse: true }; run(s, .2);
            expect(r.actuatorsEnabled).toBe(false); expect(r.shooter.shotsFired).toBe(0);
            expect(r.chassis.telemetry.speed).toBeLessThan(.001);
            conserved(s, original, handles);
          } finally { s.dispose(); }
        });
      });
    }
  }
}
