import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import type { CollisionAsset } from '../field/types';
const asset=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const run=(s:FieldSimulation,n:number)=>{for(let i=0;i<Math.round(n*120);i++)s.update(1/120);};
describe('stage 19.5 gameplay acceptance',()=>{
 it('deploys the hook away from the tower, captures only the own rung, winches, lowers, and stays detached',async()=>{
  for(const alliance of ['blue','red'] as const){
   const sign=alliance==='blue'?1:-1,s=await FieldSimulation.create(asset,[],true);
   try{
    s.startMatch({...DEFAULT_MATCH,robot:'1690-kepler',alliance,preloads:0});run(s,.6);const r=s.robotController!;
    r.requestClimbToggle();run(s,.8);expect(r.climber.telemetry.extension).toBe(1);expect(r.climber.attached).toBe(false);
    s.robot!.teleport([sign*7.187,.26,-sign*1.13],-sign*Math.PI/2);run(s,.8);
    expect(r.climber.attached).toBe(true);expect(r.climber.level).toBe(0);
    r.requestClimbToggle();run(s,1.4);expect(r.climber.level).toBe(1);
    const y=s.robot!.body.translation().y;s.setRunning(false);run(s,1);expect(s.robot!.body.translation().y).toBe(y);s.setRunning(true);
    r.requestClimbToggle();run(s,2);expect(r.climber.attached).toBe(false);expect(r.climber.level).toBe(0);
    run(s,1);expect(r.climber.attached).toBe(false);
    s.restartMatch();expect(r.climber.telemetry.extension).toBe(0);
   }finally{s.dispose();}
  }
 });
 it('compresses remaining Kepler cargo toward the feeder while maintaining visible travel and fuel identity',async()=>{
  const s=await FieldSimulation.create(asset,Array.from({length:50},(_,i):[number,number,number]=>[0,.08,(i%20)*.16]),true);
  try{
   s.startMatch({...DEFAULT_MATCH,robot:'1690-kepler',preloads:0});run(s,.6);const r=s.robotController!,handles=s.fuel.map(f=>f.handle);
   for(const [i,f] of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';f.local={...r.storageSlots[i]};}
   run(s,.4);r.input.shoot=true;
   let movingFeed=false,compressed=false;const previous=new Map<number,{x:number;y:number;z:number}>();
   for(let tick=0;tick<9*120;tick++){
    s.update(1/120);if(r.held.length>0&&r.held.length<30&&r.chassis.pose.intake<.7)compressed=true;
    for(const f of r.held){const last=previous.get(f.id);if(f.state==='feeding'&&last){const travel=Math.hypot(f.local.x-last.x,f.local.y-last.y,f.local.z-last.z);expect(travel).toBeLessThan(.09);if(travel>.001)movingFeed=true;}previous.set(f.id,{...f.local});}
   }
   expect(compressed).toBe(true);expect(movingFeed).toBe(true);expect(r.shooter.shotsFired).toBe(50);expect(r.held).toHaveLength(0);expect(s.fuel.map(f=>f.handle)).toEqual(handles);
   r.input.shoot=false;run(s,.3);expect(r.chassis.pose.intake).toBe(1);
  }finally{s.dispose();}
 });
});
