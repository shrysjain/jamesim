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
 it('uses the card drive target, acceleration and nominal traction after selection and restart', async () => {
  const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0,-.1,0], halfExtents: [25,.1,25] }], meshes: [] };
  const s = await FieldSimulation.create(floor, [], true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); s.robot!.teleport([0,.26,0]); run(s,.5);
   const r=s.robot!; r.input={ ...NEUTRAL_INPUT, forward: 1 }; run(s,.1);
   expect(Math.max(...r.modules.map(m=>Math.abs(m.speed)))).toBeCloseTo(33*.3048*.1,4);
   expect(r.tuning.grip*KEPLER.mass*9.81/4.4482216152605).toBeCloseTo(130,5);
   run(s,1.5); expect(r.telemetry.speed).toBeCloseTo(14.4*.3048,1);
   s.startMatch({ ...DEFAULT_MATCH, robot: '2910-reblitz', preloads: 0 }); expect(s.robot!.tuning.maxSpeed).toBeCloseTo(16.7*.3048);
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); expect(s.robot!.tuning.maxSpeed).toBeCloseTo(14.4*.3048);
  } finally { s.dispose(); }
 });
 it('feeds a full hopper near 13 shots/s through its single physical lane', async () => {
  const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0,-.1,0], halfExtents: [25,.1,25] }], meshes: [] };
  const s=await FieldSimulation.create(floor,Array.from({length:50}, (_,i): [number,number,number]=>[-6,.08,-3+i*.151]),true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); run(s,.5); const r=s.robotController!;
   for(const [i,f] of s.fuelSystem.records.entries()) { s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';f.local={...r.storageSlots[i]}; }
   r.input.shoot=true;run(s,7);const shots=r.shooter.shots;
   expect(shots).toHaveLength(50);expect(new Set(shots.map(e=>e.id)).size).toBe(50);expect(new Set(shots.map(e=>e.lane))).toEqual(new Set([0]));
   const rate=(shots.length-1)/(shots.at(-1)!.time-shots[0].time);
   expect(rate,`measured ${rate} shots/s`).toBeGreaterThan(12);expect(rate).toBeLessThan(13.5);
   expect(r.held).toHaveLength(0);expect(s.fuelSystem.records).toHaveLength(50);
  } finally { s.dispose(); }
 });
 it('keeps a full moving-and-turning hopper accurate through the physical hub opening', async () => {
  const s=await FieldSimulation.create(asset,Array.from({length:50}, (_,i): [number,number,number]=>[0,.08,(i%20)*.16]),true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 });s.robot!.teleport([6.2,.26,0]);run(s,.5);const r=s.robotController!;
   for(const [i,f] of s.fuelSystem.records.entries()) {s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';f.local={...r.storageSlots[i]};}
   s.robot!.input={...NEUTRAL_INPUT,strafe:.05,turn:.15};r.input.shoot=true;run(s,7);
   expect(r.shooter.shotsFired).toBe(50);expect(s.hubs.telemetry.blue.hits).toBeGreaterThanOrEqual(48);
  } finally {s.dispose();}
 });
 it('intakes 40 fuel/s when loose fuel continuously reaches the mouth, with a hard 50-fuel limit', async () => {
  const s=await FieldSimulation.create(asset,Array.from({length:54}, (_,i): [number,number,number]=>[0,.08,(i%20)*.16]),true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 });run(s,.5);const r=s.robotController!;
   const { rotate, add, v3 }=await import('./vector');r.input.intake=true;
   // Supply one existing loose body immediately before each capture opportunity.
   const begin=s.fuelSystem.time;
   while(r.held.length<50 && s.fuelSystem.time-begin<2) {
    const f=s.fuelSystem.records.find(f=>f.owner===null)!;
    f.body.setTranslation(add(s.robot!.body.translation(),rotate(v3(-.66,-.145,0),s.robot!.body.rotation())),true);f.body.setLinvel(v3(),true);
    s.world.propagateModifiedBodyPositionsToColliders();run(s,1/120);
    if(s.fuelSystem.time-begin<=1+.00001) expect(r.held.length).toBeLessThanOrEqual(40);
   }
   const elapsed=s.fuelSystem.time-begin;expect(r.held).toHaveLength(50);expect(elapsed).toBeCloseTo(50/40,1);
   const extra=s.fuelSystem.records.find(f=>f.owner===null)!;
   extra.body.setTranslation(add(s.robot!.body.translation(),rotate(v3(-.66,-.145,0),s.robot!.body.rotation())),true);extra.body.setLinvel(v3(),true);run(s,.1);
   expect(extra.owner).toBeNull();expect(r.held).toHaveLength(50);expect(s.fuelSystem.records).toHaveLength(54);
  } finally { s.dispose(); }
 });
 it('uses Kepler’s 32 ft passing limit while preserving the 2910 default', async () => {
  const floor: CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
  const s=await FieldSimulation.create(floor,[],true);
  try {
   const {ALLIANCE_LINE}=await import('../field/targets');
   const x=ALLIANCE_LINE+.45-32.5*.3048;
   for(const [robot,inRange] of [['1690-kepler',false],['2910-reblitz',true]] as const) {
    s.startMatch({...DEFAULT_MATCH,robot,preloads:0});s.robot!.teleport([x,.26,0]);run(s,.5);
    expect(!!s.robotController!.shooter.solve()).toBe(inRange);
   }
  } finally {s.dispose();}
 });
 it('packs full-size fuel inside the measured hopper width and height', () => {
  const slots = KEPLER.cargoSlots!; expect(slots).toHaveLength(50);
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
   for (const robot of ['1690-kepler', '2910-reblitz', '1690-kepler'] as const) for (const alliance of ['blue', 'red'] as const) {
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
 it('fills all 50 slots using original fuel IDs and prevents retraction through cargo', async () => {
  const s = await FieldSimulation.create(asset, Array.from({length:64}, (_,i): [number,number,number] => [0,.08,(i%20)*.16]), true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); run(s,.5); const r=s.robotController!;
   const handles=s.fuel.map(f=>f.handle); const { rotate, add, v3 }=await import('./vector');
   r.input.intake=true;
   for(let i=0;i<50;i++) {
    const f=s.fuelSystem.records[i]; f.body.setTranslation(add(s.robot!.body.translation(),rotate(v3(-.66,-.145,0),s.robot!.body.rotation())),true);f.body.setLinvel(v3(),true);
    s.world.propagateModifiedBodyPositionsToColliders();run(s,.10);
   }
   expect(r.held).toHaveLength(50);r.input.intake=false;r.requestIntakeToggle();run(s,.6);
   expect(r.chassis.pose.intake).toBe(1);expect(r.telemetry.intakeStatus).toBe('Cargo limited');
   expect(r.telemetry.mass).toBeCloseTo(KEPLER.mass+50*.215,3);expect(s.fuel.map(f=>f.handle)).toEqual(handles);
  } finally { s.dispose(); }
 });
 it('supports L1 on the real tower, holds during assessment, then lowers and releases', async () => {
  const s = await FieldSimulation.create(asset, [], true);
  try {
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 });
   s.robot!.teleport([7.187, .26, -1.13], -Math.PI/2); run(s, 1); const r = s.robotController!;
   r.requestClimbToggle(); run(s, 1); r.requestClimbToggle(); run(s, 2); expect(r.climber.attached).toBe(true);
   expect(r.climber.telemetry.lift).toBeCloseTo(.212); expect(r.climber.level).toBe(1);
   s.match.endEarly(); run(s, 3.1); expect(s.match.telemetry.blue.autoTower).toBe(15);
   s.startMatch({ ...DEFAULT_MATCH, robot: '1690-kepler', preloads: 0 }); s.robot!.teleport([7.187, .26, -1.13], -Math.PI/2); run(s, 1);
   r.requestClimbToggle(); run(s, 1); r.requestClimbToggle(); run(s, 2); r.requestClimbToggle(); run(s, 2);
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
