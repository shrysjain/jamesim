import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import { hopperObstacleContact } from '../../hopperGeometry';
import {ERA_II as D} from './definition';
import {validateRobotDefinition} from '../../validateDefinition';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {NEUTRAL_INPUT} from '../../../sim/SwerveChassis';
import type {CollisionAsset} from '../../../field/types';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const run=(s:FieldSimulation,t:number)=>{for(let i=0;i<Math.round(t*120);i++)s.update(1/120);};
const seeds=(n:number)=>Array.from({length:n},(_,i):[number,number,number]=>[0,.08,3+i*.16]);
function fill(s:FieldSimulation){const r=s.robotController!;for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}}
describe('4481 Rembrandts Era II Worlds',()=>{
 it('packs full-size fuel around the actual cone/tower without overlaps',()=>{
  expect(validateRobotDefinition(D)).toEqual([]);expect(D.mechanisms.capacity).toBe(48);
  expect(D.mechanisms.climb).toBe(false);const v=D.hopper.volume!;
  for(const [i,p]of D.cargoSlots.entries()){
   expect(p[0]-.075).toBeGreaterThanOrEqual(v.frontX-1e-8);expect(p[0]+.075).toBeLessThanOrEqual(v.backX+1e-8);
   expect(Math.abs(p[2])+.075).toBeLessThanOrEqual(v.halfWidth+1e-8);expect(p[1]+.075).toBeLessThanOrEqual(v.ceilingY+1e-8);
   for(const b of D.hopper.obstacles!)expect(hopperObstacleContact(p,b).distance).toBeGreaterThanOrEqual(.0755);
   for(const q of D.cargoSlots.slice(i+1))expect(Math.hypot(...p.map((x,k)=>x-q[k]))).toBeGreaterThan(.15);
  }
 });
 it('deploys, compresses a light load while shooting, and extends for reverse without V/C controls',async()=>{
  const s=await FieldSimulation.create(floor,seeds(8),true);
  try{s.startSession({...DEFAULT_MATCH,robot:D.id as '4481-era-ii',preloads:8},true);run(s,.7);const r=s.robotController!;
   expect(r.chassis.pose.intake).toBe(1);r.requestIntakeToggle();r.requestClimbToggle();r.input.shoot=true;run(s,.5);
   expect(r.chassis.pose.intake).toBeLessThan(.05);expect(r.kickerDeployment).toBe(1);expect(r.climber.attached).toBe(false);r.input.shoot=false;r.input.reverse=true;run(s,.5);
   expect(r.chassis.pose.intake).toBe(1);expect(r.held.length).toBeLessThan(8);
  }finally{s.dispose();}
 });
 for(const alliance of ['blue','red'] as const)it(`fires original fuel through the ${alliance} hub while its chassis faces away`,async()=>{
  const s=await FieldSimulation.create(field,seeds(12),true);
  try{const sign=alliance==='blue'?1:-1;s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',alliance,preloads:0},true);s.robot!.teleport([sign*6.2,.26,sign*2.1],sign===1?0:Math.PI);run(s,.7);fill(s);
   const r=s.robotController!,handles=s.fuel.map(b=>b.handle),heading=r.chassis.telemetry.heading;r.input.shoot=true;run(s,7);
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(12);expect(s.hubs.telemetry[alliance].hits).toBeGreaterThanOrEqual(6);
   expect(Math.abs(r.chassis.telemetry.heading-heading)).toBeLessThan(.1);expect(Math.abs(r.shooter.turretYaw)).toBeGreaterThan(.4);
   expect(new Set(r.shooter.shots.map(e=>e.id)).size).toBe(12);expect(s.fuel.map(b=>b.handle)).toEqual(handles);
  }finally{s.dispose();}
 });
 it('collects a full hopper, preserves internal clearance and releases the same bodies',async()=>{
  const s=await FieldSimulation.create(floor,seeds(D.mechanisms.capacity+3),true);
  try{s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);run(s,.6);const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.input.intake=true;
   for(let i=0;i<360&&r.held.length<D.mechanisms.capacity;i++){const f=s.fuelSystem.records.find(f=>f.owner===null)!;f.body.setTranslation(r.toWorld({x:-.614,y:-.147,z:.23*Math.sin(i*2.39996323)}),true);f.body.setLinvel({x:0,y:0,z:0},true);s.world.propagateModifiedBodyPositionsToColliders();s.update(1/120);}
   expect(r.held).toHaveLength(D.mechanisms.capacity);r.input.intake=false;run(s,1);
   for(const f of r.held)for(const b of D.hopper.obstacles!)expect(hopperObstacleContact([f.local.x,f.local.y,f.local.z],b).distance).toBeGreaterThanOrEqual(.074);
   expect(Math.max(...r.held.map(f=>f.local.y))+.075).toBeGreaterThan(.28);
   expect(r.telemetry.mass).toBeCloseTo(D.mass+D.mechanisms.capacity*.215,3);r.input.shoot=true;run(s,10);
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(D.mechanisms.capacity);expect(r.held).toHaveLength(0);
   expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(r.telemetry.mass).toBeCloseTo(D.mass,3);
  }finally{s.dispose();}
 },30000);
 it('lands passes over real field geometry and respects mode-specific moving limits',async()=>{
  const s=await FieldSimulation.create(field,seeds(8),true);
  try{s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);s.robot!.teleport([0,.26,0]);run(s,.6);fill(s);const r=s.robotController!;r.input.shoot=true;
   const landed=new Map<number,number>();for(let i=0;i<1200;i++){s.update(1/120);for(const e of r.shooter.shots){const p=s.fuel[e.id].translation();if(p.y<.1&&!landed.has(e.id))landed.set(e.id,p.x);}}
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(8);expect([...landed.values()].filter(x=>x>4.15).length).toBeGreaterThanOrEqual(4);
  }finally{s.dispose();}
 });
 it('keeps a loaded chassis supported at the wall and allows it to drive away',async()=>{
  const s=await FieldSimulation.create(field,seeds(16),true);
  try{s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);s.robot!.teleport([6.1,.26,2.1]);run(s,.6);fill(s);const r=s.robotController!;
   r.chassis.input={...NEUTRAL_INPUT,strafe:1};run(s,1.5);const wall=r.chassis.body.translation().z;
   expect(Math.abs(wall)+D.width/2).toBeLessThan(4.13);r.chassis.input={...NEUTRAL_INPUT,strafe:-1};run(s,1.2);
   expect(r.chassis.body.translation().z).toBeLessThan(wall-.3);expect(r.chassis.telemetry.grounded).toBe(4);
   expect(r.chassis.body.rotation().x).toBe(0);expect(r.chassis.body.rotation().z).toBe(0);
  }finally{s.dispose();}
 });
});
