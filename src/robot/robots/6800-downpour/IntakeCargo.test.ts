import { describe, expect, it } from 'vitest';
import { DOWNPOUR } from './definition';
import { hopperObstacles, hopperObstacleContact } from '../../hopperGeometry';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import type { CollisionAsset, Vec3 } from '../../../field/types';
const floor: CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const run=(s:FieldSimulation,n:number)=>{for(let i=0;i<Math.round(n*120);i++)s.update(1/120)};

describe('Downpour pivot contacts with stored fuel',()=>{
 it('clears the last physical intake transfer when a manual fold starts',async()=>{
  const s=await FieldSimulation.create(floor,[[0,.08,3]],true);
  try{
   s.startSession({...DEFAULT_MATCH,robot:'6800-downpour',preloads:0},true);run(s,.6);
   const r=s.robotController!,f=s.fuelSystem.records[0],handle=f.body.handle;
   r.input.intake=true;f.body.setTranslation(r.toWorld({x:-.59,y:-.147,z:0}),true);
   s.world.propagateModifiedBodyPositionsToColliders();run(s,4/120);expect(f.state).toBe('transferring');
   r.input.intake=false;r.requestIntakeToggle();
   for(let tick=0;tick<120;tick++){
    s.update(1/120);
    for(const box of hopperObstacles(DOWNPOUR,r.chassis.pose))expect(hopperObstacleContact([f.local.x,f.local.y,f.local.z],box).distance,JSON.stringify({tick,state:f.state,local:f.local,pose:r.chassis.pose,box})).toBeGreaterThanOrEqual(.074);
   }
   expect(f.state).toBe('stored');expect(f.body.handle).toBe(handle);expect(f.body.isEnabled()).toBe(false);
  }finally{s.dispose()}
 });
 for(const manual of [false,true])it(`${manual?'manual':'shooting'} retraction pushes original fuel clear of the moving intake`,async()=>{
  const s=await FieldSimulation.create(floor,Array.from({length:48},(_,i):Vec3=>[0,.08,3+i*.16]),true);
  try{
   s.startSession({...DEFAULT_MATCH,robot:'6800-downpour',preloads:0},true);run(s,.6);const r=s.robotController!,handles=s.fuel.map(b=>b.handle);
   const load=manual?16:48;
   for(const [i,f]of s.fuelSystem.records.slice(0,load).entries()){expect(s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i])).toBe(true);f.state='stored';}
   run(s,.4);if(manual)r.requestIntakeToggle();else r.input.shoot=true;let folded=false,checked=0,worst=1;
   for(let tick=0;tick<(manual?2:14)*120;tick++){
    s.update(1/120);folded ||= r.held.length>0&&r.chassis.pose.intake<.9;
    const contacts=hopperObstacles(DOWNPOUR,r.chassis.pose);
    for(const f of r.held)for(const box of contacts){const distance=hopperObstacleContact([f.local.x,f.local.y,f.local.z],box).distance;worst=Math.min(worst,distance);checked++;expect(distance,JSON.stringify({tick,id:f.id,pose:r.chassis.pose,local:f.local,box,worst})).toBeGreaterThanOrEqual(.074);}
   }
   expect(folded).toBe(true);expect(checked).toBeGreaterThan(1000);expect(r.shooter.shotsFired).toBe(manual?0:48);expect(r.held).toHaveLength(manual?16:0);expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(r.chassis.body.mass()).toBeCloseTo(DOWNPOUR.mass+(manual?16*.215:0),3);
  }finally{s.dispose()}
 },30000);
});
