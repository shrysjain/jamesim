import {describe,it,expect} from 'vitest';
import {MATTERHORN as D} from './definition';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {sub,unrotate} from '../../../sim/vector';
import type {CollisionAsset} from '../../../field/types';
const floor:CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const run=(s:FieldSimulation,t:number)=>{for(let i=0;i<Math.round(t*120);i++)s.update(1/120);};
describe(`${D.id}: full-width roller feeding`,()=>{
 it('carries each original ball through its release column and uses the safe roller span',async()=>{
  const s=await FieldSimulation.create(floor,Array.from({length:D.mechanisms.capacity},(_,i)=>[0,.08,4+i*.16]),true);
  try{
   s.startSession({...DEFAULT_MATCH,robot:D.id as '9496-matterhorn',preloads:0},true);run(s,.6);
   const r=s.robotController!,handles=s.fuel.map(b=>b.handle),seen=new Set<number>(),releaseZ:number[]=[],feedZ=new Map<number,number>();
   for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
   r.input.shoot=true;
   const columnX=D.shooterGeometry.feedPath![1][0];
   for(let tick=0;tick<1440;tick++){
    s.update(1/120);
    for(const f of r.held)if(f.state==='feeding'&&Math.abs(f.local.x-columnX)<.003&&f.local.y>.06&&f.local.y<.17)feedZ.set(f.id,f.local.z);
    for(const shot of r.shooter.shots)if(!seen.has(shot.id)){
     seen.add(shot.id);const p=unrotate(sub(shot.position,r.chassis.body.translation()),r.chassis.renderRotation);releaseZ.push(p.z);
     expect(feedZ.has(shot.id)).toBe(true);expect(Math.abs(p.z-feedZ.get(shot.id)!)).toBeLessThan(.004);
     expect(Math.abs(p.z)).toBeLessThanOrEqual(0.185+.002);
    }
   }
   expect(releaseZ.length).toBe(D.mechanisms.capacity);
   expect(Math.min(...releaseZ)).toBeLessThan(-0.185*.8);expect(Math.max(...releaseZ)).toBeGreaterThan(0.185*.8);
   expect(releaseZ.filter(z=>Math.abs(z)<0.185/3).length).toBeGreaterThan(4);
   expect(Math.max(...releaseZ.map(z=>Math.min(...D.mechanisms.lanes.map(l=>Math.abs(z-l)))))).toBeGreaterThan(.025);
   expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(s.fuelSystem.counts.total).toBe(D.mechanisms.capacity);
  }finally{s.dispose();}
 },30000);
});
