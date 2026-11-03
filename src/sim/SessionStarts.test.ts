import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { ALLIANCE_LINE, FIELD_HALF_WIDTH } from '../field/targets';
import { ROBOTS } from '../robot/registry';
import type { CollisionAsset } from '../field/types';
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const run = (s: FieldSimulation, seconds: number) => { for(let i=0;i<Math.round(seconds*120);i++) s.update(1/120); };
describe('starting-line field clearance', () => {
  it('settles all registered robots at their default line starts without a field ejection', async () => {
    const s=await FieldSimulation.create(field,[],true);
    try {
      for(const robot of Object.values(ROBOTS)) for(const alliance of ['blue','red'] as const){
        s.startMatch({...DEFAULT_MATCH,robot:robot.id as keyof typeof ROBOTS,alliance,preloads:0});
        const p={...s.robot!.body.translation()};run(s,.7);const after=s.robot!.body.translation();
        expect(Math.hypot(after.x-p.x,after.z-p.z),`${robot.id} ${alliance}`).toBeLessThan(.08);
        // Passive deployment may reach the ramp after the match starts, invoking bump support.
        expect(after.y,`${robot.id} ${alliance}`).toBeGreaterThan(.15);expect(after.y,`${robot.id} ${alliance} ${JSON.stringify(after)}`).toBeLessThan(.43);
        expect(s.robot!.telemetry.grounded,`${robot.id} ${alliance}`).toBeGreaterThanOrEqual(3);
      }
    } finally {s.dispose();}
  });
  it('retains selected wall-touching starts under either trench on both alliances and restart', async () => {
    const s=await FieldSimulation.create(field,[],true),robot=ROBOTS['2910-reblitz'];
    try {
      for(const alliance of ['blue','red'] as const) for(const side of [-1,1]){
        const sign=alliance==='blue'?1:-1,start={x:sign*ALLIANCE_LINE,z:side*(FIELD_HALF_WIDTH-robot.width/2),yaw:alliance==='blue'?0:Math.PI};
        s.startMatch({...DEFAULT_MATCH,alliance,preloads:0,start});expect(s.match.config.start?.x).toBeCloseTo(start.x);expect(s.match.config.start?.z).toBeCloseTo(start.z);
        run(s,.7);const p=s.robot!.body.translation();
        expect(Math.abs(p.x-start.x)).toBeLessThan(.08);expect(Math.abs(p.z-start.z)).toBeLessThan(.04);
        expect(p.y).toBeGreaterThan(.15);expect(p.y).toBeLessThan(.3);
        expect(s.robot!.telemetry.grounded).toBeGreaterThanOrEqual(3);
        s.restartMatch();expect(s.robot!.body.translation().x).toBeCloseTo(start.x);expect(s.robot!.body.translation().z).toBeCloseTo(start.z);
      }
    } finally {s.dispose();}
  });
});
