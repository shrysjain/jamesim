import {describe,it,expect} from 'vitest';
import {nextWheelSpeed} from '../../../sim/SwerveChassis';
import {ERA_II as D} from './definition';
const a=D.drive!.acceleration,b=D.drive!.brakeAcceleration!;
describe('Era II wheel acceleration and braking',()=>{
 it('retains the source 9.4 m/s² powered acceleration in both directions',()=>{
  expect(nextWheelSpeed(0,5.8,.1,a,b)).toBeCloseTo(.94);expect(nextWheelSpeed(0,-5.8,.1,a,b)).toBeCloseTo(-.94);
 });
 it('brakes spinning wheels promptly while preserving the powered limit after crossing zero',()=>{
  expect(nextWheelSpeed(5.8,-5.8,.1,a,b)).toBeCloseTo(3.92);
  expect(nextWheelSpeed(-5.8,5.8,.1,a,b)).toBeCloseTo(-3.92);
  expect(nextWheelSpeed(.94,-5.8,.1,a,b)).toBeCloseTo(-.47);
  expect(nextWheelSpeed(-.94,5.8,.1,a,b)).toBeCloseTo(.47);
 });
});
