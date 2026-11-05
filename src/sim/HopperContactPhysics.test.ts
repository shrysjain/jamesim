import { describe, expect, it } from 'vitest';
import { KEPLER } from '../robot/registry';
import type { RobotDefinition } from '../robot/types';
import { HopperDynamics } from './HopperDynamics';
import { FieldSimulation } from './FieldSimulation';
import { RobotSimulation } from './RobotSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { v3 } from './vector';
import { FUEL_RADIUS } from './FuelSystem';

const pose = {intake:1,hopper:1,hood:0};
const definition: RobotDefinition = {...KEPLER,hopper:{stowTravel:0,
  volume:{frontX:-1,backX:1,halfWidth:.8,floorY:0,ceilingY:1,frontTravel:0},
  physics:{restitution:.4,friction:.08,linearDamping:.1}}};
const ball = (id:number,x:number,y:number,z:number) => ({id,state:'stored' as const,local:v3(x,y,z)});
const motion = () => ({position:v3(0,.223,0),velocity:v3(),angularVelocity:v3(),rotation:{x:0,y:0,z:0,w:1}});

describe('loose cargo contact response', () => {
  it('rebounds after falling instead of losing its impact velocity on the floor', () => {
    const h = new HopperDynamics(definition), f = ball(0,0,.4,0), m = motion();
    let contacted = false, rebound = 0;
    for (let tick=0;tick<150;tick++) {
      h.step(1/120,[f],pose,m);
      if (f.local.y < FUEL_RADIUS+.001) contacted = true;
      if (contacted) rebound = Math.max(rebound,f.local.y-FUEL_RADIUS);
      expect(f.local.y).toBeGreaterThanOrEqual(FUEL_RADIUS-1e-9);
    }
    expect(contacted).toBe(true); expect(rebound).toBeGreaterThan(.025); expect(rebound).toBeLessThan(.08);
  });
  it('transfers a rolling arrival impulse to another original sphere', () => {
    const h = new HopperDynamics(definition), balls = [ball(0,-.3,.075,0),ball(1,0,.075,0)], m = motion();
    h.arrive(0,v3(1.2,0,0));
    for(let tick=0;tick<72;tick++) h.step(1/120,balls,pose,m);
    expect(balls[1].local.x).toBeGreaterThan(.15);
    expect(Math.hypot(balls[0].local.x-balls[1].local.x,balls[0].local.y-balls[1].local.y)).toBeGreaterThan(.149);
    expect(balls.map(f=>f.id)).toEqual([0,1]);
  });
  it('lets a supported load lag, roll and settle after acceleration and a stop', () => {
    const h = new HopperDynamics(definition), f = ball(0,0,.075,0), m = motion(); h.step(1/120,[f],pose,m);
    for(let tick=1;tick<=24;tick++){m.velocity.x=tick/120*8;m.position.x+=m.velocity.x/120;h.step(1/120,[f],pose,m);}
    expect(f.local.x).toBeLessThan(-.08);
    const before=f.local.x;m.velocity.x=0;
    for(let tick=0;tick<90;tick++)h.step(1/120,[f],pose,m);
    expect(Math.abs(f.local.x-before)).toBeGreaterThan(.02);
  });
  it('continues managed transfer momentum into stored physics and preserves the field body', async () => {
    const floor = {boxes:[{element:'floor',center:[0,-.1,0] as [number,number,number],halfExtents:[25,.1,25] as [number,number,number]}],meshes:[]};
    const s=await FieldSimulation.create(floor,[[0,.08,3]],false);
    try {
      s.robotController=new RobotSimulation(s.world,s.fuelSystem,s.colliderElements,{...definition,hopper:{...definition.hopper,entry:[0,.12,0]}});
      s.startSession({...DEFAULT_MATCH,robot:'1690-kepler',preloads:0},true);
      for(let tick=0;tick<72;tick++)s.update(1/120);
      const r=s.robotController!,f=s.fuelSystem.records[0],handle=f.body.handle;
      expect(s.fuelSystem.capture(f,r.owner,0,v3(-.4,.02,0))).toBe(true);
      for(let tick=0;tick<120 && f.state==='transferring';tick++)s.update(1/120);
      expect(f.state).toBe('stored'); expect(f.local.y).toBeLessThan(.115);
      expect(f.body.handle).toBe(handle); expect(f.body.isEnabled()).toBe(false);
      const frozen={...f.local};s.setRunning(false);for(let tick=0;tick<30;tick++)s.update(1/120);expect(f.local).toEqual(frozen);
    } finally {s.dispose();}
  });
});
