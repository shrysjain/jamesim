import { describe, expect, it } from 'vitest';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import type { CollisionAsset } from '../field/types';
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const run=(s:FieldSimulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*120);i++)s.update(1/120);};
describe('hopper physics with shared fuel ownership',()=>{
 it('moves stored Kepler fuel with a retracting wall while preserving every ID, body and payload',async()=>{
  const s=await FieldSimulation.create(floor,Array.from({length:12},(_,i):[number,number,number]=>[0,.08,i*.16]),true);
  try{
   s.startMatch({...DEFAULT_MATCH,robot:'1690-kepler'});run(s,.6);const r=s.robotController!,handles=s.fuel.map(f=>f.handle);
   r.held.forEach((f,i)=>{f.local={x:-.45+Math.floor(i/4)*.151,y:.09,z:(i%4-1.5)*.151};});run(s,.5);
   const before=r.held.map(f=>({...f.local}));r.requestIntakeToggle();run(s,1.5);
   expect(r.chassis.pose.intake).toBe(0);expect(r.held).toHaveLength(8);
   expect(r.held.some((f,i)=>f.local.x>before[i].x+.05)).toBe(true);
   for(const f of r.held){expect(f.local.x).toBeGreaterThan(-.231);expect(f.body.isEnabled()).toBe(false);}
   expect(s.fuel.map(f=>f.handle)).toEqual(handles);expect(r.chassis.body.mass()).toBeCloseTo(54+8*.215,3);
   s.setRunning(false);const paused=r.held.map(f=>({...f.local}));run(s,1);expect(r.held.map(f=>f.local)).toEqual(paused);
   s.startMatch({...DEFAULT_MATCH,robot:'1690-kepler'});expect(s.fuel.map(f=>f.handle)).toEqual(handles);expect(r.held).toHaveLength(8);
  }finally{s.dispose();}
 });
 it('uses the same fixed-tick cargo solution at different rendering rates',async()=>{
  const positions=[];
  for(const rate of [30,60,144]){
   const s=await FieldSimulation.create(floor,Array.from({length:8},(_,i):[number,number,number]=>[0,.08,i*.16]),true);
   try{s.startMatch({...DEFAULT_MATCH,robot:'1690-kepler'});for(let i=0;i<rate*2;i++)s.update(1/rate);expect(s.fuelSystem.time, `render rate ${rate}`).toBeCloseTo(2,10);positions.push(s.robotController!.held.map(f=>({...f.local})));}finally{s.dispose();}
  }
  for(const frame of positions)for(let i=0;i<frame.length;i++){expect(frame[i].x).toBeCloseTo(positions[0][i].x,5);expect(frame[i].y).toBeCloseTo(positions[0][i].y,5);expect(frame[i].z).toBeCloseTo(positions[0][i].z,5);}
 });
});
