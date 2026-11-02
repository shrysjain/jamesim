import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {ERA_II as D} from './definition';
import type {CollisionAsset} from '../../../field/types';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const run=(s:FieldSimulation,t:number)=>{for(let i=0;i<Math.round(t*120);i++)s.update(1/120);};
const seeds=(n:number)=>Array.from({length:n},(_,i):[number,number,number]=>[0,.08,3+i*.16]);
function fill(s:FieldSimulation){const r=s.robotController!;for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}}
describe('Rembrandts fuel-dependent intake compression',()=>{
 it('retracts progressively as real shots empty a full hopper and retains every original body',async()=>{
  const s=await FieldSimulation.create(field,seeds(D.mechanisms.capacity),true);
  try{s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);s.robot!.teleport([6.2,.26,2.1]);run(s,.7);fill(s);
   const r=s.robotController!,handles=s.fuel.map(b=>b.handle);r.input.shoot=true;
   const poses=new Map<number,number>();let last=r.chassis.pose.intake;
   for(let i=0;i<1200;i++){
    s.update(1/120);const p=r.chassis.pose.intake;
    expect(r.kickerDeployment).toBe(1);
    expect(Math.abs(p-last)).toBeLessThanOrEqual(1/(.18*120)+1e-8);last=p;
    const count=r.shooter.shotsFired;
    if([0,16,32,48].includes(count))poses.set(count,p);
   }
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(48);
   expect(poses.get(0)).toBeGreaterThan(.95);expect(poses.get(16)).toBeLessThan(.8);
   expect(poses.get(32)).toBeLessThan(.4);expect(poses.get(48)).toBe(0);
   expect(poses.get(16)!).toBeGreaterThan(poses.get(32)!);expect(r.held).toHaveLength(0);
   expect(new Set(r.shooter.shots.map(e=>e.id)).size).toBe(48);expect(s.fuel.map(b=>b.handle)).toEqual(handles);
   expect(r.telemetry.mass).toBeCloseTo(D.mass,3);
  }finally{s.dispose();}
 },30000);
 it('extends for collecting/reversing, holds during pause and resets both separate mechanisms',async()=>{
  const s=await FieldSimulation.create(floor,seeds(8),true);
  try{s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:8},true);run(s,.7);const r=s.robotController!;
   r.input.shoot=true;run(s,.6);expect(r.chassis.pose.intake).toBeLessThan(.05);expect(r.kickerDeployment).toBe(1);
   s.setRunning(false);const pose={...r.chassis.pose};run(s,.5);expect(r.chassis.pose).toEqual(pose);expect(r.kickerDeployment).toBe(1);
   s.setRunning(true);r.input.shoot=true;r.input.intake=true;run(s,.3);expect(r.chassis.pose.intake).toBe(1);expect(r.kickerDeployment).toBe(1);
   r.input.intake=false;run(s,.6);expect(r.chassis.pose.intake).toBeLessThan(.05);
   r.input.reverse=true;run(s,.3);expect(r.chassis.pose.intake).toBe(1);expect(r.kickerDeployment).toBe(1);
   s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',preloads:0},true);expect(r.chassis.pose.intake).toBe(0);expect(r.kickerDeployment).toBe(0);
  }finally{s.dispose();}
 });
});
