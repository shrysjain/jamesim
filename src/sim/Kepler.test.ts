import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { KEPLER, partTransform } from '../robot/RobotDefinition';
import { NEUTRAL_INPUT } from './SwerveChassis';
import type { CollisionAsset } from '../field/types';
const asset = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
const seeds = Array.from({ length: 12 }, (_, i): [number, number, number] => [0, .08, i * .16]);
describe('CAD-backed Kepler player flow', () => {
 it('packs full-size fuel inside the measured hopper width and height', () => {
  const slots = KEPLER.cargoSlots!; expect(slots).toHaveLength(60);
  for (let i = 0; i < slots.length; i++) {
   expect(Math.abs(slots[i][2]) + .075).toBeLessThan(.36);
   expect(slots[i][1] + .223 + .075).toBeLessThan(.551);
   for (let j = i + 1; j < slots.length; j++) expect(Math.hypot(...slots[i].map((v,k) => v - slots[j][k]))).toBeGreaterThan(.15);
  }
  for (const [x] of slots.slice(0,8)) expect(x - .075).toBeGreaterThan(-.3175);
 });
 it('switches models without retaining old bodies or losing fuel, on both alliances', async () => {
  const s = await FieldSimulation.create(asset, seeds, true);
  try {
   for (const robot of ['1690-kepler', '2910-reblitz', '4414-high-tide', '1690-kepler'] as const) for (const alliance of ['blue', 'red'] as const) {
    s.startMatch({ ...DEFAULT_MATCH, robot, alliance }); run(s, .6);
    expect(s.robot!.definition.id).toBe(robot); expect(s.robotController!.held.length).toBe(8);
    expect(s.fuelSystem.records.length).toBe(12); expect(s.robot!.telemetry.grounded).toBe(4);
    expect(s.robot!.body.translation().y).toBeGreaterThan(.15);
   }
  } finally { s.dispose(); }
 });
 it('slides along the inclined rails and leaves the passive kicker down after retracting', async () => {
  const s = await FieldSimulation.create(asset, seeds, true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler' }); const r = s.robotController!;
   const start = partTransform(KEPLER, 'intake', r.chassis.pose); expect(start.shift).toBe(.312); expect(start.rise).toBe(.0691);
   run(s, .7); expect(r.kickerDeployment).toBe(1);
   r.requestIntakeToggle(); run(s, .6); expect(r.chassis.pose.intake).toBe(0); expect(r.kickerDeployment).toBe(1);
   expect(r.chassis.pose.hopper).toBe(1); r.input.intake = true; run(s, .3); expect(r.chassis.pose.intake).toBe(1);
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler' }); expect(s.robotController!.kickerDeployment).toBe(0);
  } finally { s.dispose(); }
 });
 it('collects and reverses physical fuel through the CAD intake mouth', async () => {
  const s = await FieldSimulation.create(asset, seeds, true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); run(s, .6); const r = s.robotController!;
   const p = s.robot!.body.translation(), q = s.robot!.body.rotation();
   // Spawn in the clear intake mouth in the robot frame, accounting for alliance heading.
   const { rotate, add, v3 } = await import('./vector');
   const f = s.fuelSystem.records[0]; f.body.setTranslation(add(p, rotate(v3(-.66, -.145, 0), q)), true); f.body.setLinvel(v3(), true);
   r.input.intake = true; run(s, .15); expect(r.held.map(f => f.id)).toContain(0);
   r.input.intake = false; run(s, .4); r.input.reverse = true; run(s, .6);
   expect(r.held).toHaveLength(0); expect(f.state).toBe('loose'); expect(s.fuelSystem.records).toHaveLength(12);
  } finally { s.dispose(); }
 });
 it('uses the offset turret bearing for the muzzle and scores stationary and moving shots', async () => {
  const s = await FieldSimulation.create(asset, seeds, true);
  try {
   for (const moving of [false, true]) {
    s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler' }); s.robot!.teleport([6.2, .26, 0]); run(s, .5); const r = s.robotController!;
    const a = r.shooter.muzzleLocal(Math.PI / 3, 0); r.shooter.turretYaw = Math.PI; const b = r.shooter.muzzleLocal(Math.PI / 3, 0);
    expect((a.x + b.x) / 2).toBeCloseTo(.134); expect((a.z + b.z) / 2).toBeCloseTo(.1872);
    r.shooter.turretYaw = 0; r.input.shoot = true;
    if (moving) s.robot!.input = { ...NEUTRAL_INPUT, strafe: .05, turn: .15 };
    run(s, 7); expect(r.shooter.shotsFired, JSON.stringify(r.shooter.telemetry)).toBe(8);
    expect(s.hubs.telemetry.blue.hits).toBeGreaterThanOrEqual(moving ? 6 : 7);
   }
  } finally { s.dispose(); }
 });
 it('fills all 60 slots using original fuel IDs and prevents retraction through cargo', async () => {
  const s = await FieldSimulation.create(asset, Array.from({length:64}, (_,i): [number,number,number] => [0,.08,(i%20)*.16]), true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); run(s,.5); const r=s.robotController!;
   const handles=s.fuel.map(f=>f.handle); const { rotate, add, v3 }=await import('./vector');
   r.input.intake=true;
   for(let i=0;i<60;i++) {
    const f=s.fuelSystem.records[i]; f.body.setTranslation(add(s.robot!.body.translation(),rotate(v3(-.66,-.145,0),s.robot!.body.rotation())),true);f.body.setLinvel(v3(),true);
    s.world.propagateModifiedBodyPositionsToColliders();run(s,.10);
   }
   expect(r.held).toHaveLength(60);r.input.intake=false;r.requestIntakeToggle();run(s,.6);
   expect(r.chassis.pose.intake).toBe(1);expect(r.telemetry.intakeStatus).toBe('Cargo limited');
   expect(r.telemetry.mass).toBeCloseTo(KEPLER.mass+60*.215,3);expect(s.fuel.map(f=>f.handle)).toEqual(handles);
  } finally { s.dispose(); }
 });
 it('supports L1 on the real tower, holds during assessment, then lowers and releases', async () => {
  const s = await FieldSimulation.create(asset, [], true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 });
   s.robot!.teleport([6.7, .26, -.288925]); run(s, 1); const r = s.robotController!;
   r.input.climb = true; run(s, 5); expect(r.climber.attached).toBe(true);
   expect(r.climber.telemetry.lift).toBeCloseTo(.212); expect(r.climber.level).toBe(1);
   s.match.endEarly(); run(s, 3.1); expect(s.match.telemetry.blue.autoTower).toBe(15);
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); s.robot!.teleport([6.7, .26, -.288925]); run(s, 1);
   r.input.climb = true; run(s, 3); r.input.climb = false; r.input.lower = true; run(s, 2);
   expect(r.climber.attached).toBe(false); expect(r.climber.level).toBe(0);
  } finally { s.dispose(); }
 });
 it('can collect fuel while firing without losing or duplicating IDs', async () => {
  const s = await FieldSimulation.create(asset, seeds, true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler' }); run(s, .5); const r = s.robotController!;
   const { rotate, add, v3 } = await import('./vector'); const f = s.fuelSystem.records[8];
   f.body.setTranslation(add(s.robot!.body.translation(), rotate(v3(-.66, -.145, 0), s.robot!.body.rotation())), true); f.body.setLinvel(v3(), true);
   r.input.intake = true; r.input.shoot = true; run(s, .15); expect(f.owner).toBe(r.owner);
   expect(r.chassis.pose.intake).toBe(1); run(s, 6); expect(r.shooter.shotsFired).toBeGreaterThanOrEqual(8);
   expect(new Set(s.fuelSystem.records.map(f => f.id)).size).toBe(12);
  } finally { s.dispose(); }
 });
 it('retains field-wall support for the wider CAD chassis', async () => {
  const s = await FieldSimulation.create(asset, [], true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); run(s, .5);
   s.robot!.input = { ...NEUTRAL_INPUT, strafe: 1 }; run(s, 3);
   expect(Math.abs(s.robot!.body.translation().z) + KEPLER.width / 2).toBeLessThan(4.1);
   expect(s.robot!.telemetry.speed).toBeLessThan(.3); expect(s.robot!.body.translation().y).toBeGreaterThan(.15);
  } finally { s.dispose(); }
 });
});
