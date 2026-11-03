import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import type {CollisionAsset} from '../../../field/types';
import {SIMBOT_TIM,TIM_TRAVEL,TIM_RISE} from './definition';
import {validateRobotDefinition} from '../../validateDefinition';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {FUEL_MASS} from '../../../sim/FuelSystem';
import {partTransform} from '../../poses';
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const run=(s:FieldSimulation,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)s.update(1/120);};
describe('1114 Simbot Tim complete CAD integration',()=>{
 it('packs independent full-size seeds in its measured envelope and keeps source-specific capabilities explicit',()=>{
  const d=SIMBOT_TIM,v=d.hopper.volume!;expect(validateRobotDefinition(d)).toEqual([]);expect(d.mechanisms.capacity).toBeGreaterThan(40);
  expect(d.mechanisms.turret).toBe(false);expect(d.mechanisms.movingShots).toBe(false);expect(d.mechanisms.climb).toBe(false);
  for(const[a,p]of d.cargoSlots.entries()){
   expect(p[0]-.075).toBeGreaterThanOrEqual(v.frontX-1e-8);expect(p[0]+.075).toBeLessThanOrEqual(v.backX+1e-8);
   expect(Math.abs(p[2])+.075).toBeLessThanOrEqual(v.halfWidth+1e-8);expect(p[1]-.075).toBeGreaterThanOrEqual(v.floorY-1e-8);expect(p[1]+.075).toBeLessThanOrEqual(v.ceilingY+1e-8);
   for(const q of d.cargoSlots.slice(a+1))expect(Math.hypot(...p.map((x,i)=>x-q[i]))).toBeGreaterThanOrEqual(.15-1e-8);
  }
  expect(partTransform(d,'intake',{intake:0,hopper:0,hood:0})).toMatchObject({shift:TIM_TRAVEL,rise:TIM_RISE});
 });
 it('contains every articulated CAD assembly and four independently normalized module roots',async()=>{
  await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const doc=await io.readBinary(readFileSync('public/assets/robots/1114-simbot-tim/robot.glb')),nodes=doc.getRoot().listNodes(),semantic=nodes.filter(n=>n.getExtras().mechanism).map(n=>n.getExtras().mechanism);
  expect(new Set(semantic).size).toBe(semantic.length);for(const n of SIMBOT_TIM.visual.requiredNodes)expect(semantic).toContain(n);
  for(const m of SIMBOT_TIM.modules)for(const suffix of['wheel','fork']){const n=nodes.find(n=>n.getExtras().mechanism===`${m.name}-${suffix}`)!;expect(n).toBeDefined();expect(n.getTranslation()[0]).toBeCloseTo(m.x);expect(n.getTranslation()[2]).toBeCloseTo(m.z);expect(n.listChildren().length).toBeGreaterThan(0);}
  const lower=nodes.find(n=>n.getExtras().mechanism==='intake-roller-lower')!,upper=nodes.find(n=>n.getExtras().mechanism==='intake-roller-upper')!;
  expect(lower.getParentNode()).toBeNull();expect(upper.getParentNode()?.getExtras().mechanism).toBe('intake');
  expect(lower.getTranslation()).toEqual(expect.arrayContaining([expect.closeTo(-.1652,4),expect.closeTo(.0952-.223,4)]));
  const rollers=[0,1,2].map(i=>nodes.find(n=>n.getExtras().mechanism===`hood-roller-${i}`)!);expect(new Set(rollers.map(n=>n.getTranslation().join(','))).size).toBe(3);
  expect(doc.getRoot().listMaterials().find(m=>m.getName()==='hopper-shell-clear')?.getAlphaMode()).toBe('BLEND');
 });
 it('limits automatic shooting compression while V can fully stow, and leaves legacy compression unchanged',async()=>{
  for(const robot of['1114-simbot-tim','2910-reblitz'] as const){
   const s=await FieldSimulation.create(floor,[],true);
   try{s.startSession({...DEFAULT_MATCH,robot,preloads:0},true);run(s,.7);const r=s.robotController!;
    r.input.shoot=true;run(s,.7);expect(r.chassis.pose.intake).toBeCloseTo(robot==='1114-simbot-tim'?6.4/13.55:0,6);
    if(robot==='1114-simbot-tim'){
     const paused={...r.chassis.pose};s.setRunning(false);run(s,.25);expect(r.chassis.pose).toEqual(paused);s.setRunning(true);
     r.input.shoot=false;r.requestIntakeToggle();run(s,.7);expect(r.chassis.pose.intake).toBe(0);
     r.input.reverse=true;run(s,.3);expect(r.chassis.pose.intake).toBe(1);
    }
   }finally{s.dispose();}
  }
  for(const value of[-.1,1.1,NaN])expect(validateRobotDefinition({...SIMBOT_TIM,intake:{...SIMBOT_TIM.intake,shootingMinExtension:value}}).length).toBeGreaterThan(0);
  expect(validateRobotDefinition({...SIMBOT_TIM,intake:{...SIMBOT_TIM.intake,stowTravel:-.2}}).length).toBeGreaterThan(0);
 });
 for(const alliance of['blue','red'] as const)it(`${alliance}: empties a full hopper through all physical lanes without replacing fuel bodies`,async()=>{
  const d=SIMBOT_TIM,s=await FieldSimulation.create(floor,Array.from({length:d.mechanisms.capacity},(_,i)=>[0,.08,i*.16]),true);
  try{
   s.startSession({...DEFAULT_MATCH,robot:'1114-simbot-tim',alliance,preloads:0},true);run(s,.6);const r=s.robotController!,handles=s.fuel.map(b=>b.handle);
   for(const[f,id]of s.fuelSystem.records.map((f,id)=>[f,id]as const)){expect(s.fuelSystem.capture(f,r.owner,id,{x:d.cargoSlots[id][0],y:d.cargoSlots[id][1],z:d.cargoSlots[id][2]})).toBe(true);f.state='stored';}
   run(s,.25);expect(r.held).toHaveLength(d.mechanisms.capacity);expect(r.chassis.body.mass()).toBeCloseTo(d.mass+d.mechanisms.capacity*FUEL_MASS,3);
   r.input.shoot=true;run(s,20);expect(r.shooter.shotsFired).toBe(d.mechanisms.capacity);expect(r.held).toHaveLength(0);expect(new Set(r.shooter.shots.map(x=>x.lane)).size).toBe(3);
   expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(new Set(s.fuelSystem.records.map(f=>f.id)).size).toBe(d.mechanisms.capacity);expect(r.chassis.body.mass()).toBeCloseTo(d.mass,3);
   s.startSession({...DEFAULT_MATCH,robot:'1114-simbot-tim',alliance,preloads:0},true);expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(r.chassis.pose.intake).toBe(0);expect(r.shooter.shotsFired).toBe(0);
  }finally{s.dispose();}
 },30000);
 for(const alliance of['blue','red']as const)for(const mode of['hub','pass']as const)it(`${alliance}: physical ${mode} shots recover from opposite headings on the actual field`,async()=>{
  const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8'))as CollisionAsset;
  const s=await FieldSimulation.create(field,Array.from({length:12},(_,i)=>[0,.08,3+i*.16]),true);
  try{const sign=alliance==='blue'?1:-1;s.startSession({...DEFAULT_MATCH,robot:'1114-simbot-tim',alliance,preloads:0},true);
   s.robot!.teleport(mode==='hub'?[sign*6.2,.26,sign*2.1]:[0,.26,0],mode==='pass'?(alliance==='blue'?Math.PI:0):(alliance==='blue'?0:Math.PI));run(s,.7);
   const r=s.robotController!,handles=s.fuel.map(b=>b.handle);for(const[i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
   r.input.shoot=true;run(s,10);expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(12);
   if(mode==='hub')expect(s.hubs.telemetry[alliance].hits).toBeGreaterThanOrEqual(6);
   else expect(r.shooter.shots.every(shot=>shot.target.kind==='Pass')).toBe(true);
   expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(r.held).toHaveLength(0);
  }finally{s.dispose();}
 },30000);

});
