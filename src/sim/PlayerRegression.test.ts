import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { partTransform } from '../robot/RobotDefinition';
import { toRobotInput } from './driveInput';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import type { CollisionAsset } from '../field/types';
const asset = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
describe('player-reported regressions', () => {
  it('deploys and retracts High Tide intake and cargo together while shooting', async () => {
    const s = await FieldSimulation.create(asset, Array.from({ length: 8 }, (_, i) => [0, .08, i * .16]), true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: '4414-high-tide' });
      const r = s.robotController!, definition = r.chassis.definition;
      const stowed = partTransform(definition, 'intake', r.chassis.pose).shift;
      expect(stowed).toBeGreaterThan(.3);
      for (const f of r.held) expect(f.local.x).toBeGreaterThan(-definition.length / 2);
      run(s, .5); expect(r.chassis.pose.intake).toBe(1);
      expect(partTransform(definition, 'intake', r.chassis.pose).shift).toBe(0);
      r.input.shoot = true; run(s, 7);
      expect(r.shooter.shotsFired).toBe(8); expect(s.hubs.telemetry.blue.hits).toBeGreaterThanOrEqual(7); expect(r.chassis.pose.intake).toBeLessThan(.05);
      expect(r.chassis.pose.hopper).toBe(r.chassis.pose.intake);
      expect(partTransform(definition, 'intake', r.chassis.pose).shift).toBeGreaterThan(.3);
      r.input.shoot = false; run(s, .5); expect(r.chassis.pose.intake).toBe(1);
    } finally { s.dispose(); }
  });
  it('scores moving High Tide shots through the physical hub mouth', async () => {
    const s = await FieldSimulation.create(asset, Array.from({ length: 8 }, (_, i) => [0, .08, i * .16]), true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: '4414-high-tide' }); s.robot!.teleport([6.2, .26, 0]); run(s, .5);
      s.robotController!.input.shoot = true; s.robot!.input = { ...NEUTRAL_INPUT, strafe: .05, turn: .15 }; run(s, 4);
      expect(s.robotController!.shooter.shotsFired).toBe(8);
      expect(s.hubs.telemetry.blue.hits).toBeGreaterThanOrEqual(6);
      expect(s.match.telemetry.blue.auto).toBeGreaterThanOrEqual(6);
    } finally { s.dispose(); }
  });
  it('toggles the linear intake once per press and holds its state until the next press', async () => {
    const s = await FieldSimulation.create(asset, [], true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: '4414-high-tide', preloads: 0 }); run(s, 1);
      const r = s.robotController!; r.input.toggleIntake = true; run(s, 1);
      expect(r.chassis.pose.intake).toBe(0); expect(r.telemetry.intakeStatus).toBe('Retracted');
      run(s, 1); expect(r.chassis.pose.intake).toBe(0);
      r.input.toggleIntake = false; run(s, .1); r.input.toggleIntake = true; run(s, .5);
      expect(r.chassis.pose.intake).toBe(1); expect(r.telemetry.intakeStatus).toBe('Extended');
    } finally { s.dispose(); }
  });
  it('queues a quick intake tap until the next simulation tick', async () => {
    const s = await FieldSimulation.create(asset, [], true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: '4414-high-tide', preloads: 0 }); run(s, 1);
      s.robotController!.requestIntakeToggle(); run(s, .6);
      expect(s.robot!.pose.intake).toBe(0);
      s.robotController!.requestIntakeToggle(); run(s, .3);
      expect(s.robot!.pose.intake).toBe(1);
    } finally { s.dispose(); }
  });
  it('keeps an early AUTO stop in AUTO when tower assessment is delayed past teleop start', async () => {
    const s = await FieldSimulation.create(asset, [], true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: 'tower-trainer', preloads: 0 });
      run(s, 21); s.match.endEarly();
      // Keep the chassis moving until the end of the assessment interval.
      const original = s.match.assessTower.bind(s.match), periods: string[] = [];
      s.match.assessTower = (alliance, level, period) => { periods.push(period); original(alliance, level, period); };
      for (let i = 0; i < 370; i++) { s.robot!.body.setLinvel({ x: .1, y: 0, z: 0 }, true); s.update(1 / 120); }
      expect(periods).not.toContain('teleop');
    } finally { s.dispose(); }
  });
  it('places left and right spawns on the matching driver side for both alliances', async () => {
    const s = await FieldSimulation.create(asset, [], true);
    try {
      for (const alliance of ['blue', 'red'] as const) {
        const sign = alliance === 'blue' ? 1 : -1;
        s.startMatch({ ...DEFAULT_MATCH, alliance, spawn: 'left', preloads: 0 }); expect(s.robot!.body.translation().z * sign).toBeGreaterThan(0);
        s.startMatch({ ...DEFAULT_MATCH, alliance, spawn: 'right', preloads: 0 }); expect(s.robot!.body.translation().z * sign).toBeLessThan(0);
      }
    } finally { s.dispose(); }
  });
  it('drives High Tide across the real field and retains bumper support at the far wall', async () => {
    const s = await FieldSimulation.create(asset, [], true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: '4414-high-tide', preloads: 0 }); run(s, 1);
      const path = [];
      for (let i = 0; i < 8; i++) {
        for (let tick = 0; tick < 60; tick++) { s.robot!.input = toRobotInput({ ...NEUTRAL_INPUT, forward: 1 }, s.robot!.telemetry.heading, 'field'); s.update(1 / 120); } const p = s.robot!.body.translation(); path.push({ ...p, grounded: s.robot!.telemetry.grounded });
        expect(p.y, JSON.stringify(path)).toBeGreaterThan(.1);
        expect(Math.abs(p.x) + (s.robot!.definition.length * Math.abs(Math.cos(s.robot!.telemetry.heading)) + s.robot!.definition.width * Math.abs(Math.sin(s.robot!.telemetry.heading))) / 2, JSON.stringify(path)).toBeLessThan(8.30);
        for (let shape = 0; shape < s.robot!.definition.colliders.length; shape++) {
          const center = s.robot!.body.collider(shape).translation(), half = s.robot!.definition.colliders[shape].halfExtents, heading = s.robot!.telemetry.heading;
          expect(Math.abs(center.x) + Math.abs(Math.cos(heading)) * half[0] + Math.abs(Math.sin(heading)) * half[2]).toBeLessThan(8.33);
          expect(Math.abs(center.z) + Math.abs(Math.sin(heading)) * half[0] + Math.abs(Math.cos(heading)) * half[2]).toBeLessThan(4.1);
        }
      }
      const contacts: string[] = [];
      for (let i = 0; i < s.robot!.body.numColliders(); i++) s.world.contactPairsWith(s.robot!.body.collider(i), c => contacts.push(s.colliderElements.get(c.handle) ?? 'other'));
      expect(s.robot!.body.translation().x, JSON.stringify({ path, modules: s.robot!.modules, contacts })).toBeLessThan(1);
    } finally { s.dispose(); }
  });
  it('keeps the extended High Tide intake inside the side wall when strafing', async () => {
    const s = await FieldSimulation.create(asset, [], true);
    try {
      s.startMatch({ ...DEFAULT_MATCH, robot: '4414-high-tide', preloads: 0 }); run(s, 1);
      s.robot!.input = { ...NEUTRAL_INPUT, strafe: 1 }; run(s, 3);
      expect(Math.abs(s.robot!.body.translation().z) + s.robot!.definition.width / 2).toBeLessThan(4.1);
      expect(s.robot!.telemetry.speed).toBeLessThan(.3);
    } finally { s.dispose(); }
  });
});
