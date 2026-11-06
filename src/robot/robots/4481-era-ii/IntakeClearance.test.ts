import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3 } from 'three';
import { ERA_II as D } from './definition';
import { ERA_INTAKE_PANELS } from './intakeContacts';
import { startProblem } from '../../../sim/SessionConfig';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import type { CollisionAsset } from '../../../field/types';
const field=JSON.parse(readFileSync('public/assets/field-collisions.json','utf8')) as CollisionAsset;
const cases=[1,-1].flatMap(side=>[1,-1].map(lane=>({side,lane})));

it('encloses the actual prepared polycarbonate without lowering its high section',async()=>{
 await MeshoptDecoder.ready;
 const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).readBinary(readFileSync(`public${D.model}`));
 let count=0;
 for(const n of doc.getRoot().listNodes())if(n.getName().startsWith('intake/'))for(const p of n.getMesh()?.listPrimitives()??[]){
  if(p.getMaterial()?.getName()!=='polycarbonate')continue;
  const a=p.getAttribute('POSITION')!,matrix=new Matrix4().fromArray(n.getWorldMatrix());
  for(let i=0;i<a.getCount();i++){
   const v=new Vector3(...a.getElement(i,[])).applyMatrix4(matrix).toArray();count++;
   expect(ERA_INTAKE_PANELS.some(c=>v.every((x,k)=>Math.abs(x-c.center[k])<=c.halfExtents[k]+.0001)),`CAD panel vertex ${v}`).toBe(true);
  }
 }
 expect(count).toBeGreaterThan(100);
 expect(Math.max(...ERA_INTAKE_PANELS.map(c=>c.center[1]+c.halfExtents[1]))+.223+D.intake.stowRise!).toBeGreaterThan(.627);
});

it.each(cases)('permits a clear stowed intake at the trench edge, side $side lane $lane',async({side,lane})=>{
 const alliance=side>0?'blue':'red',start={x:4.57*side,z:3.5*lane,yaw:side>0?0:Math.PI};
 expect(startProblem(start,alliance,D)).toBeNull();
 // A deeper start really puts the raised panel below the arm and remains blocked.
 expect(startProblem({...start,x:4.3*side},alliance,D)).toContain('overhead');
 const s=await FieldSimulation.create(field,Array.from({length:8},(_,i)=>[0,.08,-3+i*.16]),true);
 try {
  s.startSession({...DEFAULT_MATCH,robot:'4481-era-ii',alliance,start,preloads:8},true);
  expect(s.match.config.start).toEqual(start);expect(s.robot!.body.translation().x).toBeCloseTo(start.x,5);
  const handles=s.fuel.map(b=>b.handle);
  for(let i=0;i<72;i++)s.update(1/120);
  const after=s.robot!.body.translation();
  expect(Math.hypot(after.x-start.x,after.z-start.z)).toBeLessThan(.1);
  expect(after.y).toBeLessThan(.3);expect(s.robot!.telemetry.grounded).toBeGreaterThanOrEqual(3);
  expect(s.robotController!.chassis.pose.intake).toBe(1);
  expect(s.fuel.map(b=>b.handle)).toEqual(handles);expect(s.fuelSystem.records).toHaveLength(8);
 }finally{s.dispose();}
},30000);
