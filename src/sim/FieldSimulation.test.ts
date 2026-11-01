import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { FieldSimulation, FUEL_RADIUS } from './FieldSimulation';
import type { CollisionAsset, FieldManifest } from '../field/types';

const readAsset = <T,>(name: string): T => JSON.parse(readFileSync(new URL(`../../public/assets/${name}`, import.meta.url), 'utf8'));
let manifest: FieldManifest;
let asset: CollisionAsset;

beforeAll(() => {
  manifest = readAsset<FieldManifest>('field-manifest.json');
  asset = readAsset<CollisionAsset>('field-collisions.json');
});

describe('prepared REBUILT environment', () => {
  it('contains the complete staged fuel supply and both alliances’ structures', () => {
    expect(manifest.fuel).toHaveLength(504);
    for (const kind of ['hub', 'tower', 'depot', 'outpost', 'bump', 'trench']) {
      expect(manifest.elements.filter((e) => e.kind === kind)).toHaveLength(['bump', 'trench'].includes(kind) ? 4 : 2);
      for (const alliance of ['red', 'blue']) {
        expect(manifest.elements.some((e) => e.kind === kind && e.alliance === alliance)).toBe(true);
      }
    }
    for (const position of manifest.fuel) {
      expect(position.every(Number.isFinite)).toBe(true);
      expect(position[1]).toBeGreaterThanOrEqual(FUEL_RADIUS - 0.005);
    }
  });

  it('loads all fuel as sleeping dynamic bodies, and resets exact initial poses', async () => {
    const sim = await FieldSimulation.create(asset, manifest.fuel);
    try {
      expect(sim.fuel).toHaveLength(504);
      expect(sim.awakeBodies).toBe(0);
      sim.fuel[0].setTranslation({ x: 0, y: 4, z: 0 }, true);
      sim.dropProbe([0, 2, 0]);
      for (let i = 0; i < 60; i++) sim.update(1 / 60);
      sim.reset();
      expect(sim.running).toBe(false);
      expect(sim.probeVisible).toBe(false);
      sim.fuel.forEach((body, i) => {
        const p = body.translation();
        expect(p.x).toBeCloseTo(manifest.fuel[i][0], 5);
        expect(p.y).toBeCloseTo(manifest.fuel[i][1], 5);
        expect(p.z).toBeCloseTo(manifest.fuel[i][2], 5);
      });
      expect(sim.world.bodies.len()).toBe(505);
    } finally { sim.dispose(); }
  }, 30_000);

  it('lets a falling probe contact the floor without falling through', async () => {
    const sim = await FieldSimulation.create(asset, []);
    try {
      sim.dropProbe([0, 1.5, 2.8]);
      for (let i = 0; i < 300; i++) sim.update(1 / 120);
      expect(sim.probe.translation().y).toBeGreaterThan(FUEL_RADIUS - 0.015);
      expect(sim.probe.translation().y).toBeLessThan(FUEL_RADIUS + 0.025);
      expect(Math.abs(sim.probe.linvel().y)).toBeLessThan(0.1);
    } finally { sim.dispose(); }
  });

  it('does not fill the hub opening with a solid bounding box', async () => {
    const sim = await FieldSimulation.create(asset, []);
    try {
      const hub = manifest.elements.find((e) => e.kind === 'hub' && e.alliance === 'blue')!;
      sim.world.step();
      const ray = new RAPIER.Ray({ x: hub.center[0], y: 2.2, z: hub.center[2] }, { x: 0, y: -1, z: 0 });
      const hit = sim.world.castRay(ray, 4, true);
      expect(hit).not.toBeNull();
      // The mouth is approximately 1.83 m high; the center should reach the interior.
      expect(2.2 - hit!.timeOfImpact).toBeLessThan(1.5);
    } finally { sim.dispose(); }
  });

  it('keeps all four trench passages clear below the overhead arm', async () => {
    const sim = await FieldSimulation.create(asset, []);
    try {
      sim.world.step();
      for (const trench of manifest.elements.filter((e) => e.kind === 'trench')) {
        const ray = new RAPIER.Ray({ x: trench.center[0] - 1.4, y: 0.4, z: trench.center[2] }, { x: 1, y: 0, z: 0 });
        expect(sim.world.castRay(ray, 2.8, true), trench.name).toBeNull();
      }
    } finally { sim.dispose(); }
  });

  it('places the bump contact surface at the visible ramp height', async () => {
    const sim = await FieldSimulation.create(asset, []);
    try {
      sim.world.step();
      for (const bump of manifest.elements.filter((e) => e.kind === 'bump')) {
        const ray = new RAPIER.Ray({ x: bump.center[0] + 0.1, y: 1, z: bump.center[2] }, { x: 0, y: -1, z: 0 });
        const hit = sim.world.castRay(ray, 2, true);
        expect(hit).not.toBeNull();
        const height = 1 - hit!.timeOfImpact;
        expect(height).toBeGreaterThan(0.12);
        expect(height).toBeLessThan(0.17);
      }
    } finally { sim.dispose(); }
  });
});
