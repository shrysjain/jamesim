import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import { NEUTRAL_INPUT } from '../../../sim/SwerveChassis';
import { HopperDynamics } from '../../../sim/HopperDynamics';
import { ALLIANCE_LINE } from '../../../field/targets';
import type { CollisionAsset, Vec3 } from '../../../field/types';
import { linkedHopperExtension, partTransform } from '../../poses';
import { validateRobotDefinition } from '../../validateDefinition';
import { DARWIN } from './definition';
const CAPACITY=DARWIN.mechanisms.capacity;
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const floor: CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const seeds=(count=12):Vec3[]=>Array.from({length:count},(_,i)=>[0,.08,(i%20)*.16]);
const run=(s:FieldSimulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*120);i++)s.update(1/120);};
const start=(s:FieldSimulation,alliance:'blue'|'red'='blue',preloads=8)=>s.startSession({...DEFAULT_MATCH,robot:'6328-darwin',alliance,preloads},true);
describe('6328 Darwin',()=>{
 it('maps the cam slot into both the actual slide and its cargo wall, retaining linear defaults',()=>{
  expect(linkedHopperExtension(DARWIN,0)).toBe(0);expect(linkedHopperExtension(DARWIN,1)).toBe(1);
  const half=linkedHopperExtension(DARWIN,.5);expect(half).toBeCloseTo(.66951137,7);
  const pose={intake:.5,hopper:half,hood:0};
  expect(partTransform(DARWIN,'hopper',pose).shift).toBeCloseTo(DARWIN.hopper.stowTravel*(1-half));
  expect(new HopperDynamics(DARWIN).front(pose)).toBeCloseTo(DARWIN.hopper.volume!.frontX+DARWIN.hopper.stowTravel*(1-half));
  expect(validateRobotDefinition({...DARWIN,hopper:{...DARWIN.hopper,intakeCurve:[0,.8,.2,1]}})).toContain('Hopper linkage samples must run monotonically from zero to one.');
 });
 it('keeps all full-size seeds inside the lowered roof with non-overlapping spheres',()=>{
  const v=DARWIN.hopper.volume!;
  for(let i=0;i<DARWIN.cargoSlots.length;i++){
    const p=DARWIN.cargoSlots[i];expect(Math.abs(p[2])+.075).toBeLessThanOrEqual(v.halfWidth+1e-8);expect(p[1]+.075).toBeLessThanOrEqual(v.ceilingY+1e-8);
   expect(p[1]-.075).toBeGreaterThanOrEqual(v.floorY+v.floorSlope!*p[0]);
   for(let j=i+1;j<DARWIN.cargoSlots.length;j++)expect(Math.hypot(...p.map((x,k)=>x-DARWIN.cargoSlots[j][k]))).toBeGreaterThan(.15);
  }
 });
 it('drives at its own target and preserves that selection on restart',async()=>{
  const s=await FieldSimulation.create(floor,[],true);
  try{start(s,'blue',0);s.robot!.teleport([0,.26,0]);run(s,.6);s.robot!.input={...NEUTRAL_INPUT,forward:1};run(s,1.8);
   expect(s.robot!.telemetry.speed).toBeCloseTo(4.2,1);expect(s.robot!.telemetry.grounded).toBe(4);
   start(s);expect(s.robot!.definition.id).toBe(DARWIN.id);expect(s.robot!.tuning.maxSpeed).toBe(4.2);
   s.startSession({...DEFAULT_MATCH,robot:'1690-kepler'},true);expect(s.robot!.tuning.maxSpeed).toBeCloseTo(14.4*.3048);
  }finally{s.dispose();}
 });
 it('uses V/controller edges for the pivot and linked slide, with Shift temporarily extending',async()=>{
  const s=await FieldSimulation.create(floor,seeds(),true);
  try{start(s);run(s,.6);const r=s.robotController!,ids=r.held.map(f=>f.id).sort();
   r.requestIntakeToggle();run(s,.6);expect(r.chassis.pose.intake).toBe(0);expect(r.chassis.pose.hopper).toBe(0);
   r.input.intake=true;run(s,.3);expect(r.chassis.pose.intake).toBe(1);expect(r.chassis.pose.hopper).toBe(1);
   r.input.intake=false;run(s,.6);expect(r.chassis.pose.intake).toBe(0);
   r.input.toggleIntake=true;run(s,.6);expect(r.chassis.pose.intake).toBe(1);run(s,.4);expect(r.chassis.pose.intake).toBe(1);
   expect(r.held.map(f=>f.id).sort()).toEqual(ids);
  }finally{s.dispose();}
 });
 it('contains a full moving/turning hopper, counts payload once and freezes on pause',async()=>{
  const s=await FieldSimulation.create(floor,seeds(CAPACITY),true);
  try{start(s,'blue',0);run(s,.6);const r=s.robotController!,handles=s.fuel.map(f=>f.handle);
   for(const[i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
   r.requestIntakeToggle();s.robot!.input={...NEUTRAL_INPUT,forward:.3,strafe:.1,turn:.15};run(s,2);
   expect(r.held).toHaveLength(CAPACITY);expect(r.chassis.pose.intake).toBe(1);expect(r.chassis.pose.hopper).toBe(1);
   const v=DARWIN.hopper.volume!;for(const f of r.held){expect(f.local.y+.075).toBeLessThanOrEqual(v.ceilingY+.002);expect(Math.abs(f.local.z)+.075).toBeLessThanOrEqual(v.halfWidth+.002);expect(f.local.x+.075).toBeLessThanOrEqual(v.backX+.002);}
   expect(r.telemetry.mass).toBeCloseTo(DARWIN.mass+CAPACITY*.215,3);expect(s.fuel.map(f=>f.handle)).toEqual(handles);
   const positions=r.held.map(f=>({...f.local})),time=s.fuelSystem.time;s.setRunning(false);run(s,.5);expect(r.held.map(f=>f.local)).toEqual(positions);expect(s.fuelSystem.time).toBe(time);
   start(s);expect(r.held).toHaveLength(8);expect(s.fuel.map(f=>f.handle)).toEqual(handles);
  }finally{s.dispose();}
 });
 for(const alliance of ['blue','red'] as const)it(`${alliance}: collects and reverses real field fuel using the original body`,async()=>{
  const s=await FieldSimulation.create(field,seeds(),true);
  try{start(s,alliance,0);run(s,.6);const r=s.robotController!,f=s.fuelSystem.records[0],handle=f.body.handle;
   f.body.setTranslation(r.toWorld({x:-.62,y:-.145,z:0}),true);f.body.setLinvel({x:0,y:0,z:0},true);s.world.propagateModifiedBodyPositionsToColliders();
   r.input.intake=true;run(s,.2);expect(f.owner).toBe(r.owner);r.input.intake=false;run(s,.3);r.input.reverse=true;run(s,.6);
   expect(f.owner).toBeNull();expect(f.body.handle).toBe(handle);expect(s.fuelSystem.records).toHaveLength(12);
  }finally{s.dispose();}
 });
 for(const alliance of ['blue','red'] as const)it(`${alliance}: stationary and moving shots score through the actual hub`,async()=>{
  const s=await FieldSimulation.create(field,seeds(),true);
  try{for(const moving of [false,true]){start(s,alliance);const sign=alliance==='blue'?1:-1;s.robot!.teleport([sign*6.2,.26,0],alliance==='blue'?Math.PI:0);run(s,.6);
   const r=s.robotController!,ids=r.held.map(f=>f.id).sort();r.input.shoot=true;if(moving)s.robot!.input={...NEUTRAL_INPUT,strafe:.05};run(s,7);
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(8);expect(r.shooter.shots.map(e=>e.id).sort()).toEqual(ids);
   expect(new Set(r.shooter.shots.map(e=>e.lane))).toEqual(new Set([0,1,2]));expect(s.hubs.telemetry[alliance].hits).toBeGreaterThanOrEqual(moving?6:7);
  }}finally{s.dispose();}
 });
 it('feeds all original IDs at the declared three-lane gameplay cadence',async()=>{
  const s=await FieldSimulation.create(floor,seeds(CAPACITY),true);
  try{start(s,'blue',0);run(s,.6);const r=s.robotController!;for(const[i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
   r.input.shoot=true;run(s,7);const shots=r.shooter.shots;expect(shots).toHaveLength(CAPACITY);expect(new Set(shots.map(e=>e.id)).size).toBe(CAPACITY);
   const rate=(CAPACITY-1)/(shots.at(-1)!.time-shots[0].time);expect(rate).toBeGreaterThan(20);expect(rate).toBeLessThanOrEqual(24.5);expect(r.held).toHaveLength(0);
  }finally{s.dispose();}
 });
 it('lands real neutral-zone passes in the alliance zone',async()=>{
  const s=await FieldSimulation.create(field,seeds(),true);
  try{start(s);s.robot!.teleport([0,.26,0],0);run(s,.6);const r=s.robotController!,landings=new Map<number,number>();r.input.shoot=true;
   for(let i=0;i<840;i++){s.update(1/120);for(const event of r.shooter.shots){const p=s.fuel[event.id].translation();if(p.y<.1&&!landings.has(event.id))landings.set(event.id,p.x);}}
   expect(r.shooter.shotsFired).toBe(8);expect(landings.size).toBe(8);expect([...landings.values()].filter(x=>x>ALLIANCE_LINE).length).toBeGreaterThanOrEqual(5);
  }finally{s.dispose();}
 });
 it('crosses the bump/trench upright, blocks roof shots and stays inside the perimeter',async()=>{
  const s=await FieldSimulation.create(field,seeds(),true);
  try{start(s);s.robot!.teleport([5.35,.26,1.65],Math.PI);run(s,.6);s.robot!.input={...NEUTRAL_INPUT,forward:1,slow:true};let height=0;
   for(let i=0;i<360;i++){s.update(1/120);height=Math.max(height,s.robot!.body.translation().y);expect(s.robot!.body.rotation().x).toBe(0);expect(s.robot!.body.rotation().z).toBe(0);}
   expect(height).toBeGreaterThan(.32);expect(height).toBeLessThan(.65);expect(s.robot!.body.translation().x).toBeLessThan(3);
   start(s);s.robot!.teleport([5.35,.26,3.35],Math.PI);run(s,.6);s.robot!.input={...NEUTRAL_INPUT,forward:1};run(s,1.2);expect(s.robot!.body.translation().x).toBeLessThan(3);
   start(s);s.robot!.teleport([3.4,.26,3.35],0);run(s,.6);s.robotController!.input.shoot=true;run(s,2);expect(s.robotController!.shooter.shotsFired).toBe(0);expect(s.robotController!.held).toHaveLength(8);
   start(s,'blue',0);s.robot!.teleport([6.4,.26,2.8],0);run(s,.6);s.robot!.input={...NEUTRAL_INPUT,forward:1};run(s,2);expect(s.robot!.body.translation().x).toBeLessThan(7.9);expect(s.robot!.body.translation().y).toBeGreaterThan(.15);
  }finally{s.dispose();}
 });
});
