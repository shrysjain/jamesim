import { describe, expect, it } from 'vitest';
import { DOWNPOUR } from './definition';
import { validateRobotDefinition } from '../../validateDefinition';
import { supportsIntakeToggle } from '../../poses';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { NEUTRAL_INPUT } from '../../../sim/SwerveChassis';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import type { CollisionAsset, Vec3 } from '../../../field/types';
const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [25, .1, 25] }], meshes: [] };
const run = (s: FieldSimulation, t: number) => { for (let i = 0; i < Math.ceil(t * 120); i++) s.update(1 / 120); };

describe('6800 Downpour', () => {
  it('declares the actual drum revision with independent pivot control and valid full-size cargo', () => {
    expect(validateRobotDefinition(DOWNPOUR)).toEqual([]);
    expect(supportsIntakeToggle(DOWNPOUR)).toBe(true);
    expect(DOWNPOUR.intake.stowTravel).toBeUndefined();
    expect(DOWNPOUR.mechanisms).toMatchObject({ turret: false, climb: false, lanes: [-.2286, -.0762, .0762, .2286], capacity: 48, compress: false });
    for (let i = 0; i < DOWNPOUR.cargoSlots.length; i++) for (let k = i + 1; k < DOWNPOUR.cargoSlots.length; k++) {
      expect(Math.hypot(...DOWNPOUR.cargoSlots[i].map((v, a) => v - DOWNPOUR.cargoSlots[k][a]))).toBeGreaterThanOrEqual(.15);
    }
  });
  it('V retracts only the pivot, Shift/Q extend it, and pause/restart hold/clear the real actuators', async () => {
    const seeds: Vec3[] = Array.from({ length: 10 }, (_, i) => [0, .08, i * .16]);
    const s = await FieldSimulation.create(floor, seeds, true);
    try {
      s.startSession({ ...DEFAULT_MATCH, robot: DOWNPOUR.id as '6800-downpour', preloads: 0 }, true); run(s, .6);
      const r = s.robotController!;
      expect(r.chassis.pose).toMatchObject({ intake: 1, hopper: 1 });
      r.requestIntakeToggle(); run(s, .6);
      expect(r.chassis.pose.intake).toBe(0); expect(r.chassis.pose.hopper).toBe(1);
      r.input.intake = true; run(s, .3); expect(r.chassis.pose.intake).toBe(1);
      r.input.intake = false; run(s, .6); expect(r.chassis.pose.intake).toBe(0);
      r.input.reverse = true; run(s, .3); expect(r.chassis.pose.intake).toBe(1);
      const pose = { ...r.chassis.pose }, angle = r.rollerAngle;
      s.setRunning(false); run(s, .5); expect(r.chassis.pose).toEqual(pose); expect(r.rollerAngle).toBe(angle);
      s.startSession({ ...DEFAULT_MATCH, robot: '6800-downpour', preloads: 0 }, true);
      expect(r.chassis.pose).toEqual({ intake: 0, hopper: 0, hood: 0, climber: 0 }); expect(r.rollerAngle).toBe(0);
    } finally { s.dispose(); }
  });
  for (const alliance of ['blue', 'red'] as const) it(`${alliance}: empties a full hopper across all four physical lanes while conserving original bodies and mass`, async () => {
    const seeds: Vec3[] = Array.from({ length: 48 }, (_, i) => [0, .08, i * .16]);
    const s = await FieldSimulation.create(floor, seeds, true);
    try {
      s.startSession({ ...DEFAULT_MATCH, robot: '6800-downpour', alliance, preloads: 0 }, true); run(s, .6);
      const r = s.robotController!, handles = s.fuel.map(b => b.handle);
      for (let i = 0; i < 48; i++) {
        const f = s.fuelSystem.records[i];
        expect(s.fuelSystem.capture(f, r.owner, i, { x: DOWNPOUR.cargoSlots[i][0], y: DOWNPOUR.cargoSlots[i][1], z: DOWNPOUR.cargoSlots[i][2] })).toBe(true); f.state = 'stored';
      }
      run(s, .4); expect(r.chassis.body.mass()).toBeGreaterThan(DOWNPOUR.mass + 9);
      r.input.shoot = true;
      const feedColumns = new Set<number>();
      for (let tick = 0; tick < 14 * 120; tick++) {
        s.update(1 / 120);
        for (const f of r.held.filter(f => f.state === 'feeding')) {
          expect(f.local.y).toBeGreaterThan(.045);
          if (f.local.x > .12 && f.local.y < .22) feedColumns.add(Math.round(f.local.z / .0762));
        }
      }
      expect(feedColumns.size).toBeGreaterThanOrEqual(4);
      expect(r.shooter.shotsFired).toBe(48); expect(r.held).toHaveLength(0);
      expect(new Set(r.shooter.shots.map(x => x.lane))).toEqual(new Set([0, 1, 2, 3]));
      expect(r.shooter.shots.map(x => x.id).sort((a, b) => a - b)).toEqual(Array.from({ length: 48 }, (_, i) => i));
      expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(r.chassis.body.mass()).toBeCloseTo(DOWNPOUR.mass, 3);
    } finally { s.dispose(); }
  });
  for (const direction of [-1, 1]) it(`slides along a wall and reverses with ${direction > 0 ? 'shooter' : 'intake'} leading while full`, async () => {
    const wall: CollisionAsset = { boxes: [...floor.boxes, { element: 'wall', center: [direction * 2.05, .5, 0], halfExtents: [.05, .5, 10] }], meshes: [] };
    const seeds: Vec3[] = Array.from({ length: 48 }, (_, i) => [0, .08, i * .16]);
    const s = await FieldSimulation.create(wall, seeds, true);
    try {
      s.startSession({ ...DEFAULT_MATCH, robot: '6800-downpour', preloads: 0 }, true); run(s, .6);
      const r = s.robotController!; r.chassis.teleport([0, .26, 0]); run(s, .5);
      for (const [i, f] of s.fuelSystem.records.entries()) { s.fuelSystem.capture(f, r.owner, i, r.storageSlots[i]); f.state = 'stored'; }
      r.chassis.input = { ...NEUTRAL_INPUT, forward: direction }; run(s, 1.5);
      const contact = { ...r.chassis.body.translation() };
      expect(contact.x * direction).toBeLessThan(2 - DOWNPOUR.length / 2 + .02);
      r.chassis.input = { ...NEUTRAL_INPUT, forward: direction, strafe: .15 }; run(s, 1.5);
      const slide = { ...r.chassis.body.translation() };
      expect(slide.z - contact.z).toBeGreaterThan(.2); expect(slide.y).toBeLessThan(.35);
      r.chassis.input = { ...NEUTRAL_INPUT, forward: -direction }; run(s, 1);
      expect(r.chassis.body.translation().x * direction).toBeLessThan(slide.x * direction - .8);
    } finally { s.dispose(); }
  });

});
