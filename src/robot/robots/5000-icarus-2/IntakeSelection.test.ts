import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {FieldSimulation} from '../../../sim/FieldSimulation';
import {DEFAULT_MATCH} from '../../../sim/MatchRules';
import {FUEL_MASS,FUEL_RADIUS} from '../../../sim/FuelSystem';
import {v3} from '../../../sim/vector';
import type {CollisionAsset,Vec3} from '../../../field/types';
import {ICARUS as D} from './definition';
import {hopperObstacleContact} from '../../hopperGeometry';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const run=(s:FieldSimulation,n:number)=>{for(let i=0;i<Math.round(n*120);i++)s.update(1/120);};
describe('Icarus exclusive intake selection',()=>{
 it('retracts before changing sides, debounces keyboard/gamepad edges, pauses and resets safely',async()=>{
  const s=await FieldSimulation.create(field,[],true);
  try{s.startSession({...DEFAULT_MATCH,robot:D.id as '5000-icarus-2',preloads:0},true);run(s,.7);const r=s.robotController!;
   expect(r.chassis.pose.intake).toBe(1);expect(r.chassis.pose.opposedIntake).toBe(0);
   r.requestIntakeSwitch();for(let i=0;i<100;i++){s.update(1/120);expect(Math.min(r.chassis.pose.intake,r.chassis.pose.opposedIntake!)).toBe(0);}
   expect(r.intakeSide).toBe('Opposite');expect(r.chassis.pose.opposedIntake).toBe(1);
   r.input.switchIntake=true;run(s,1);expect(r.intakeSide).toBe('Primary');run(s,1);expect(r.intakeSide).toBe('Primary');
   s.setRunning(false);r.requestIntakeSwitch();run(s,1);expect(r.intakeSide).toBe('Primary');s.setRunning(true);r.clearInput();
   s.startSession({...DEFAULT_MATCH,robot:'5000-icarus-2',preloads:0},true);expect(r.intakeSide).toBe('Primary');expect(r.chassis.pose.intake).toBe(0);expect(r.chassis.pose.opposedIntake).toBe(0);
  }finally{s.dispose();}
 });
 for(const opposite of [false,true])it(`${opposite?'opposite':'primary'}: fills the selected hopper, refuses unsafe switching, and discharges original fuel`,async()=>{
  const s=await FieldSimulation.create(field,Array.from({length:D.mechanisms.capacity},(_,i):Vec3=>[0,.08,3+i*.16]),true);
  try{s.startSession({...DEFAULT_MATCH,robot:'5000-icarus-2',preloads:0},true);run(s,.7);const r=s.robotController!,handles=s.fuel.map(b=>b.handle);
   if(opposite){r.requestIntakeSwitch();run(s,.8);}
   r.chassis.teleport([7.2,.26,2.2],Math.PI);run(s,.5);r.input.intake=true;
   for(let i=0;i<s.fuel.length;i++){
    const body=s.fuel[i];body.setTranslation(r.toWorld(v3(opposite?.58:-.58,-.147,(i%3-1)*.12)),true);body.setLinvel(r.chassis.body.linvel(),true);s.world.propagateModifiedBodyPositionsToColliders();run(s,.09);
   }
   run(s,.5);expect(r.held).toHaveLength(D.mechanisms.capacity);
   const front=r.hopper.front(r.chassis.pose),back=r.hopper.back(r.chassis.pose);
   for(const f of r.held){expect(f.local.x-FUEL_RADIUS).toBeGreaterThanOrEqual(front-.001);expect(f.local.x+FUEL_RADIUS).toBeLessThanOrEqual(back+.001);for(const obstacle of D.hopper.obstacles!)expect(hopperObstacleContact([f.local.x,f.local.y,f.local.z],obstacle).distance).toBeGreaterThanOrEqual(FUEL_RADIUS-.002);}
   expect(r.chassis.body.mass()).toBeCloseTo(D.mass+r.held.length*FUEL_MASS,3);
   const selected=r.intakeSide;r.respawn('practice');r.chassis.teleport([7.2,.26,2.2],Math.PI);
   expect(r.intakeSide).toBe(selected);expect(r.held).toHaveLength(D.mechanisms.capacity);
   expect(r.chassis.pose.intake).toBe(opposite?0:1);expect(r.chassis.pose.opposedIntake).toBe(opposite?1:0);
   r.input.intake=false;r.requestIntakeSwitch();run(s,.1);expect(r.intakeSide).toBe(selected);expect(r.telemetry.intakeSwitchBlocked).toBe(true);
   r.input.shoot=true;run(s,15);expect(r.shooter.shotsFired).toBe(D.mechanisms.capacity);expect(r.held).toHaveLength(0);
   expect(r.activeExtension).toBe(0);expect(Math.max(r.chassis.pose.intake,r.chassis.pose.opposedIntake!)).toBe(0);
   expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(new Set(r.shooter.shots.map(x=>x.id)).size).toBe(D.mechanisms.capacity);
  }finally{s.dispose();}
 },30000);
});
