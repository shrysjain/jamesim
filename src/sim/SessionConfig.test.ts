import { describe, expect, it } from 'vitest';
import { defaultStart, normalizeStart, driveStart, startExtents, startProblem } from './SessionConfig';
import { MatchRules, DEFAULT_MATCH } from './MatchRules';
import { ROBOTS } from '../robot/RobotDefinition';
import { ALLIANCE_LINE, FIELD_HALF_WIDTH } from '../field/targets';
import { START_LINE_WIDTH } from '../field/layout';
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
    const robot=ROBOTS['2910-reblitz'];
    expect(normalizeStart({x:-20,z:20,yaw:4*Math.PI},'blue')).toEqual({x:expect.closeTo(ALLIANCE_LINE-robot.length/2+.001),z:expect.closeTo(FIELD_HALF_WIDTH-robot.width/2),yaw:expect.closeTo(0)});
    expect(normalizeStart({x:NaN,z:0,yaw:0},'red')).toEqual(red);
  });
  it('gives every robot legal presets overlapping the actual starting tape, on both alliances', () => {
    for(const robot of Object.values(ROBOTS)) for(const alliance of ['blue','red'] as const) for(const spot of ['left','center','right'] as const){
      const p=defaultStart(alliance,spot,robot),sign=alliance==='blue'?1:-1,half=startExtents(robot,p.yaw);
      expect(startProblem(p,alliance,robot),`${robot.id} ${alliance} ${spot}`).toBeNull();
      expect(sign*p.x-half.x).toBeLessThan(ALLIANCE_LINE+START_LINE_WIDTH);
      expect(sign*p.x+half.x).toBeGreaterThan(ALLIANCE_LINE);
    }
  });
  it('allows bumper overlap on either side of the tape and guardrail contact underneath both trenches', () => {
    const robot=ROBOTS['2910-reblitz'];
    for(const alliance of ['blue','red'] as const) for(const side of [-1,1]) for(const offset of [-.12,.12]){
      const sign=alliance==='blue'?1:-1,p={x:sign*(ALLIANCE_LINE+offset),z:side*(FIELD_HALF_WIDTH-robot.width/2),yaw:alliance==='blue'?0:Math.PI};
      const normalized=normalizeStart(p,alliance,undefined,robot);
      expect(normalized.x).toBeCloseTo(p.x,10);expect(normalized.z).toBeCloseTo(p.z,10);expect(normalized.yaw).toBeCloseTo(p.yaw,10);
      expect(startProblem(p,alliance,robot)).toBeNull();
    }
  });
  it('uses rotated robot dimensions at the wall, rejects bump contact and checks trench headroom', () => {
    const robot=ROBOTS['2910-reblitz'],p=normalizeStart({x:ALLIANCE_LINE,z:20,yaw:Math.PI/4},'blue',undefined,robot);
    expect(p.z+startExtents(robot,p.yaw).z).toBeCloseTo(FIELD_HALF_WIDTH);
    expect(startProblem({x:ALLIANCE_LINE,z:2.1,yaw:0},'blue',robot)).toContain('bump');
    expect(startProblem({x:ALLIANCE_LINE,z:0,yaw:0},'blue',robot)).toContain('hub');
    expect(startProblem({x:ALLIANCE_LINE,z:3.5,yaw:0},'blue',ROBOTS['8592-prismarine'])).toContain('overhead');
  });
  it('keeps a selected custom start through restart/config and explicit practice entry', () => {
    const m=new MatchRules();m.start({...DEFAULT_MATCH,alliance:'red',robot:'1690-kepler',start:{x:-6.6,z:.2,yaw:Math.PI}});
    const config={...m.config};m.enterPractice();expect(m.mode).toBe('practice');expect(m.config).toEqual(config);
    expect(Object.keys(ROBOTS)).toEqual(expect.arrayContaining(['2910-reblitz','1690-kepler']));
  });
  it('normalizes a changed robot and falls back from an obstructed saved start', () => {
    const m=new MatchRules();m.start({...DEFAULT_MATCH,robot:'8592-prismarine',start:{x:ALLIANCE_LINE,z:3.5,yaw:0}});
    expect(m.config.start).toEqual(defaultStart('blue','left',ROBOTS['8592-prismarine']));
  });
});
