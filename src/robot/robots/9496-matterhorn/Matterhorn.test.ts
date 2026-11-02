import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {MATTERHORN as D} from './definition';
import {validateRobotDefinition} from '../../validateDefinition';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {NEUTRAL_INPUT} from '../../../sim/SwerveChassis';
import {HopperDynamics} from '../../../sim/HopperDynamics';
import {v3} from '../../../sim/vector';
import type {CollisionAsset} from '../../../field/types';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const ROBOT_ID='9496-matterhorn' as const;
const run=(s:FieldSimulation,t:number)=>{for(let i=0;i<Math.round(t*120);i++)s.update(1/120);};
const seeds=(n:number)=>Array.from({length:n},(_,i):[number,number,number]=>[0,.08,3+i*.16]);
function fill(s:FieldSimulation){const r=s.robotController!;for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}}
describe('9496 Matterhorn',()=>{
 it('validates fixed/reverse shooting and full-size non-overlapping forty-two-fuel packing',()=>{
  expect(validateRobotDefinition(D)).toEqual([]);expect(D.mechanisms.capacity).toBe(42);expect(D.mechanisms.climb).toBe(false);
  expect(D.shooterGeometry.yawOffset).toBe(Math.PI);const v=D.hopper.volume!;
  for(const [i,p]of D.cargoSlots.entries()){
   expect(p[0]-.075).toBeGreaterThanOrEqual(v.frontX-1e-8);expect(p[0]+.075).toBeLessThanOrEqual(v.backX+1e-8);
   expect(Math.abs(p[2])+.075).toBeLessThanOrEqual(v.halfWidth+1e-8);expect(p[1]+.075).toBeLessThanOrEqual(v.ceilingY+1e-8);
   expect(p[1]-.075*Math.sqrt(1+v.floorSlope!**2)).toBeGreaterThanOrEqual(v.floorY+v.floorSlope!*p[0]-1e-8);
   for(const q of D.cargoSlots.slice(i+1))expect(Math.hypot(...p.map((x,k)=>x-q[k]))).toBeGreaterThan(.15);
  }
 });
 it('keeps a moderate loaded turn calm while retaining finite wall contacts',()=>{
  const hopper=new HopperDynamics(D),volume=D.hopper.volume!;
  const balls=D.cargoSlots.map(([x,y,z],id)=>({id,state:'stored' as const,local:v3(x,y,z)}));
  const motion={position:v3(0,.223,0),velocity:v3(),angularVelocity:v3(),rotation:{x:0,y:0,z:0,w:1}};
  const spilled=new Set<number>();
  for(let step=0;step<480;step++){
   motion.velocity=v3(2*Math.sin(step/60),0,Math.cos(step/80));motion.angularVelocity.y=2*Math.sin(step/90);
   const active=balls.filter(f=>!spilled.has(f.id));
   for(const spill of hopper.step(1/120,active,{intake:1,hopper:1,hood:0},motion))spilled.add(spill.id);
   for(const f of active.filter(f=>!spilled.has(f.id))){
    // Housing begins at x=-.0015; this bounds the sphere surface, not its center.
    if(f.local.y<=volume.rim!.back)expect(f.local.x+.075).toBeLessThanOrEqual(-.004);
    if(f.local.y<=volume.rim!.front)expect(f.local.x-.075).toBeGreaterThanOrEqual(volume.frontX-.001);
    if(f.local.y<=volume.rim!.sides)expect(Math.abs(f.local.z)+.075).toBeLessThanOrEqual(volume.halfWidth+.001);
   }
  }
  expect(spilled.size).toBe(0);
 });
 it('releases spilled fuel as the same dynamic body with chassis velocity and no shot credit',async()=>{
  const s=await FieldSimulation.create(floor,seeds(1),true);
  try{
   s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:0},true);run(s,.6);
   const r=s.robotController!,f=s.fuelSystem.records[0],handle=f.body.handle;
   expect(s.fuelSystem.capture(f,r.owner,0,v3(-.3,.45,.45))).toBe(true);f.state='stored';
   r.chassis.body.setLinvel(v3(1,0,0),true);r.preStep(1/120);
   expect(f.owner).toBeNull();expect(f.state).toBe('loose');expect(f.body.isEnabled()).toBe(true);
   expect(f.body.handle).toBe(handle);expect(f.body.linvel().x).toBeGreaterThan(.7);
   expect(r.held).toHaveLength(0);expect(r.telemetry.mass).toBeCloseTo(D.mass,3);
   const startY=f.body.translation().y;run(s,.5);
   expect(f.body.translation().y).toBeLessThan(startY-.08);
   expect(r.shooter.shotsFired).toBe(0);expect(s.fuelSystem.counts.total).toBe(1);
   expect(s.fuel[0].handle).toBe(handle);
   const paused={...f.body.translation()};s.setRunning(false);run(s,.25);
   expect(f.body.translation()).toEqual(paused);s.setRunning(true);
   f.body.setTranslation(r.toWorld(v3(-.58,-.147,0)),true);f.body.setLinvel(v3(),true);
   s.world.propagateModifiedBodyPositionsToColliders();r.input.intake=true;run(s,.7);
   expect(f.owner).toBe(r.owner);expect(f.body.handle).toBe(handle);
   expect(r.telemetry.mass).toBeCloseTo(D.mass+.215,3);
   s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:0},true);
   expect(f.owner).toBeNull();expect(f.body.handle).toBe(handle);expect(s.fuelSystem.counts.total).toBe(1);
  }finally{s.dispose();}
 });
 it('keeps feeding sphere surfaces inside the actual curved rear guide',async()=>{
  const s=await FieldSimulation.create(floor,seeds(8),true);
  // Outer rear surfaces sampled from rays through the owner-supplied CAD,
  // at the feeder centerline. A center-only bound missed this protrusion.
  const guard=[[-.05,.2718],[0,.3035],[.1,.3143],[.2,.3150],[.3,.3011],[.325,.3090]];
  try{
   s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:0},true);run(s,.6);fill(s);
   const r=s.robotController!;r.input.shoot=true;let samples=0;
   for(let tick=0;tick<720;tick++){
    s.update(1/120);
    for(const f of r.held.filter(f=>f.state==='feeding'))for(const [height,rear]of guard){
     const dy=Math.abs(f.local.y-height);if(dy>=.075)continue;
     samples++;expect(f.local.x+Math.sqrt(.075**2-dy**2),JSON.stringify(f.local)).toBeLessThanOrEqual(rear+.001);
    }
   }
   expect(samples).toBeGreaterThan(100);expect(r.shooter.shotsFired).toBe(8);
  }finally{s.dispose();}
 });
 it('passively deploys once and does not invent powered retraction, hood articulation or climbing',async()=>{
  const s=await FieldSimulation.create(floor,seeds(8),true);
  try{s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:8},true);run(s,.7);const r=s.robotController!;
   expect(r.chassis.pose.intake).toBe(1);expect(r.chassis.pose.hopper).toBe(1);
   r.requestIntakeToggle();r.requestClimbToggle();run(s,.5);expect(r.chassis.pose.intake).toBe(1);expect(r.climber.attached).toBe(false);
   r.input.shoot=true;run(s,1);expect(r.chassis.pose.intake).toBe(1);expect(r.shooter.hood).toBe(0);
   const angle=r.shooter.elevation;run(s,1);expect(r.shooter.elevation).toBeCloseTo(angle,7);
  }finally{s.dispose();}
 });
 for(const alliance of ['blue','red'] as const)it(`fires original fuel through the real ${alliance} hub with a fixed hood`,async()=>{
  const s=await FieldSimulation.create(field,seeds(12),true);
  try{const sign=alliance==='blue'?1:-1;s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,alliance,preloads:0},true);s.robot!.teleport([sign*6.2,.26,sign*2.1],sign===1?0:Math.PI);run(s,.7);fill(s);
   const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.input.shoot=true;run(s,7);
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(12);
   expect(s.hubs.telemetry[alliance].hits).toBeGreaterThanOrEqual(6);
   expect(r.shooter.elevation).toBeCloseTo(D.shooterGeometry.fixedElevation!,6);expect(r.shooter.hood).toBe(0);
   expect(new Set(r.shooter.shots.map(e=>e.id)).size).toBe(12);expect(s.fuel.map(b=>b.handle)).toEqual(handles);
  }finally{s.dispose();}
 });
 it('collects to its intake limit and conserves every fired or naturally spilled fuel body',async()=>{
  const capacity=D.mechanisms.capacity,s=await FieldSimulation.create(floor,seeds(capacity+4),true);
  try{s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:0},true);run(s,.6);const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.input.intake=true;
   for(let i=0;i<360&&r.held.length<capacity;i++){const f=s.fuelSystem.records.find(f=>f.owner===null)!;f.body.setTranslation(r.toWorld({x:-.58,y:-.147,z:0}),true);f.body.setLinvel({x:0,y:0,z:0},true);s.world.propagateModifiedBodyPositionsToColliders();s.update(1/120);}
   expect(r.held).toHaveLength(capacity);expect(r.telemetry.mass).toBeCloseTo(D.mass+capacity*.215,3);
   const collected=r.held.map(f=>f.id);r.input.intake=false;r.input.shoot=true;run(s,9);
   // A real open hopper may shed the upper load while chassis aim turns it.
   // Every collected ID must either be fired or remain as loose spilled fuel.
   const shots=new Set(r.shooter.shots.map(e=>e.id)),spilled=collected.filter(id=>!shots.has(id));
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBeGreaterThanOrEqual(Math.floor(capacity*.75));
   expect(shots.size).toBe(r.shooter.shotsFired);expect(shots.size+spilled.length).toBe(capacity);
   for(const id of spilled){const f=s.fuelSystem.records[id];expect(f.owner).toBeNull();expect(f.state).toBe('loose');expect(f.body.isEnabled()).toBe(true);}
   expect(r.held).toHaveLength(0);
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
  const s=await FieldSimulation.create(field,seeds(D.mechanisms.capacity),true);
  try{s.startSession({...DEFAULT_MATCH,robot:ROBOT_ID,preloads:0},true);run(s,.6);fill(s);const r=s.robotController!;
   r.chassis.teleport([6.1,.26,2.1]);r.chassis.input={...NEUTRAL_INPUT,strafe:1};run(s,1.5);
   expect(Math.abs(r.chassis.body.translation().z)+D.width/2).toBeLessThan(4.13);
   r.chassis.input={...NEUTRAL_INPUT,strafe:-1};run(s,1.2);expect(r.chassis.telemetry.grounded).toBe(4);
   expect(r.chassis.body.translation().y).toBeGreaterThan(.1);expect(r.chassis.body.rotation().x).toBe(0);expect(r.chassis.body.rotation().z).toBe(0);
  }finally{s.dispose();}
 });
});
