import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {INFRARED as D} from './definition';
import {validateRobotDefinition} from '../../validateDefinition';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {NEUTRAL_INPUT} from '../../../sim/SwerveChassis';
import type {CollisionAsset} from '../../../field/types';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const ROBOT_ID='3847-infrared' as const;
const run=(s:FieldSimulation,t:number)=>{for(let i=0;i<Math.round(t*120);i++)s.update(1/120);};
const seeds=(n:number)=>Array.from({length:n},(_,i):[number,number,number]=>[0,.08,3+i*.16]);
function fill(s:FieldSimulation){const r=s.robotController!;for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}}
describe('3847 Infrared FM',()=>{
 it('validates full-size non-overlapping cargo packing',()=>{
  expect(validateRobotDefinition(D)).toEqual([]);expect(D.mechanisms.capacity).toBe(39);expect(D.mechanisms.climb).toBe(false);
  expect(D.mechanisms.turret).toBe(false);const v=D.hopper.volume!;
  for(const [i,p]of D.cargoSlots.entries()){
   expect(p[0]-.075).toBeGreaterThanOrEqual(v.frontX-1e-8);expect(p[0]+.075).toBeLessThanOrEqual(v.backX+1e-8);
   expect(Math.abs(p[2])+.075).toBeLessThanOrEqual(v.halfWidth+1e-8);expect(p[1]+.075).toBeLessThanOrEqual(v.ceilingY+1e-8);
   expect(p[1]-.075*Math.sqrt(1+v.floorSlope!**2)).toBeGreaterThanOrEqual(v.floorY+v.floorSlope!*p[0]-1e-8);
   for(const q of D.cargoSlots.slice(i+1))expect(Math.hypot(...p.map((x,k)=>x-q[k]))).toBeGreaterThan(.15);
  }
 });
 it('deploys the carriage, compresses with shooting and supports manual retraction',async()=>{
  const s=await FieldSimulation.create(floor,seeds(8),true);
  try{s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:8},true);run(s,.7);const r=s.robotController!;
   expect(r.chassis.pose.intake).toBe(1);r.requestIntakeToggle();run(s,.7);expect(r.chassis.pose.intake).toBeLessThan(.2);
   r.input.intake=true;run(s,.3);expect(r.chassis.pose.intake).toBe(1);r.input.intake=false;r.input.shoot=true;run(s,.7);
   expect(r.chassis.pose.intake).toBeLessThan(1);expect(r.climber.attached).toBe(false);
  }finally{s.dispose();}
 });
 for(const alliance of ['blue','red'] as const)it(`fires original fuel through the real ${alliance} hub with the adjustable hood`,async()=>{
  const s=await FieldSimulation.create(field,seeds(12),true);
  try{const sign=alliance==='blue'?1:-1;s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,alliance,preloads:0},true);s.robot!.teleport([sign*6.2,.26,sign*2.1],sign===1?0:Math.PI);run(s,.7);fill(s);
   const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.input.shoot=true;run(s,7);
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(12);
   expect(s.hubs.telemetry[alliance].hits).toBeGreaterThanOrEqual(6);
   expect(r.shooter.elevation).toBeGreaterThanOrEqual(D.shooterGeometry.minElevation!);expect(r.shooter.elevation).toBeLessThanOrEqual(D.shooterGeometry.maxElevation!);
   expect(new Set(r.shooter.shots.map(e=>e.id)).size).toBe(12);expect(s.fuel.map(b=>b.handle)).toEqual(handles);
  }finally{s.dispose();}
 });
 it('collects to its full cap and fires the whole hopper without replacing bodies or payload',async()=>{
  const s=await FieldSimulation.create(floor,seeds(43),true);
  try{s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:0},true);run(s,.6);const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.input.intake=true;
   for(let i=0;i<240&&r.held.length<39;i++){const f=s.fuelSystem.records.find(f=>f.owner===null)!;f.body.setTranslation(r.toWorld({x:-.58,y:-.147,z:0}),true);f.body.setLinvel({x:0,y:0,z:0},true);s.world.propagateModifiedBodyPositionsToColliders();s.update(1/120);}
   expect(r.held).toHaveLength(39);
   r.input.intake=false;run(s,1);const v=D.hopper.volume!;
   for(const f of r.held){expect(f.local.x-.075).toBeGreaterThanOrEqual(v.frontX-.001);expect(f.local.x+.075).toBeLessThanOrEqual(v.backX+.001);expect(Math.abs(f.local.z)+.075).toBeLessThanOrEqual(v.halfWidth+.001);expect(f.local.y+.075).toBeLessThanOrEqual(v.ceilingY+.001);}
   expect(Math.max(...r.held.map(f=>f.local.y))+.075).toBeGreaterThan(v.ceilingY-.04);
   expect(r.telemetry.mass).toBeCloseTo(D.mass+39*.215,3);r.input.intake=false;r.input.shoot=true;run(s,9);
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(39);expect(r.held).toHaveLength(0);
   expect(r.telemetry.mass).toBeCloseTo(D.mass,3);expect(s.fuel.map(b=>b.handle)).toEqual(handles);
  }finally{s.dispose();}
 },30000);
 it('lands physical passes over the actual field into the alliance zone',async()=>{
  const s=await FieldSimulation.create(field,seeds(8),true);
  try{s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:0},true);s.robot!.teleport([0,.26,0]);run(s,.6);fill(s);const r=s.robotController!;r.input.shoot=true;
   const landed=new Map<number,number>();for(let i=0;i<1200;i++){s.update(1/120);for(const e of r.shooter.shots){const p=s.fuel[e.id].translation();if(p.y<.1&&!landed.has(e.id))landed.set(e.id,p.x);}}
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(8);expect(landed.size).toBe(8);
   expect([...landed.values()].filter(x=>x>4.15).length).toBeGreaterThanOrEqual(4);
  }finally{s.dispose();}
 });
 it('retains floor/wall support and fixed wheel mounts under loaded driving',async()=>{
  const s=await FieldSimulation.create(field,seeds(39),true);
  try{s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:0},true);run(s,.6);fill(s);const r=s.robotController!;
   r.chassis.teleport([6.1,.26,2.1]);r.chassis.input={...NEUTRAL_INPUT,strafe:1};run(s,1.5);
   expect(Math.abs(r.chassis.body.translation().z)+D.width/2).toBeLessThan(4.13);
   r.chassis.input={...NEUTRAL_INPUT,strafe:-1};run(s,1.2);expect(r.chassis.telemetry.grounded).toBe(4);
   expect(r.chassis.body.translation().y).toBeGreaterThan(.1);expect(r.chassis.body.rotation().x).toBe(0);expect(r.chassis.body.rotation().z).toBe(0);
  }finally{s.dispose();}
 });
});
