import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {FUEL_RADIUS,FUEL_RESTITUTION} from '../../../sim/FuelSystem';
import {CollisionGroups} from '../../../sim/collisionGroups';
import {NEUTRAL_INPUT} from '../../../sim/SwerveChassis';
import {MATTERHORN} from './definition';
import {v3} from '../../../sim/vector';
import type {CollisionAsset} from '../../../field/types';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const run=(s:FieldSimulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*120);i++)s.update(1/120);};
const sphere=()=>new RAPIER.Ball(FUEL_RADIUS),identity={x:0,y:0,z:0,w:1};
async function setup(x:number,z:number,count=1){
 const s=await FieldSimulation.create(field,Array.from({length:count},(_,i):[number,number,number]=>[0,.08,i*.16]),true);
 s.startSession({...DEFAULT_MATCH,robot:'9496-matterhorn',preloads:0},true);
 s.robot!.teleport([x,.26,z]);run(s,.4);return s;
}
describe('Matterhorn exposed fuel and actual field CAD',()=>{
 it('drives a full load through the actual trench without carrying spheres through its beam',async()=>{
  const s=await setup(5.35,3.35,MATTERHORN.mechanisms.capacity);
  try{
   const r=s.robotController!,handles=s.fuel.map(b=>b.handle),shape=sphere();
   r.chassis.teleport([5.35,.26,3.35],Math.PI);
   for(const [i,f]of s.fuelSystem.records.entries()){expect(s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i])).toBe(true);f.state='stored';}
   run(s,.5);r.chassis.input={...NEUTRAL_INPUT,forward:1};
   const handle=[...s.colliderElements].find(([,name])=>name==='trench-535-near')![0],trench=s.world.getCollider(handle);
   let samples=0,deepest=0;
   for(let tick=0;tick<240;tick++){
    s.update(1/120);
    for(const f of r.held.filter(f=>f.state==='stored')){
     const contact=trench.contactShape(shape,r.renderPosition(f),identity,.005);
     if(contact){samples++;deepest=Math.min(deepest,contact.distance);}
    }
   }
   expect(samples).toBeGreaterThan(0);expect(deepest).toBeGreaterThan(-.004);
   expect(r.chassis.body.translation().x).toBeLessThan(3.1);expect(r.held.length).toBeGreaterThan(0);
   expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(s.fuelSystem.counts.total).toBe(MATTERHORN.mechanisms.capacity);
   for(const f of s.fuelSystem.records)if(f.owner===null)expect(f.body.isEnabled()).toBe(true);
  }finally{s.dispose();}
 },30000);
 for(const side of [-1,1])for(const z of [-3.35,3.35])it(`contacts the real trench roof at ${side}, ${z} while still carried`,async()=>{
  const s=await setup(side*3.8,z);
  try{
   const r=s.robotController!,f=s.fuelSystem.records[0],handle=f.body.handle;
   r.chassis.teleport([side*3.8,.26,z],side<0?Math.PI:0);
   const ray=new RAPIER.Ray({x:side*3.6,y:.3,z},v3(0,1,0));
   const roof=s.world.castRay(ray,1,true,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC)!;
   expect(s.colliderElements.get(roof.collider.handle)).toContain('trench-');
   const height=.3+roof.timeOfImpact,local=v3(-.2,height-r.chassis.body.translation().y-.025,0);
   expect(s.fuelSystem.capture(f,r.owner,0,local)).toBe(true);f.state='stored';
   const before=roof.collider.contactShape(sphere(),r.renderPosition(f),identity,0)!;
   expect(before.distance).toBeLessThan(-.02);
   r.preStep(1/120);
   const after=roof.collider.contactShape(sphere(),r.renderPosition(f),identity,.005);
   expect(after?.distance??0).toBeGreaterThanOrEqual(-.002);
   expect(f.owner).toBe(r.owner);expect(f.body.handle).toBe(handle);
   expect(r.renderPosition(f).y+FUEL_RADIUS).toBeLessThanOrEqual(height+.002);
  }finally{s.dispose();}
 });
 it('pushes protruding cargo away from a real trench support',async()=>{
  const s=await setup(5.35,2.75);
  try{
   const r=s.robotController!,f=s.fuelSystem.records[0];
   const origin=v3(5.35,.5,2.75),hit=s.world.castRay(new RAPIER.Ray(origin,v3(-1,0,0)),2,true,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC)!;
   expect(s.colliderElements.get(hit.collider.handle)).toContain('trench-');
   const face=origin.x-hit.timeOfImpact;
   r.chassis.teleport([face+.5,.26,2.75]);
   expect(s.fuelSystem.capture(f,r.owner,0,v3(-.46,.5-.26,0))).toBe(true);f.state='stored';
   expect(hit.collider.contactShape(sphere(),r.renderPosition(f),identity,0)!.distance).toBeLessThan(-.01);
   r.preStep(1/120);
   expect(hit.collider.contactShape(sphere(),r.renderPosition(f),identity,.005)?.distance??0).toBeGreaterThanOrEqual(-.003);
  }finally{s.dispose();}
 });
 it('pushes high side cargo away from the real perimeter',async()=>{
  const s=await setup(6.1,3.35);
  try{
   const r=s.robotController!,f=s.fuelSystem.records[0],origin=v3(6.1,.5,3.35);
   const hit=s.world.castRay(new RAPIER.Ray(origin,v3(0,0,1)),1,true,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC)!;
   expect(s.colliderElements.get(hit.collider.handle)).toContain('perimeter');
   const face=origin.z+hit.timeOfImpact;r.chassis.teleport([6.1,.26,face-.26]);
   expect(s.fuelSystem.capture(f,r.owner,0,v3(-.2,.24,.23))).toBe(true);f.state='stored';
   expect(hit.collider.contactShape(sphere(),r.renderPosition(f),identity,0)!.distance).toBeLessThan(-.02);
   r.preStep(1/120);
   expect(hit.collider.contactShape(sphere(),r.renderPosition(f),identity,.005)?.distance??0).toBeGreaterThanOrEqual(-.003);
  }finally{s.dispose();}
 });
 it('lets an original spilled body hit the trench, then restores shot/reset materials',async()=>{
  const s=await setup(3.5,3.35);
  try{
   const r=s.robotController!,f=s.fuelSystem.records[0],handle=f.body.handle;
   const origin=v3(3.6,1.5,3.35),roof=s.world.castRay(new RAPIER.Ray(origin,v3(0,-1,0)),1.2,true,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC)!;
   expect(s.colliderElements.get(roof.collider.handle)).toContain('trench-');
   const top=origin.y-roof.timeOfImpact;
   expect(s.fuelSystem.capture(f,r.owner,0,v3(origin.x-r.chassis.body.translation().x,top+.35-r.chassis.body.translation().y,0))).toBe(true);f.state='stored';
   r.chassis.body.setLinvel(v3(),true);r.chassis.body.setAngvel(v3(),true);
   f.body.collider(0).setCollisionGroups(CollisionGroups.groundFuel);r.preStep(1/120);
   expect(f.owner).toBeNull();expect(f.body.collider(0).collisionGroups()).toBe(CollisionGroups.fuel);
   expect(f.body.collider(0).restitution()).toBeCloseTo(.18);let touchedTrench=false;
   for(let i=0;i<78;i++){
    s.update(1/120);s.world.contactPairsWith(f.body.collider(0),other=>{
     if(!s.colliderElements.get(other.handle)?.startsWith('trench-'))return;
     s.world.contactPair(f.body.collider(0),other,manifold=>{if(manifold.numContacts()>0)touchedTrench=true;});
    });
   }
   expect(touchedTrench).toBe(true);expect(f.body.translation().y).toBeGreaterThan(.06);expect(f.body.handle).toBe(handle);
   expect(s.fuelSystem.capture(f,r.owner,0,v3())).toBe(true);
   expect(s.fuelSystem.release(f,origin,v3(),true)).toBe(true);
   expect(f.body.collider(0).restitution()).toBeCloseTo(FUEL_RESTITUTION);
   f.body.collider(0).setRestitution(.18);s.fuelSystem.reset();
   expect(f.body.collider(0).restitution()).toBeCloseTo(FUEL_RESTITUTION);expect(f.body.handle).toBe(handle);
  }finally{s.dispose();}
 });
});
