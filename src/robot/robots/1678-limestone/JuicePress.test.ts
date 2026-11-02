import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CollisionAsset } from '../../../field/types';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import { LIMESTONE } from './definition';
const floor: CollisionAsset={boxes:[{element:'floor',center:[0,-.1,0],halfExtents:[25,.1,25]}],meshes:[]};
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const run=(s:FieldSimulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*120);i++)s.update(1/120);};
const start=(s:FieldSimulation)=>s.startSession({...DEFAULT_MATCH,robot:'1678-limestone',preloads:0},true);
describe('Limestone juice press',()=>{
  it('opens for intake beside a real rung without arming or attaching the climber',async()=>{
    const s=await FieldSimulation.create(field,[],true);
    try{start(s);s.robot!.teleport([7.208488-.075,.26,-1.18],0);run(s,.6);const r=s.robotController!;
      r.input.intake=true;run(s,.8);expect(r.chassis.pose.climber).toBe(1);expect(r.climber.telemetry.raised).toBe(false);expect(r.climber.attached).toBe(false);
      r.input.intake=false;run(s,.8);expect(r.chassis.pose.climber).toBe(0);expect(r.climber.level).toBe(0);
      r.requestClimbToggle();run(s,1);expect(r.climber.telemetry.raised).toBe(true);expect(r.climber.attached).toBe(true);
    }finally{s.dispose();}
  });
  it('fills the raised hopper with seventy original fuel, retains its headroom and lowers as it empties',async()=>{
    const count=LIMESTONE.mechanisms.capacity,s=await FieldSimulation.create(floor,Array.from({length:count+4},(_,i)=>[0,.08,i*.16]),true);
    try{start(s);run(s,.6);const r=s.robotController!,handles=s.fuel.map(f=>f.handle);r.input.intake=true;
      for(let tick=0;tick<480&&r.held.length<count;tick++){
        const f=s.fuelSystem.records.find(f=>f.owner===null)!;
        f.body.setTranslation(r.toWorld({x:-.56,y:-.145,z:0}),true);f.body.setLinvel({x:0,y:0,z:0},true);s.world.propagateModifiedBodyPositionsToColliders();s.update(1/120);
      }
      expect(count).toBe(70);expect(r.held).toHaveLength(count);expect(r.chassis.pose.climber).toBe(1);r.input.intake=false;run(s,.8);
      expect(r.chassis.pose.climber).toBe(1);expect(r.telemetry.mass).toBeCloseTo(LIMESTONE.mass+count*.215,3);
      const v=LIMESTONE.hopper.volume!;for(const f of r.held)expect(f.local.y+.075).toBeLessThanOrEqual(v.ceilingY+v.ceilingTravel!+.002);
      let separation=Infinity;for(let i=0;i<r.held.length;i++)for(let j=i+1;j<r.held.length;j++){const a=r.held[i].local,b=r.held[j].local;separation=Math.min(separation,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));}
      expect(separation).toBeGreaterThan(.145);
      r.input.shoot=true;run(s,9);expect(r.held).toHaveLength(0);expect(r.shooter.shotsFired).toBe(count);expect(r.chassis.pose.climber).toBe(0);
      expect(s.fuel.map(f=>f.handle)).toEqual(handles);expect(s.fuelSystem.records).toHaveLength(count+4);
    }finally{s.dispose();}
  },30000);
  it('freezes its stage on pause and resets without carrying over automatic or climb commands',async()=>{
    const s=await FieldSimulation.create(floor,[],true);
    try{start(s);const r=s.robotController!;r.input.intake=true;run(s,.2);const extension=r.chassis.pose.climber!;expect(extension).toBeGreaterThan(0);expect(extension).toBeLessThan(1);
      s.setRunning(false);run(s,1);expect(r.chassis.pose.climber).toBe(extension);s.setRunning(true);run(s,.8);expect(r.chassis.pose.climber).toBe(0);
      start(s);expect(r.climber.telemetry.extension).toBe(0);expect(r.climber.telemetry.raised).toBe(false);
    }finally{s.dispose();}
  });
});
