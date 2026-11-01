import { describe, expect, it } from 'vitest';
import { HopperDynamics } from './HopperDynamics';
import { KEPLER, REBLITZ } from '../robot/RobotDefinition';
import { STORAGE_SLOTS } from './RobotSimulation';
import { FUEL_RADIUS } from './FuelSystem';
import { v3 } from './vector';
import type { FuelState } from './FuelSystem';
const motion = () => ({ position: v3(0,.223,0), velocity: v3(), angularVelocity: v3(), rotation: {x:0,y:0,z:0,w:1} });
const ball = (id: number, x: number, y: number, z: number) => ({ id, state: 'stored' as FuelState, local: v3(x,y,z) });
const open = {intake:1,hopper:1,hood:0};
const pairClearance = (balls: ReturnType<typeof ball>[]) => {
 let min=Infinity;for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)min=Math.min(min,Math.hypot(balls[i].local.x-balls[j].local.x,balls[i].local.y-balls[j].local.y,balls[i].local.z-balls[j].local.z));return min;
};
describe('hopper sphere dynamics', () => {
 it('drops fuel under gravity and settles against the floor and another fuel sphere', () => {
  const h=new HopperDynamics(REBLITZ), balls=[ball(0,0,.05,0),ball(1,0,.25,0)], m=motion();
  for(let i=0;i<240;i++)h.step(1/120,balls,open,m);
  expect(balls[0].local.y).toBeCloseTo(-.1+FUEL_RADIUS,3);
  expect(balls[1].local.y).toBeLessThan(.25);expect(pairClearance(balls)).toBeGreaterThan(.149);
  const last=balls.map(f=>({...f.local}));for(let i=0;i<20;i++)h.step(1/120,balls,open,m);
  for(let i=0;i<balls.length;i++)expect(Math.hypot(balls[i].local.x-last[i].x,balls[i].local.y-last[i].y,balls[i].local.z-last[i].z)).toBeLessThan(.002);
 });
 it('pushes a loose cluster into the chassis as the Kepler carriage retracts', () => {
  const h=new HopperDynamics(KEPLER), balls=Array.from({length:8},(_,i)=>ball(i,-.45+Math.floor(i/4)*.151,.09,(i%4-1.5)*.151));
  for(let i=0;i<60;i++)h.step(1/120,balls,open,motion());
  const before=balls.map(f=>f.local.x);
  for(let i=0;i<180;i++)h.step(1/120,balls,{...open,intake:Math.max(0,1-i/54)},motion());
  for(const f of balls)expect(f.local.x).toBeGreaterThanOrEqual(-.617+.312+FUEL_RADIUS-.001);
  expect(balls.some((f,i)=>f.local.x>before[i]+.05)).toBe(true);expect(pairClearance(balls)).toBeGreaterThan(.148);
 });
 it('lets fuel lag behind chassis acceleration instead of following fixed slots', () => {
  const h=new HopperDynamics(REBLITZ), balls=[ball(0,0,-.025,0)], m=motion();h.step(1/120,balls,open,m);
  for(let i=1;i<=24;i++){m.velocity.x=i/120*10;m.position.x+=m.velocity.x/120;h.step(1/120,balls,open,m);}
  expect(balls[0].local.x).toBeLessThan(-.03);
 });
 it('keeps full-size cargo separated and enclosed at each supported full capacity', () => {
  for(const def of [REBLITZ,KEPLER]){
   const h=new HopperDynamics(def), slots=def.cargoSlots?.map(([x,y,z])=>v3(x,y,z))??STORAGE_SLOTS;
   const balls=slots.map(({x,y,z},i)=>ball(i,x,y,z));
   for(let i=0;i<240;i++)h.step(1/120,balls,open,motion());
   expect(pairClearance(balls),def.id).toBeGreaterThan(.145);
   for(const f of balls){expect(Number.isFinite(f.local.y)).toBe(true);expect(Math.abs(f.local.z)+FUEL_RADIUS).toBeLessThanOrEqual(h.volume.halfWidth+.001);expect(f.local.x+FUEL_RADIUS).toBeLessThanOrEqual(h.volume.backX+.001);expect(f.local.y+FUEL_RADIUS).toBeLessThanOrEqual(h.volume.ceilingY+.001);}
  }
 });
 it('lets a turn and bump lean shift fuel instead of locking it to the robot', () => {
  const h=new HopperDynamics(REBLITZ), balls=[ball(0,.13,-.025,.12)], m=motion();m.angularVelocity.y=3;
  const before=Math.hypot(balls[0].local.x,balls[0].local.z);
  for(let i=0;i<36;i++){const yaw=3*i/120;m.rotation={x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)};h.step(1/120,balls,open,m);}
  expect(Math.hypot(balls[0].local.x,balls[0].local.z)).toBeGreaterThan(before+.02);
  h.reset();balls[0].local=v3(0,-.025,0);const tilt=motion();tilt.rotation={x:0,y:0,z:Math.sin(.15/2),w:Math.cos(.15/2)};
  for(let i=0;i<60;i++)h.step(1/120,balls,open,tilt);
  expect(balls[0].local.x).toBeLessThan(-.04);
 });
 it('leaves managed feeding/transferring fuel alone and clears inertia on reset', () => {
  const h=new HopperDynamics(REBLITZ), balls=[ball(0,0,.2,0),ball(1,0,.2,.2)];balls[0].state='feeding';balls[1].state='transferring';
  for(let i=0;i<120;i++)h.step(1/120,balls,open,motion());expect(balls.map(f=>f.local.y)).toEqual([.2,.2]);
  h.reset();balls[0].state='stored';h.step(1/120,balls,open,{...motion(),velocity:v3(5,0,0)});expect(balls[0].local.x).toBe(0);
 });
});
