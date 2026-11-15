import { expect, it } from 'vitest';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import { FUEL_MASS } from '../../../sim/FuelSystem';
import { REBLITZ as D } from './definition';
import { v3 } from '../../../sim/vector';

it('fills through the intake handoff across its width, then settles a full original load', async () => {
  const count = D.mechanisms.capacity;
  const s = await FieldSimulation.create({ boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [20, .1, 20] }], meshes: [] },
    Array.from({ length: count }, (_, i) => [-8, .08, -5 + i * .16]), true);
  try {
    s.startSession({ ...DEFAULT_MATCH, robot: '2910-reblitz', preloads: 0 }, true);
    const r = s.robotController!, handles = s.fuel.map(f => f.handle), seen = new Set<number>();
    r.chassis.teleport([0, .26, 0]); r.input.intake = true;
    const run = (ticks: number) => {
      for (let tick = 0; tick < ticks; tick++) {
        s.update(1 / 120);
        for (const f of r.held) if (f.state === 'transferring' && f.age >= .28) {
          // Every arrival uses the front handoff, rather than materializing in
          // an arbitrary layer or the back of the hopper as its slot changes.
          expect(f.local.x).toBeGreaterThan(-.40); expect(f.local.x).toBeLessThan(-.34);
          expect(Math.abs(f.local.z - f.start.z)).toBeLessThan(.001);
          seen.add(f.id);
        }
      }
    };
    run(84);
    for (let id = 0; id < count; id++) {
      const f = s.fuelSystem.records[id], z = [-.225, -.075, .075, .225][id % 4];
      f.body.setTranslation(r.toWorld(v3(-.71, -.147, z)), true); f.body.setLinvel(v3(), true); run(3);
    }
    run(240);
    expect(seen.size).toBe(count); expect(r.held).toHaveLength(count);
    expect(r.telemetry.mode).toBe('Full');
    for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
      const a = r.held[i].local, b = r.held[j].local;
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(.149);
    }
    expect(Math.max(...r.held.map(f => f.local.y))).toBeGreaterThan(.21);
    expect(r.chassis.totalMass).toBeCloseTo(D.mass + count * FUEL_MASS, 5);
    expect(s.fuel.map(f => f.handle)).toEqual(handles);
    expect(r.held.every(f => f.state === 'stored' && !f.body.isEnabled())).toBe(true);
    s.setRunning(false); const paused = r.held.map(f => ({ ...f.local })); run(30);
    expect(r.held.map(f => f.local)).toEqual(paused);
    s.reset(); expect(r.held).toHaveLength(0); expect(s.fuel.map(f => f.handle)).toEqual(handles);
  } finally { s.dispose(); }
});
