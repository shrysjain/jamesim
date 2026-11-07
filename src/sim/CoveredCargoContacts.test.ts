import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import type { CollisionAsset, Vec3 } from '../field/types';
import { ROBOTS } from '../robot/registry';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { FUEL_MASS, FUEL_RADIUS } from './FuelSystem';
import { CollisionGroups } from './collisionGroups';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { toRobotInput } from './driveInput';

const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
for (const id of ['9496-matterhorn', '5000-icarus-2', '6800-downpour'] as const) {
  it.each([-1, 1])(`${id}: its retaining cover keeps a full load during trench contact on side %i`, async side => {
    const definition = ROBOTS[id], count = definition.mechanisms.capacity;
    const seeds = Array.from({ length: count }, (_, i): Vec3 => [(i % 10) * .16, .08, -3 + Math.floor(i / 10) * .16]);
    const sim = await FieldSimulation.create(field, seeds, true);
    try {
      sim.startSession({ ...DEFAULT_MATCH, robot: id, preloads: 0, alliance: side > 0 ? 'blue' : 'red' }, true);
      const r = sim.robotController!, chassis = r.chassis, original = [...sim.fuelSystem.records], handles = sim.fuel.map(body => body.handle);
      let verifyContacts = false, deepest = 0;
      const sphere = new RAPIER.Ball(FUEL_RADIUS), identity = { x: 0, y: 0, z: 0, w: 1 };
      const run = (seconds: number, forward = 0) => {
        for (let i = 0; i < Math.round(seconds * 120); i++) {
          chassis.input = toRobotInput({ ...NEUTRAL_INPUT, forward: forward * side }, chassis.telemetry.heading, 'field');
          sim.update(1 / 120);
          if (verifyContacts && i % 6 === 0) for (const f of r.held.filter(f => f.state === 'stored')) {
            const position = r.renderPosition(f);
            sim.world.intersectionsWithShape(position, identity, sphere, collider => {
              deepest = Math.min(deepest, collider.contactShape(sphere, position, identity, 0)?.distance ?? 0);
              return true;
            }, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, CollisionGroups.chassis);
          }
        }
      };
      chassis.teleport([side * 5.35, .26, side * 3.2], side > 0 ? Math.PI : 0); run(.7);
      for (const [i, f] of original.entries()) {
        expect(sim.fuelSystem.capture(f, r.owner, i, r.storageSlots[i])).toBe(true); f.state = 'stored';
      }
      run(.4); expect(r.held).toHaveLength(count);
      verifyContacts = true;
      run(1.8, .4); expect(r.held).toHaveLength(count);
      const before = { ...chassis.body.translation() }; run(1.2, -.4);
      expect((chassis.body.translation().x - before.x) * side).toBeGreaterThan(.5);
      expect(chassis.body.translation().y).toBeLessThan(.3); expect(chassis.telemetry.grounded).toBeGreaterThanOrEqual(3);
      expect(r.held).toHaveLength(count); expect(r.shooter.shotsFired).toBe(0);
      expect(sim.fuel.map(body => body.handle)).toEqual(handles);
      original.forEach((f, i) => { expect(sim.fuelSystem.records[i]).toBe(f); expect(f.body.isEnabled()).toBe(false); });
      expect(chassis.body.mass()).toBeCloseTo(definition.mass + count * FUEL_MASS, 3);
      expect(deepest).toBeGreaterThanOrEqual(-.004);
    } finally { sim.dispose(); }
  });
}

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [20, .1, 20] }], meshes: [] };
for (const id of ['9496-matterhorn', '5000-icarus-2', '6800-downpour'] as const) {
  it(`${id}: field-only cargo contacts follow storage, feeding, reverse and restart without adding bodies or mass`, async () => {
    const sim = await FieldSimulation.create(floor, Array.from({ length: 12 }, (_, i): Vec3 => [0, .08, i * .16]), true);
    try {
      sim.startSession({ ...DEFAULT_MATCH, robot: id, preloads: 8 }, true);
      const r = sim.robotController!, chassis = r.chassis, handles = sim.fuel.map(body => body.handle), bodyCount = sim.world.bodies.len();
      const proxies = () => Array.from({ length: chassis.body.numColliders() }, (_, i) => chassis.body.collider(i))
        .filter(c => c.collisionGroups() === CollisionGroups.coveredCargo);
      const check = () => {
        expect(proxies()).toHaveLength(r.held.filter(f => f.state === 'stored').length);
        for (const proxy of proxies()) {
          expect(proxy.mass()).toBe(0);
          const p = proxy.translation();
          const nearest = Math.min(...r.held.filter(f => f.state === 'stored').map(f => {
            const rendered = r.renderPosition(f);
            return Math.hypot(p.x - rendered.x, p.y - rendered.y, p.z - rendered.z);
          }));
          expect(nearest, JSON.stringify({ time: sim.fuelSystem.time, position: p, stored: r.held.filter(f => f.state === 'stored').map(f => r.renderPosition(f)) })).toBeLessThan(.0001);
        }
        expect(chassis.body.mass()).toBeCloseTo(ROBOTS[id].mass + r.held.length * FUEL_MASS, 3);
        expect(sim.world.bodies.len()).toBe(bodyCount); expect(sim.fuel.map(body => body.handle)).toEqual(handles);
        for (const f of sim.fuelSystem.records) expect(f.body.isEnabled()).toBe(f.owner === null);
      };
      const run = (ticks: number) => { for (let i = 0; i < ticks; i++) { sim.update(1 / 120); check(); } };
      chassis.teleport([6.2, .26, 0], Math.PI - (ROBOTS[id].shooterGeometry.yawOffset ?? 0)); run(72);
      expect(proxies()).toHaveLength(8);
      sim.setRunning(false); const position = { ...chassis.body.translation() }; run(24);
      expect(chassis.body.translation()).toEqual(position); sim.setRunning(true);
      r.input.shoot = true;
      for (let i = 0; i < 600 && !r.held.some(f => f.state === 'feeding'); i++) run(1);
      expect(r.held.some(f => f.state === 'feeding')).toBe(true);
      r.input = { intake: true, reverse: true, shoot: true }; run(240);
      expect(r.held).toHaveLength(0); expect(proxies()).toHaveLength(0);
      sim.startSession({ ...DEFAULT_MATCH, robot: id, preloads: 0 }, true); check();
      expect(proxies()).toHaveLength(0);
    } finally { sim.dispose(); }
  });
}
