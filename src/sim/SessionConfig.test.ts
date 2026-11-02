import { describe, expect, it } from 'vitest';
import { defaultStart, normalizeStart, driveStart } from './SessionConfig';
import { MatchRules, DEFAULT_MATCH } from './MatchRules';
import { ROBOTS } from '../robot/RobotDefinition';
describe('singleplayer setup boundaries', () => {
  it('drives the setup marker with the same alliance driver axes and independent turning', () => {
    for(const alliance of ['blue','red'] as const){const p=defaultStart(alliance,'center'),sign=alliance==='blue'?1:-1;
      const n=driveStart(p,{forward:1,strafe:1,turn:1},alliance,.1);
      expect((n.x-p.x)*sign).toBeLessThan(0);expect((n.z-p.z)*sign).toBeLessThan(0);expect(Math.atan2(Math.sin(n.yaw-p.yaw),Math.cos(n.yaw-p.yaw))).toBeCloseTo(.22);
      const stopped=driveStart(n,{forward:0,strafe:0,turn:0},alliance,1);expect(stopped).toEqual(n);
    }
  });
  it('mirrors alliance starts, bounds map positions and rejects invalid coordinates', () => {
    const blue=defaultStart('blue'), red=defaultStart('red');
    expect(red.x).toBe(-blue.x);expect(red.z).toBe(-blue.z);
    expect(normalizeStart({x:-20,z:20,yaw:4*Math.PI},'blue')).toEqual({x:5.45,z:3.3,yaw:expect.closeTo(0)});
    expect(normalizeStart({x:NaN,z:0,yaw:0},'red')).toEqual(red);
  });
  it('keeps a selected custom start through restart/config and explicit practice entry', () => {
    const m=new MatchRules();m.start({...DEFAULT_MATCH,alliance:'red',robot:'1690-kepler',start:{x:-6.6,z:.2,yaw:Math.PI}});
    const config={...m.config};m.enterPractice();expect(m.mode).toBe('practice');expect(m.config).toEqual(config);
    expect(Object.keys(ROBOTS)).toEqual(expect.arrayContaining(['2910-reblitz','1690-kepler']));
  });
});
