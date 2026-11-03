import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH, MATCH_TIMES } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import type { CollisionAsset } from '../field/types';
const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0,-.1,0], halfExtents: [25,.1,25] }], meshes: [] };
const run=(s:FieldSimulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*120);i++)s.update(1/120);};
const seeds=Array.from({length:50},(_,i):[number,number,number]=>[-5,.08,(i%20)*.16]);
function fill(s:FieldSimulation) {
 const r=s.robotController!;
 for(const [i,f] of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';f.local={...r.storageSlots[i]};}
}
describe('moving shots and disabled drive hold',()=>{
 it('produces physical misses when turning and translating while preserving strong stationary shooting',async()=>{
  const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
  const hits=[];
  for(const moving of [false,true]){
   const s=await FieldSimulation.create(field,seeds.map((_,i)=>[0,.08,(i%20)*.16]),true);
   try{
    s.startMatch({...DEFAULT_MATCH,robot:'1690-kepler',preloads:0});s.robot!.teleport([6.2,.26,0]);run(s,.5);fill(s);
    if(moving)s.robot!.input={...NEUTRAL_INPUT,strafe:.15,turn:.3};s.robotController!.input.shoot=true;run(s,8);
    expect(s.robotController!.shooter.shotsFired).toBe(50);hits.push(s.hubs.telemetry.blue.hits);
   }finally{s.dispose();}
  }
  expect(hits[0]).toBeGreaterThanOrEqual(48);expect(hits[1],JSON.stringify(hits)).toBeLessThan(hits[0]);expect(hits[1]).toBeLessThan(50);expect(hits[1]).toBeGreaterThanOrEqual(32);
 });
 for(const end of ['auto','teleop','early'] as const)it(`stops sliding and turning at the ${end} cutoff`,async()=>{
  const s=await FieldSimulation.create(floor,[],true);
  try{
   s.startMatch({...DEFAULT_MATCH,preloads:0});s.robot!.teleport([0,.26,0]);run(s,.5);
   s.robot!.input={...NEUTRAL_INPUT,forward:1,turn:.3};run(s,.3);expect(s.robot!.telemetry.speed).toBeGreaterThan(.5);
   if(end==='early')s.match.endEarly();else{const cutoff=end==='auto'?MATCH_TIMES.autoEnd:MATCH_TIMES.teleopEnd;while(s.match.elapsed<cutoff-1/120-1e-8)s.match.advance();}
   run(s,1/120);const p={...s.robot!.body.translation()},heading=s.robot!.telemetry.heading;
   expect(s.match.actuatorsEnabled).toBe(false);expect(s.robot!.telemetry.speed).toBeLessThan(1e-5);expect(Math.abs(s.robot!.body.angvel().y)).toBeLessThan(1e-5);
   run(s,2.5);const after=s.robot!.body.translation();expect(Math.hypot(after.x-p.x,after.z-p.z)).toBeLessThan(.002);expect(s.robot!.telemetry.heading).toBeCloseTo(heading,4);
  }finally{s.dispose();}
 });
 it('retains airborne travel and gravity at a cutoff, then holds after landing',async()=>{
  const s=await FieldSimulation.create(floor,[],true);
  try{
   s.startMatch({...DEFAULT_MATCH,preloads:0});s.robot!.teleport([0,2,0]);s.robot!.body.setLinvel({x:2,y:-.2,z:0},true);s.match.endEarly();run(s,.1);
   expect(s.robot!.body.translation().x).toBeGreaterThan(.15);expect(s.robot!.body.translation().y).toBeLessThan(2);
   run(s,1);expect(s.robot!.telemetry.grounded).toBe(4);expect(s.robot!.telemetry.speed).toBeLessThan(1e-5);
  }finally{s.dispose();}
 });
});
