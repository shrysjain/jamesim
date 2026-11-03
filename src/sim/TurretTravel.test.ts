import {describe,it,expect} from 'vitest';
import {turretTravelError} from './TurretTravel';
const D=Math.PI/180,stops=[-182.8*D,182.8*D] as const;
describe('finite turret cable travel',()=>{
 it('takes the short path within the overlap, then reverses through the permitted range at a stop',()=>{
  expect(turretTravelError(179*D,3*D,stops)/D).toBeCloseTo(3);
  expect(turretTravelError(182*D,5*D,stops)/D).toBeCloseTo(-355);
  expect(turretTravelError(-182*D,-5*D,stops)/D).toBeCloseTo(355);
 });
 it('never chooses an endpoint beyond either stop across many revolutions',()=>{
  for(let current=-182;current<=182;current+=7)for(let error=-180;error<=180;error+=9){
   const endpoint=current*D+turretTravelError(current*D,error*D,stops);
   expect(endpoint).toBeGreaterThanOrEqual(stops[0]-1e-12);expect(endpoint).toBeLessThanOrEqual(stops[1]+1e-12);
   expect(Math.abs(Math.sin((endpoint-(current+error)*D)/2))).toBeLessThan(1e-12);
  }
 });
 it('keeps existing unrestricted turrets unchanged and approaches the nearer stop of a narrow turret',()=>{
  expect(turretTravelError(30, .4)).toBe(.4);
  expect(turretTravelError(0,2,[ -1,1 ])).toBe(1);
  expect(turretTravelError(0,-2,[ -1,1 ])).toBe(-1);
 });
});
