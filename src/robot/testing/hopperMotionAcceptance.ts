import { describe, expect, it } from 'vitest';
import { ROBOTS } from '../registry';
import type { RobotId } from '../registry';
import type { RobotSimulation } from '../../sim/RobotSimulation';
import { FieldSimulation } from '../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../sim/MatchRules';
import { NEUTRAL_INPUT } from '../../sim/SwerveChassis';
import { v3 } from '../../sim/vector';
import type { CollisionAsset, Vec3 } from '../../field/types';

const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const run=(s:FieldSimulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*120);i++)s.update(1/120);};
/** Actual floor acquisition and driving, rather than placing a decorative full stack. */
export function hopperMotionAcceptance(id:RobotId,minimumRetained:number,minimumHeight:number,opposite=false){
 describe(`${id} ${opposite?'opposite':'primary'} loose cargo`,()=>{
  it('fills from the physical intake, stacks above the bed, and moves on acceleration',async()=>{
   const d=ROBOTS[id],s=await FieldSimulation.create(floor,Array.from({length:d.mechanisms.capacity+12},(_,i):Vec3=>[0,.08,3+i*.16]),true);
   try{
    s.startSession({...DEFAULT_MATCH,robot:id,preloads:0},true);run(s,.7);const r=s.robotController!,handles=s.fuel.map(b=>b.handle);
    if(opposite){const control=r as RobotSimulation&{requestIntakeSwitch?:()=>void};expect(typeof control.requestIntakeSwitch).toBe('function');control.requestIntakeSwitch!();run(s,.8);}
    const region=opposite?(d.pickup as typeof d.pickup&{opposed?:typeof d.pickup}).opposed!:d.pickup;
    r.input.intake=true;let maxHeld=0;
    for(let attempt=0;attempt<d.mechanisms.capacity*3&&r.held.length<r.capacity;attempt++){
     const f=s.fuelSystem.records.find(f=>f.owner===null&&f.state==='loose');
     if(!f){run(s,.2);continue;}
     const z=(attempt%5-2)*.12;
     f.body.setTranslation(r.toWorld(v3((region.minX+region.maxX)/2,-.147,z)),true);
     f.body.setLinvel(r.chassis.body.linvel(),true);s.world.propagateModifiedBodyPositionsToColliders();
     run(s,.1);maxHeld=Math.max(maxHeld,r.held.length);
    }
    r.input.intake=false;run(s,1);
    const top=Math.max(...r.held.map(f=>f.local.y));
    const evidence=JSON.stringify({id,opposite,capacity:r.capacity,maxHeld,retained:r.held.length,top});
    expect(maxHeld,evidence).toBeGreaterThanOrEqual(r.capacity-2);expect(r.held.length,evidence).toBeGreaterThanOrEqual(minimumRetained);
    expect(top,evidence).toBeGreaterThan(minimumHeight);
    const before=new Map(r.held.map(f=>[f.id,{...f.local}]));
    r.chassis.input={...NEUTRAL_INPUT,forward:.7,strafe:.35,turn:.22};run(s,.4);
    r.chassis.input={...NEUTRAL_INPUT};run(s,.4);
    const shifted=r.held.filter(f=>before.has(f.id)).map(f=>{const p=before.get(f.id)!;return Math.hypot(f.local.x-p.x,f.local.y-p.y,f.local.z-p.z);});
    expect(Math.max(...shifted)).toBeGreaterThan(.025);
    expect(s.fuel.map(b=>b.handle)).toEqual(handles);
    for(const f of s.fuelSystem.records)expect(f.body.isEnabled()).toBe(f.owner===null);
    const snapshot=r.held.map(f=>({...f.local}));s.setRunning(false);run(s,.5);expect(r.held.map(f=>({...f.local}))).toEqual(snapshot);
    s.startSession({...DEFAULT_MATCH,robot:id,preloads:0},true);expect(r.held).toHaveLength(0);expect(s.fuel.map(b=>b.handle)).toEqual(handles);
   }finally{s.dispose();}
  },30000);
 });
}
