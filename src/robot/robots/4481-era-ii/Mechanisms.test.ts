import {describe,it,expect} from 'vitest';
import {ERA_II as D} from './definition';
import {HopperDynamics} from '../../../sim/HopperDynamics';
import {hopperObstacleContact} from '../../hopperGeometry';
import {supportsIntakeToggle} from '../../poses';
import {KEPLER} from '../1690-kepler/definition';
import {REBLITZ} from '../2910-reblitz/definition';
import {v3} from '../../../sim/vector';
import type {FuelState} from '../../../sim/FuelSystem';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import type {CollisionAsset} from '../../../field/types';
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const run=(s:FieldSimulation,t:number)=>{for(let i=0;i<Math.round(t*120);i++)s.update(1/120);};
describe('Era II optional mechanism contracts',()=>{
 it('settles a full hopper against the cone, tower and sloped funnel while preserving owned IDs',()=>{
  const h=new HopperDynamics(D),balls=D.cargoSlots.map(p=>({id:D.cargoSlots.indexOf(p),state:'stored' as FuelState,local:v3(...p)}));
  const motion={position:v3(0,.223,0),velocity:v3(),angularVelocity:v3(),rotation:{x:0,y:0,z:0,w:1}};
  for(let i=0;i<240;i++)expect(h.step(1/120,balls,{intake:1,hopper:1,hood:0},motion)).toHaveLength(0);
  expect(new Set(balls.map(f=>f.id)).size).toBe(D.mechanisms.capacity);
  for(const f of balls)for(const b of D.hopper.obstacles!)expect(hopperObstacleContact([f.local.x,f.local.y,f.local.z],b).distance).toBeGreaterThanOrEqual(.074);
  for(const [i,a]of balls.entries())for(const b of balls.slice(i+1))expect(Math.hypot(a.local.x-b.local.x,a.local.y-b.local.y,a.local.z-b.local.z)).toBeGreaterThan(.145);
 });
 it('projects an interior sphere out of a tilted fixed panel and stops it falling through',()=>{
  const box={center:[0,.05,0] as [number,number,number],halfExtents:[.04,.08,.08] as [number,number,number],angle:Math.PI/4};
  const d={...D,hopper:{...D.hopper,obstacles:[box]}},h=new HopperDynamics(d),balls=[{id:0,state:'stored' as FuelState,local:v3(0,.05,0)}];
  const motion={position:v3(0,.223,0),velocity:v3(),angularVelocity:v3(),rotation:{x:0,y:0,z:0,w:1}};
  for(let i=0;i<120;i++)h.step(1/120,balls,{intake:1,hopper:1,hood:0},motion);
  const p=balls[0].local;expect([p.x,p.y,p.z].every(Number.isFinite)).toBe(true);expect(hopperObstacleContact([p.x,p.y,p.z],box).distance).toBeGreaterThanOrEqual(.0749);
 });
 it('applies bounded disk friction only to supported fuel and reverses it without replacing IDs',()=>{
  const sample=(direction:number,y=-.007)=>{
   const h=new HopperDynamics(D),f={id:7,state:'stored' as FuelState,local:v3(-.21,y,0)};
   const motion={position:v3(0,.223,0),velocity:v3(),angularVelocity:v3(),rotation:{x:0,y:0,z:0,w:1}};
   for(let i=0;i<12;i++)h.step(1/120,[f],{intake:1,hopper:1,hood:0},motion,undefined,direction);
   expect(f.id).toBe(7);return f.local.z;
  };
  expect(sample(1)).toBeGreaterThan(.01);expect(sample(-1)).toBeLessThan(-.01);expect(sample(0)).toBeCloseTo(0,8);
  expect(sample(1,.25)).toBeCloseTo(0,8);
 });
 it('cannot trap a floor-level ball beneath an internal cone base',()=>{
  const h=new HopperDynamics(D),f={id:19,state:'stored' as FuelState,local:v3(-.038,-.007,0)};
  const motion={position:v3(0,.223,0),velocity:v3(),angularVelocity:v3(),rotation:{x:0,y:0,z:0,w:1}};
  for(let i=0;i<60;i++)h.step(1/120,[f],{intake:1,hopper:1,hood:0},motion);
  expect(hopperObstacleContact([f.local.x,f.local.y,f.local.z],D.hopper.obstacles![0]).distance).toBeGreaterThanOrEqual(.0749);
  expect(f.local.y).toBeGreaterThanOrEqual(D.hopper.volume!.floorY+.0749);
 });
 it('reverses the actual turret through its allowed range rather than crossing a cable stop',async()=>{
  const s=await FieldSimulation.create(floor,Array.from({length:8},(_,i)=>[0,.08,4+i*.16]),true);
  try{s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);s.robot!.teleport([6,.26,0],-.2);run(s,.6);const r=s.robotController!;
   for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
   const stop=182.8*Math.PI/180;r.shooter.turretYaw=182*Math.PI/180;r.input.shoot=true;
   const before=r.shooter.turretYaw;s.update(1/120);expect(r.shooter.turretYaw).toBeLessThan(before);
   for(let i=0;i<360;i++){const previous=r.shooter.turretYaw;s.update(1/120);expect(Math.abs(r.shooter.turretYaw)).toBeLessThanOrEqual(stop);expect(Math.abs(r.shooter.turretYaw-previous)).toBeLessThanOrEqual(5/120+1e-9);}
   expect(r.shooter.turretYaw).toBeLessThan(-2.5);expect(r.shooter.shotsFired).toBe(8);
  }finally{s.dispose();}
 });
 it('freezes and resets the same indexer angle used for the CAD animation',async()=>{
  const s=await FieldSimulation.create(floor,[[0,.08,4]],true);
  try{s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);const r=s.robotController!;r.input.intake=true;run(s,.3);expect(r.indexerAngle).toBeCloseTo(1.5,6);
   r.input.intake=false;r.input.reverse=true;run(s,.3);expect(r.indexerAngle).toBeCloseTo(0,6);
   s.setRunning(false);const angle=r.indexerAngle;run(s,.3);expect(r.indexerAngle).toBe(angle);
   s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);expect(r.indexerAngle).toBe(0);
  }finally{s.dispose();}
 });
 it('hides unsupported powered retraction without changing existing robot controls',()=>{
  expect(supportsIntakeToggle(D)).toBe(false);expect(supportsIntakeToggle(KEPLER)).toBe(true);expect(supportsIntakeToggle(REBLITZ)).toBe(false);
 });
 for(const mode of ['Hub','Pass'] as const)it(`enforces the ${mode} translation limit before releasing physical fuel`,async()=>{
  const s=await FieldSimulation.create(floor,Array.from({length:8},(_,i)=>[0,.08,4+i*.16]),true);
  try{s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);s.robot!.teleport([mode==='Hub'?6:0,.26,-1.5],Math.PI);run(s,.6);const r=s.robotController!;
   for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
   r.input.shoot=true;const limit=mode==='Hub'?1.7:3;
   // Keep translation over the configured threshold while the turret/hood spin up.
   for(let i=0;i<120;i++){r.chassis.body.setLinvel({x:0,y:0,z:limit+.7},true);s.update(1/120);}
   expect(r.shooter.shotsFired).toBe(0);expect(r.shooter.solution?.target.kind).toBe(mode);
   r.chassis.body.setLinvel({x:0,y:0,z:0},true);run(s,5);expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(8);
  }finally{s.dispose();}
 });
});
