import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { FieldSimulation } from './FieldSimulation';
import type { CollisionAsset } from '../field/types';
const field = JSON.parse(readFileSync('public/assets/field-collisions.json', 'utf8')) as CollisionAsset;
it.each([1, -1])('does not trap an original fuel body on an invisible net-frame shelf, side %i', async sign => {
  const s = await FieldSimulation.create(field, [[sign * 2.9, 3.25, 0]], false, true);
  try {
    const handle = s.fuel[0].handle; s.fuel[0].wakeUp(); s.setRunning(true);
    for (let i = 0; i < 960; i++) s.update(1 / 120);
    expect(s.fuel[0].translation().y).toBeLessThan(1.5);
    expect(s.fuel[0].handle).toBe(handle); expect(s.fuelSystem.records).toHaveLength(1);
    expect(s.fuelSystem.records[0].owner).toBeNull(); expect(s.fuel[0].isEnabled()).toBe(true);
    expect(s.hubs.telemetry.blue.hits + s.hubs.telemetry.red.hits).toBe(0);
    // The real frame rail remains solid; only its filled-in opening disappears.
    const hit = s.world.castRay(new RAPIER.Ray({ x: sign * 2.802, y: 1.72, z: .529 }, { x: 0, y: -1, z: 0 }), .1, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    expect(hit).not.toBeNull();
  } finally { s.dispose(); }
});
