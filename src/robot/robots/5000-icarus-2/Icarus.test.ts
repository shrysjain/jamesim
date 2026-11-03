import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import type {CollisionAsset,Vec3} from '../../../field/types';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {FUEL_MASS,FUEL_RADIUS} from '../../../sim/FuelSystem';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {NEUTRAL_INPUT,nextWheelSpeed} from '../../../sim/SwerveChassis';
import {rotate,v3} from '../../../sim/vector';
import {hopperObstacleContact} from '../../hopperGeometry';
import {ICARUS as D} from './definition';
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const run=(s:FieldSimulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*120);i++)s.update(1/120);};
async function setup(count=4,asset=floor,alliance:'blue'|'red'='blue'){
 const s=await FieldSimulation.create(asset,Array.from({length:count},(_,i):Vec3=>[(i%7)*.16-.48,.08,Math.floor(i/7)*.16-.48]),true);
 s.startSession({...DEFAULT_MATCH,robot:'5000-icarus-2',alliance,preloads:0},true);run(s,.6);return s;
}
function conserved(s:FieldSimulation,handles:number[]){
 const r=s.robotController!,c=s.fuelSystem.counts;
 expect(c.loose+c.airborne+c.stored+c.transferring+c.feeding+c.hubTransit).toBe(c.total);
 expect(s.fuel.map(b=>b.handle)).toEqual(handles);
 expect(new Set(s.fuelSystem.records.map(f=>f.id)).size).toBe(handles.length);
 expect(r.chassis.body.mass()).toBeCloseTo(D.mass+r.held.length*FUEL_MASS,3);
 for(const f of s.fuelSystem.records)expect(f.body.isEnabled()).toBe(f.owner===null);
}
function place(s:FieldSimulation,i:number,x:number,z:number,outwardSpeed=0){
 const r=s.robotController!,f=s.fuelSystem.records[i];
 f.body.setTranslation(r.toWorld(v3(x,-.147,z)),true);
 f.body.setLinvel(rotate(v3(outwardSpeed,0,0),r.chassis.body.rotation()),true);
 s.world.propagateModifiedBodyPositionsToColliders();
}
describe('5000 Icarus2.0 mechanism integration',()=>{
 it('stops wheel spin before using the remaining tick for powered reverse',()=>{
  expect(nextWheelSpeed(.1,-5,.01,10,20)).toBeCloseTo(-.05);
  expect(nextWheelSpeed(0,5,.01,10,20)).toBeCloseTo(.1);
  expect(nextWheelSpeed(5,0,.01,10,20)).toBeCloseTo(4.8);
 });
 it('packs full150mm fuel inside the actual hopper envelope and outside the coaxial feeder',()=>{
  expect(D.cargoSlots.length).toBe(51);const v=D.hopper.volume!;
  for(const [i,p] of D.cargoSlots.entries()){
   expect(p[0]-FUEL_RADIUS).toBeGreaterThanOrEqual(v.frontX);expect(p[0]+FUEL_RADIUS).toBeLessThanOrEqual(v.backX);
   expect(Math.abs(p[2])+FUEL_RADIUS).toBeLessThanOrEqual(v.halfWidth);
   expect(p[1]-FUEL_RADIUS).toBeGreaterThanOrEqual(v.floorY-1e-12);expect(p[1]+FUEL_RADIUS).toBeLessThanOrEqual(v.ceilingY);
   for(const o of D.hopper.obstacles!)expect(hopperObstacleContact(p,o).distance).toBeGreaterThanOrEqual(FUEL_RADIUS);
   for(const q of D.cargoSlots.slice(i+1))expect(Math.hypot(...p.map((n,k)=>n-q[k]))).toBeGreaterThanOrEqual(.15);
  }
 });
 for(const alliance of ['blue','red'] as const)it(`${alliance}: acquires both sides once, rejects departing fuel and reverses through both mouths`,async()=>{
  const s=await setup(4,floor,alliance);
  try{const r=s.robotController!,handles=s.fuel.map(b=>b.handle);
   place(s,0,-.58,.12);place(s,1,.58,.12);place(s,2,-.58,-.17,-2);place(s,3,.58,-.17,2);
   r.input.intake=true;run(s,.22);
   expect(s.fuelSystem.records[0].owner).toBe(r.owner);expect(s.fuelSystem.records[1].owner).toBe(r.owner);
   expect(s.fuelSystem.records[2].owner).toBeNull();expect(s.fuelSystem.records[3].owner).toBeNull();
   run(s,.4);expect(r.held).toHaveLength(2);
   r.input.intake=false;r.input.reverse=true;run(s,.9);
   expect(r.held).toHaveLength(0);
   const q=r.chassis.body.rotation(),p=r.chassis.body.translation();
   // Original IDs leave on the nearer side rather than crossing the entire hopper.
   const axis=rotate(v3(1,0,0),q);
   const side=(i:number)=>{const b=s.fuel[i].translation();return(b.x-p.x)*axis.x+(b.z-p.z)*axis.z;};
   expect(side(0)).toBeLessThan(-.7);expect(side(1)).toBeGreaterThan(.7);conserved(s,handles);
  }finally{s.dispose();}
 });
 it('checks the field path for each mouth and reverses loose fuel with an equal chassis reaction',async()=>{
  const s=await setup(2);
  try{const r=s.robotController!,handles=s.fuel.map(b=>b.handle),p=r.toWorld(v3(.615,-.10,0));
   const wall=s.world.createCollider(RAPIER.ColliderDesc.cuboid(.005,.18,.35).setTranslation(p.x,p.y,p.z));s.colliderElements.set(wall.handle,'test-opposed-mouth-wall');s.world.step();
   place(s,0,-.65,0);place(s,1,.65,0);r.input.intake=true;
   for(let i=0;i<24;i++)r.postStep(1/120);
   expect(s.fuelSystem.records[0].owner).toBe(r.owner);expect(s.fuelSystem.records[1].owner).toBeNull();
   s.world.removeCollider(wall,true);s.colliderElements.delete(wall.handle);
   r.input.intake=false;r.input.reverse=true;place(s,1,.58,0);
   const before={...s.fuel[1].linvel()},chassis={...r.chassis.body.linvel()};r.postStep(1/120);
   expect(s.fuel[1].linvel().x-before.x).toBeGreaterThan(0);expect(r.chassis.body.linvel().x-chassis.x).toBeLessThan(0);
   r.preStep(1/120);conserved(s,handles);
  }finally{s.dispose();}
 });
 it('discharges a full real-field hopper, compresses both sides and preserves every body through pause and restart',async()=>{
  const s=await setup(D.mechanisms.capacity,field);
  try{const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.chassis.teleport([7.2,.26,2.2],Math.PI);run(s,.5);
   for(const [i,f] of s.fuelSystem.records.entries()){expect(s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i])).toBe(true);f.state='stored';}
   run(s,.3);expect(r.held).toHaveLength(D.mechanisms.capacity);expect(r.chassis.pose.intake).toBe(1);conserved(s,handles);
   s.setRunning(false);const cargo=r.held.map(f=>({...f.local})),clock=s.fuelSystem.time;run(s,.3);
   expect(r.held.map(f=>f.local)).toEqual(cargo);expect(s.fuelSystem.time).toBe(clock);
   s.setRunning(true);r.input.shoot=true;let halfway=1;
   for(let i=0;i<1500&&r.held.length;i++){s.update(1/120);if(r.shooter.shotsFired>=25&&r.shooter.shotsFired<=28)halfway=r.chassis.pose.intake;}
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(D.mechanisms.capacity);
   expect(new Set(r.shooter.shots.map(e=>e.id)).size).toBe(D.mechanisms.capacity);expect(r.held).toHaveLength(0);
   expect(halfway).toBeLessThan(.8);run(s,.5);expect(r.chassis.pose.intake).toBe(0);conserved(s,handles);
   const spins=s.fuel.map(b=>b.angvel()).map(a=>Math.hypot(a.x,a.y,a.z));expect(Math.max(...spins)).toBeGreaterThan(5);
   s.startSession({...DEFAULT_MATCH,robot:'5000-icarus-2',preloads:8},true);
   expect(r.held).toHaveLength(8);expect(r.shooter.shotsFired).toBe(0);expect(r.chassis.pose.intake).toBe(0);conserved(s,handles);
  }finally{s.dispose();}
 },30000);

 it('fires on the move with original physical projectiles and bounded source cable travel',async()=>{
  const s=await setup(8,field);
  try{const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.chassis.teleport([6.5,.26,1.8],Math.PI);run(s,.5);
   for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
   r.input.shoot=true;r.chassis.input={...NEUTRAL_INPUT,strafe:.08};let movingLaunches=0,previous=0;
   for(let i=0;i<720&&r.held.length;i++){
    s.update(1/120);if(r.shooter.shotsFired>previous&&r.chassis.telemetry.speed>.25)movingLaunches+=r.shooter.shotsFired-previous;previous=r.shooter.shotsFired;
    expect(r.shooter.turretYaw).toBeGreaterThanOrEqual(D.shooterGeometry.turretLimits![0]-1e-10);
    expect(r.shooter.turretYaw).toBeLessThanOrEqual(D.shooterGeometry.turretLimits![1]+1e-10);
   }
   expect(r.shooter.shotsFired).toBe(8);expect(movingLaunches).toBeGreaterThan(0);conserved(s,handles);
  }finally{s.dispose();}
 },30000);
 for(const direction of [-1,1])it(`slides and backs away from a wall with the ${direction>0?'opposed':'primary'} intake leading`,async()=>{
  const wall:CollisionAsset={boxes:[...floor.boxes,{element:'wall',center:[direction*2.05,.5,0],halfExtents:[.05,.5,10]}],meshes:[]};
  const s=await setup(D.mechanisms.capacity,wall);
  try{const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.chassis.teleport([0,.26,0]);run(s,.5);
   for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
   r.chassis.input={...NEUTRAL_INPUT,forward:direction};run(s,1.5);const contact={...r.chassis.body.translation()};
   expect(contact.x*direction).toBeLessThan(2-D.length/2+.02);
   r.chassis.input={...NEUTRAL_INPUT,forward:direction,strafe:.15};run(s,1.5);const slide={...r.chassis.body.translation()};
   expect(slide.z-contact.z).toBeGreaterThan(.2);expect(slide.y).toBeLessThan(.35);
   r.chassis.input={...NEUTRAL_INPUT,forward:-direction};run(s,1);
   expect(r.chassis.body.translation().x*direction).toBeLessThan(slide.x*direction-.8);conserved(s,handles);
  }finally{s.dispose();}
 },30000);
 it.each([-1,1])('crosses the real bump with either extended intake leading (%i)',async direction=>{
  const s=await setup(0,field);
  try{const r=s.robotController!;r.chassis.teleport([direction*5.5,.26,1.5],0);run(s,.5);
   r.chassis.input={...NEUTRAL_INPUT,forward:-direction};let peak=0,maxVisualTilt=0;
   for(let i=0;i<240;i++){s.update(1/120);peak=Math.max(peak,r.chassis.body.translation().y);maxVisualTilt=Math.max(maxVisualTilt,r.chassis.telemetry.tilt);expect(r.chassis.body.rotation().x).toBe(0);expect(r.chassis.body.rotation().z).toBe(0);}
   expect(direction*r.chassis.body.translation().x).toBeLessThan(3);expect(peak).toBeGreaterThan(.33);expect(peak).toBeLessThan(.9);
   expect(maxVisualTilt).toBeGreaterThan(3);expect(maxVisualTilt).toBeLessThan(15.1);
  }finally{s.dispose();}
 },30000);
});
