import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import { NEUTRAL_INPUT } from '../../../sim/SwerveChassis';
import { HopperDynamics } from '../../../sim/HopperDynamics';
import type { CollisionAsset, Vec3 } from '../../../field/types';
import { LIMESTONE } from './definition';
const CAPACITY = LIMESTONE.mechanisms.capacity;

const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0,-.1,0], halfExtents: [25,.1,25] }], meshes: [] };
const seeds = (count = 12): Vec3[] => Array.from({length:count},(_,i)=>[0,.08,(i%20)*.16]);
const run = (s: FieldSimulation, seconds: number) => { for(let i=0;i<Math.round(seconds*120);i++) s.update(1/120); };
const start = (s: FieldSimulation, alliance: 'blue'|'red' = 'blue', preloads = 8) => s.startSession({...DEFAULT_MATCH,robot:'1678-limestone',alliance,preloads},false);

describe('1678 Limestone',()=>{
  it('uses its own drive tuning and remains inside the real field perimeter',async()=>{
    const s=await FieldSimulation.create(floor,[],true);
    try {
      start(s,'blue',0); s.robot!.teleport([0,.26,0],0); run(s,.6);
      s.robot!.input={...NEUTRAL_INPUT,forward:1}; run(s,1.8);
      expect(s.robot!.telemetry.speed).toBeCloseTo(4.39,1);
      expect(s.robot!.telemetry.grounded).toBe(4);
      s.startSession({...DEFAULT_MATCH,robot:'2910-reblitz',preloads:0},true);
      expect(s.robot!.tuning.maxSpeed).toBeCloseTo(16.7*.3048);
    } finally{s.dispose();}
    const w=await FieldSimulation.create(field,[],true);
    try {
      start(w,'blue',0); w.robot!.teleport([6.4,.26,2.8],0); run(w,.6);
      w.robot!.input={...NEUTRAL_INPUT,forward:1}; run(w,2);
      expect(w.robot!.body.translation().x).toBeLessThan(7.9);
      expect(w.robot!.body.translation().y).toBeGreaterThan(.15);
    }finally{w.dispose();}
  });
  it('toggles its pivot intake and coupled slide by keyboard requests and controller edges',async()=>{
    const s=await FieldSimulation.create(floor,seeds(),true);
    try {
      start(s); run(s,.6); const r=s.robotController!, original=r.held.map(f=>f.id).sort();
      expect(r.chassis.pose.intake).toBe(1); expect(r.chassis.pose.hopper).toBe(1);
      r.requestIntakeToggle(); run(s,.6);
      expect(r.chassis.pose.intake).toBe(0); expect(r.chassis.pose.hopper).toBe(0);
      r.input.intake=true; run(s,.3); expect(r.chassis.pose.intake).toBe(1);
      r.input.intake=false; run(s,.6); expect(r.chassis.pose.intake).toBe(0);
      r.input.toggleIntake=true; run(s,.6); expect(r.chassis.pose.intake).toBe(1);
      run(s,.4); expect(r.chassis.pose.intake).toBe(1); // held button must not repeat
      expect(r.held.map(f=>f.id).sort()).toEqual(original);
    }finally{s.dispose();}
  });
  it('packs its increased full-size capacity, contains a loaded moving hopper and keeps every original body',async()=>{
    const d=LIMESTONE,v=d.hopper.volume!;
    for(let i=0;i<d.cargoSlots.length;i++){
      const p=d.cargoSlots[i]; expect(p[1]+.075).toBeLessThanOrEqual(v.ceilingY+v.ceilingTravel!);
      expect(p[1]-.075).toBeGreaterThanOrEqual(v.floorY+v.floorSlope!*p[0]);
      for(let j=i+1;j<d.cargoSlots.length;j++) expect(Math.hypot(...p.map((x,k)=>x-d.cargoSlots[j][k]))).toBeGreaterThan(.15);
    }
    const s=await FieldSimulation.create(floor,seeds(CAPACITY),true);
    try{
      start(s,'blue',0); run(s,.6); const r=s.robotController!,handles=s.fuel.map(f=>f.handle);
      r.input.intake=true;run(s,.7);r.input.intake=false;
      for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
      r.requestIntakeToggle(); r.chassis.input={...NEUTRAL_INPUT,forward:.4,strafe:.1,turn:.2};run(s,2);
      expect(r.held).toHaveLength(CAPACITY);expect(r.chassis.pose.intake).toBe(1);
      for(const f of r.held){expect(Math.abs(f.local.z)+.075).toBeLessThanOrEqual(v.halfWidth+.002);expect(f.local.y+.075).toBeLessThanOrEqual(v.ceilingY+v.ceilingTravel!*(r.chassis.pose.climber??0)+.002);}
      expect(r.telemetry.mass).toBeCloseTo(d.mass+CAPACITY*.215,3);expect(s.fuel.map(f=>f.handle)).toEqual(handles);
      const time=s.fuelSystem.time,positions=r.held.map(f=>({...f.local}));s.setRunning(false);run(s,.5);
      expect(s.fuelSystem.time).toBe(time);expect(r.held.map(f=>f.local)).toEqual(positions);
      start(s); expect(r.held).toHaveLength(8); expect(s.fuel.map(f=>f.handle)).toEqual(handles);
    }finally{s.dispose();}
  });
  it('moves the hopper roof boundary with the real vertical lid instead of only animating it',()=>{
    const h=new HopperDynamics(LIMESTONE),f={id:0,state:'stored' as const,local:{x:-.15,y:.43,z:0}};
    const motion={position:{x:0,y:.223,z:0},velocity:{x:0,y:0,z:0},angularVelocity:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0,w:1}};
    h.step(1/120,[f],{intake:1,hopper:1,hood:0,climber:1},motion);expect(f.local.y).toBeGreaterThan(.4);
    h.step(1/120,[f],{intake:1,hopper:1,hood:0,climber:0},motion);expect(f.local.y+.075).toBeLessThanOrEqual(LIMESTONE.hopper.volume!.ceilingY+.001);
  });
  for(const alliance of ['blue','red'] as const) it(`${alliance}: fires original fuel through all three lanes and scores real hub hits`,async()=>{
    const s=await FieldSimulation.create(field,seeds(),true);
    try{
      start(s,alliance);const sign=alliance==='blue'?1:-1;s.robot!.teleport([sign*6.2,.26,0],alliance==='blue'?Math.PI:0);run(s,.6);
      const r=s.robotController!,owned=r.held.map(f=>f.id).sort();r.input.shoot=true;run(s,7);
      expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(8);
      expect(r.shooter.shots.map(e=>e.id).sort()).toEqual(owned);
      expect(new Set(r.shooter.shots.map(e=>e.lane))).toEqual(new Set([0,1,2]));
      expect(s.hubs.telemetry[alliance].hits).toBeGreaterThanOrEqual(7);
      expect(s.fuelSystem.records).toHaveLength(12);
    }finally{s.dispose();}
  });
  for(const alliance of ['blue','red'] as const) it(`${alliance}: captures an outer hook on the low rung, climbs, scores L1 and releases`,async()=>{
    const s=await FieldSimulation.create(field,[],true);
    try{
      start(s,alliance,0);const sign=alliance==='blue'?1:-1;
      s.robot!.teleport([sign*(7.208488-.075),.26,-sign*1.18],alliance==='blue'?0:Math.PI);run(s,1);
      const r=s.robotController!;r.requestClimbToggle();run(s,1);
      expect(r.climber.attached,JSON.stringify({climb:r.climber.telemetry,chassis:r.chassis.telemetry,p:r.chassis.body.translation()})).toBe(true);
      r.requestClimbToggle();run(s,2);expect(r.climber.level).toBe(1);expect(r.climber.telemetry.lift).toBeCloseTo(.159,2);
      s.match.endEarly();run(s,3.1);expect(s.match.telemetry[alliance].autoTower).toBe(15);
      // Fresh session: raising while hanging lowers and releases rather than recapturing.
      start(s,alliance,0);s.robot!.teleport([sign*(7.208488-.075),.26,-sign*1.18],alliance==='blue'?0:Math.PI);run(s,1);
      r.requestClimbToggle();run(s,1);r.requestClimbToggle();run(s,2);r.requestClimbToggle();run(s,2);
      expect(r.climber.attached).toBe(false);expect(r.climber.level).toBe(0);
    }finally{s.dispose();}
  });
  it('uses the opposite outer hook at the other rung end',async()=>{
    const s=await FieldSimulation.create(field,[],true);
    try{
      start(s,'blue',0);s.robot!.teleport([7.208488-.075,.26,.60],0);run(s,1);
      const r=s.robotController!;r.requestClimbToggle();run(s,1);expect(r.climber.attached).toBe(true);
      r.requestClimbToggle();run(s,2);expect(r.climber.level).toBe(1);
    }finally{s.dispose();}
  });
  it('feeds a full load through three staggered lanes at the declared gameplay cadence',async()=>{
    const s=await FieldSimulation.create(floor,seeds(CAPACITY),true);
    try{
      start(s,'blue',0);run(s,.6);const r=s.robotController!;
      r.input.intake=true;run(s,.7);r.input.intake=false;
      for(const [i,f]of s.fuelSystem.records.entries()){s.fuelSystem.capture(f,r.owner,i,r.storageSlots[i]);f.state='stored';}
      r.input.shoot=true;run(s,6);const shots=r.shooter.shots;
      expect(shots).toHaveLength(CAPACITY);expect(new Set(shots.map(f=>f.id)).size).toBe(CAPACITY);
      const rate=(CAPACITY-1)/(shots.at(-1)!.time-shots[0].time);
      expect(rate).toBeGreaterThan(20);expect(rate).toBeLessThanOrEqual(24.5);
      expect(r.held).toHaveLength(0);expect(s.fuelSystem.records).toHaveLength(CAPACITY);
    }finally{s.dispose();}
  });
  it('scores while translating and passes using physical fuel from outside the alliance zone',async()=>{
    const s=await FieldSimulation.create(field,seeds(),true);
    try{
      start(s);s.robot!.teleport([6.2,.26,0],Math.PI);run(s,.6);const r=s.robotController!;
      r.chassis.input={...NEUTRAL_INPUT,strafe:.05};r.input.shoot=true;run(s,7);
      expect(r.shooter.shotsFired).toBe(8);expect(s.hubs.telemetry.blue.hits).toBeGreaterThanOrEqual(6);
      expect(r.shooter.shots.some(e=>Math.abs(e.velocity.z)>.05)).toBe(true);
      start(s);s.robot!.teleport([0,.26,0],0);run(s,.6);r.input.shoot=true;run(s,7);
      expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(8);
      expect(r.shooter.shots.every(e=>e.target.kind==='Pass')).toBe(true);
      expect(new Set(r.shooter.shots.map(e=>e.id)).size).toBe(8);
    }finally{s.dispose();}
  });
  it('crosses the real bump and trench with stable support; blocks shots under the roof',async()=>{
    const s=await FieldSimulation.create(field,seeds(),true);
    try{
      start(s);s.robot!.teleport([5.35,.26,1.65],Math.PI);run(s,.6);
      s.robot!.input={...NEUTRAL_INPUT,forward:1,slow:true};let height=0;
      for(let i=0;i<360;i++){s.update(1/120);height=Math.max(height,s.robot!.body.translation().y);expect(s.robot!.body.rotation().x).toBe(0);expect(s.robot!.body.rotation().z).toBe(0);}
      expect(height).toBeGreaterThan(.32);expect(height).toBeLessThan(.65);expect(s.robot!.body.translation().x).toBeLessThan(3);
      start(s);s.robot!.teleport([5.35,.26,3.35],Math.PI);run(s,.6);s.robot!.input={...NEUTRAL_INPUT,forward:1};run(s,1.2);
      expect(s.robot!.body.translation().x).toBeLessThan(3);expect(s.robot!.body.translation().y).toBeGreaterThan(.18);
      start(s);s.robot!.teleport([3.4,.26,3.35],0);run(s,.6);s.robotController!.input.shoot=true;run(s,2);
      expect(s.robotController!.shooter.shotsFired).toBe(0);expect(s.robotController!.held).toHaveLength(8);
    }finally{s.dispose();}
  });
  it('rejects a side-on or off-end hook capture and does not attach to the opposing tower',async()=>{
    const s=await FieldSimulation.create(field,[],true);
    try{
      for(const [x,z,heading]of [[7.133488,-.288925,Math.PI/2],[7.133488,1.6,0],[-7.133488,.288925,Math.PI]]){
        start(s,'blue',0);s.robot!.teleport([x,.26,z],heading);run(s,.7);s.robotController!.requestClimbToggle();run(s,1);
        expect(s.robotController!.climber.attached).toBe(false);
      }
    }finally{s.dispose();}
  });
});
