import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import type {CollisionAsset,Vec3} from '../field/types';
import {ALLIANCE_LINE} from '../field/targets';
import {FieldSimulation} from './FieldSimulation';
import {DEFAULT_MATCH} from './MatchRules';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
describe('chassis aim wrap boundary',()=>{
 for(const alliance of ['blue','red'] as const)it(`${alliance}: chooses one direction from the 180-degree tie and physically passes original fuel`,async()=>{
  const s=await FieldSimulation.create(field,Array.from({length:8},(_,i):Vec3=>[0,.08,i*.16]),true);
  try{
   s.startSession({...DEFAULT_MATCH,robot:'2910-reblitz',alliance,preloads:8},true);
   const r=s.robotController!,handles=s.fuel.map(b=>b.handle),sign=alliance==='blue'?1:-1;
   r.chassis.teleport([0,.26,1.5],alliance==='blue'?Math.PI:0);
   for(let i=0;i<72;i++)s.update(1/120);
   r.input.shoot=true;for(let i=0;i<840;i++)s.update(1/120);
   expect(r.shooter.shotsFired,JSON.stringify(r.shooter.telemetry)).toBe(8);
   expect(r.shooter.shots.every(e=>e.target.kind==='Pass')).toBe(true);
   expect(s.fuel.filter(b=>b.translation().x*sign>ALLIANCE_LINE).length).toBeGreaterThanOrEqual(4);
   expect(s.fuel.map(b=>b.handle)).toEqual(handles);
   expect(new Set(r.shooter.shots.map(e=>e.id)).size).toBe(8);
  }finally{s.dispose();}
 },30000);
});
