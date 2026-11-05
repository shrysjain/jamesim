import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import type { CollisionAsset } from '../field/types';

const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
const cases = [false, true].flatMap(loaded => [-1.65, 1.65].map(z => ({ loaded, z })));

it.each(cases)('bounds fast Darwin bump rebound with load=$loaded in lane $z', async ({ loaded, z }) => {
  const fuel = loaded ? Array.from({ length: 48 }, (_, i): [number, number, number] => [7, .08, 3 + i * .16]) : [];
  const s = await FieldSimulation.create(field, fuel, true);
  try {
    s.startSession({ ...DEFAULT_MATCH, robot: '6328-darwin', preloads: 0 }, true);
    const r = s.robot!, controller = s.robotController!, handles = s.fuel.map(b => b.handle);
    r.teleport([6.2, .26, z]);
    for (let tick = 0; tick < 72; tick++) s.update(1 / 120);
    if (loaded) {
      for (const [i, f] of s.fuelSystem.records.entries()) {
        expect(s.fuelSystem.capture(f, controller.owner, i, controller.storageSlots[i])).toBe(true);
        f.state = 'stored';
      }
      for (let tick = 0; tick < 60; tick++) s.update(1 / 120);
    }
    const restHeight = r.body.translation().y;
    r.input = { ...NEUTRAL_INPUT, forward: -1 };
    let peak = 0, loadRatio = 0, landingPeak = 0, cleared = false;
    for (let tick = 0; tick < 360; tick++) {
      s.update(1 / 120);
      const p = r.body.translation(); peak = Math.max(peak, p.y);
      loadRatio = Math.max(loadRatio, r.modules.reduce((sum, m) => sum + m.load, 0) / (r.totalMass * 9.81));
      if (p.x < 1.9) { cleared = true; r.input = { ...NEUTRAL_INPUT }; landingPeak = Math.max(landingPeak, p.y); }
    }
    const evidence = JSON.stringify({ loaded, z, peak, loadRatio, landingPeak, restHeight });
    expect(cleared, evidence).toBe(true);
    // Official bump height plus 25 mm of dynamic overshoot; no body-height clamp.
    expect(peak, evidence).toBeLessThan(restHeight + .165423 + .025);
    expect(landingPeak, evidence).toBeLessThan(restHeight + .015);
    expect(loadRatio, evidence).toBeLessThanOrEqual(1.800001);
    expect(r.telemetry.grounded).toBe(4);
    expect(s.fuel.map(b => b.handle)).toEqual(handles);
    if (loaded) expect(controller.held).toHaveLength(48);
  } finally { s.dispose(); }
}, 30000);
