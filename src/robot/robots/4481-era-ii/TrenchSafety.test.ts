import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import { needsTrenchRetraction } from '../../../sim/TrenchSafety';
import { ERA_II as D } from './definition';
import type { CollisionAsset } from '../../../field/types';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const run=(s:FieldSimulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*120);i++)s.update(1/120);};

it('predicts hood travel near all four arms while leaving the hub lane open',()=>{
 for(const side of [1,-1])for(const lane of [1,-1]) {
  expect(needsTrenchRetraction({x:3.65*side,y:.4,z:3.35*lane},{x:0,y:0,z:0},.15,.15,9.4)).toBe(true);
  const p={x:4.9*side,y:.4,z:3.35*lane};
  expect(needsTrenchRetraction(p,{x:0,y:0,z:0},.15,.15,9.4)).toBe(false);
  expect(needsTrenchRetraction(p,{x:-4*side,y:0,z:0},.15,.15,9.4)).toBe(true);
 }
 expect(needsTrenchRetraction({x:3.65,y:.4,z:0},{x:4,y:0,z:0},.15,.15,9.4)).toBe(false);
});

it.each([1,-1].flatMap(side=>[1,-1].map(lane=>({side,lane}))))('retracts and inhibits shooting at side $side lane $lane, then resumes outside',async({side,lane})=>{
 const s=await FieldSimulation.create(field,Array.from({length:8},(_,i)=>[0,.08,-3+i*.16]),true);
 try {
  s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:8,alliance:side>0?'blue':'red'},true);run(s,.5);
  const r=s.robotController!,handles=s.fuel.map(b=>b.handle);
  s.robot!.teleport([3.65*side,.26,3.35*lane],side>0?0:Math.PI);
  r.shooter.elevation=D.shooterGeometry.minElevation!;r.input.shoot=true;
  run(s,.15);expect(r.shooter.elevation).toBeCloseTo(D.shooterGeometry.maxElevation!,6);
  run(s,.35);expect(r.shooter.shotsFired).toBe(0);expect(r.shooter.telemetry.mode).toBe('Blocked');
  expect(r.chassis.pose.intake).toBe(1);expect(r.held).toHaveLength(8);
  const time=s.fuelSystem.time,elevation=r.shooter.elevation;s.setRunning(false);run(s,.5);
  expect(s.fuelSystem.time).toBe(time);expect(r.shooter.elevation).toBe(elevation);
  s.setRunning(true);s.robot!.teleport([6.2*side,.26,0],side>0?0:Math.PI);r.input.shoot=true;run(s,7);
  expect(r.shooter.trenchRestricted).toBe(false);expect(r.shooter.shotsFired).toBe(8);
  expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(s.fuelSystem.records).toHaveLength(8);
 }finally{s.dispose();}
},30000);

it('vetoes a queued release when the chassis enters a trench after aiming',async()=>{
 const s=await FieldSimulation.create(field,Array.from({length:8},(_,i)=>[0,.08,-3+i*.16]),true);
 try {
  s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:8},true);
  s.robot!.teleport([6.2,.26,0]);run(s,.5);const r=s.robotController!;r.input.shoot=true;
  for(let tick=0;tick<480&&!r.held.some(f=>f.state==='feeding');tick++)run(s,1/120);
  expect(r.held.some(f=>f.state==='feeding')).toBe(true);
  const shots=r.shooter.shotsFired,handles=s.fuel.map(b=>b.handle);
  r.shooter.preStep(1/120,true);expect(r.shooter.solution).not.toBeNull();
  s.robot!.teleport([3.65,.26,3.35]);r.shooter.postStep(1/120,true);
  expect(r.shooter.telemetry.mode).toBe('Blocked');run(s,.5);
  expect(r.shooter.shotsFired).toBe(shots);expect(r.held.every(f=>f.state==='stored')).toBe(true);
  expect(s.fuel.map(b=>b.handle)).toEqual(handles);
 }finally{s.dispose();}
},30000);
