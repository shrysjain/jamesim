import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Box3, Matrix4, Vector3 } from 'three';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';
import { NEUTRAL_INPUT } from '../../../sim/SwerveChassis';
import { PRISMARINE } from './definition';
import { HUB_CENTER_X } from '../../../field/targets';
import type { CollisionAsset, Vec3 } from '../../../field/types';
const field = JSON.parse(
  readFileSync('public/assets/field-collisions.json', 'utf8'),
) as CollisionAsset;
const run = (s: FieldSimulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120);
};

describe('8592 Prismarine', () => {
  for (const side of [-1, 1])
    it(`stops at both trench beams on side ${side}, including with the intake retracted`, async () => {
      const s = await FieldSimulation.create(field, [], true);
      try {
        for (const z of [-3.35, 3.35])
          for (const retracted of [false, true]) {
            s.startSession(
              { ...DEFAULT_MATCH, robot: '8592-prismarine', preloads: 0 },
              true,
            );
            s.robot!.teleport([side * 5.35, 0.26, z], side > 0 ? Math.PI : 0);
            run(s, 0.6);
            if (retracted) {
              s.robotController!.requestIntakeToggle();
              run(s, 0.6);
            }
            s.robot!.input = { ...NEUTRAL_INPUT, forward: 1 };
            run(s, 1.8);
            expect(
              s.robot!.body.translation().x * side - HUB_CENTER_X,
            ).toBeGreaterThan(0.18);
            expect(s.robot!.body.translation().x * side).toBeLessThan(5);
            expect(s.robot!.telemetry.speed).toBeLessThan(0.3);
            expect(s.robot!.body.translation().y).toBeGreaterThan(0.17);
          }
      } finally {
        s.dispose();
      }
    });
  for (const alliance of ['blue', 'red'] as const)
    it(`${alliance}: fires a full hopper at fixed 64° through the real hub and conserves fuel`, async () => {
      const s = await FieldSimulation.create(
        field,
        Array.from({ length: 40 }, (_, i): Vec3 => [0, 0.08, (i % 20) * 0.16]),
        true,
      );
      try {
        s.startSession(
          { ...DEFAULT_MATCH, robot: '8592-prismarine', alliance, preloads: 0 },
          true,
        );
        s.robot!.teleport([alliance === 'blue' ? 6.2 : -6.2, 0.26, 0]);
        run(s, 0.6);
        const r = s.robotController!,
          handles = s.fuel.map((b) => b.handle);
        for (const [i, f] of s.fuelSystem.records.entries()) {
          s.fuelSystem.capture(f, r.owner, i, r.storageSlots[i]);
          f.state = 'stored';
          f.local = { ...r.storageSlots[i] };
        }
        run(s, 0.5);
        for (const f of r.held) {
          expect(Math.abs(f.local.z) + 0.075).toBeLessThanOrEqual(0.347);
          expect(f.local.y - 0.075).toBeGreaterThanOrEqual(-0.017);
          expect(f.local.y + 0.075).toBeLessThanOrEqual(0.302);
        }
        r.input.shoot = true;
        run(s, 10);
        expect(r.shooter.shotsFired, JSON.stringify(r.shooter.telemetry)).toBe(
          40,
        );
        expect(s.hubs.telemetry[alliance].hits).toBeGreaterThanOrEqual(37);
        expect(r.shooter.elevation).toBeCloseTo((64 * Math.PI) / 180, 6);
        expect(r.shooter.hood).toBe(0);
        expect(new Set(r.shooter.shots.map((shot) => shot.id)).size).toBe(40);
        const shots = r.shooter.shots;
        expect(
          (shots.length - 1) / (shots.at(-1)!.time - shots[0].time),
        ).toBeGreaterThan(7);
        expect(r.held).toHaveLength(0);
        expect(s.fuel.map((b) => b.handle)).toEqual(handles);
      } finally {
        s.dispose();
      }
    });
  it('passes from neutral territory on both alliances without changing the fixed hood angle', async () => {
    const floor: CollisionAsset = {
      boxes: [
        { element: 'floor', center: [0, -0.1, 0], halfExtents: [25, 0.1, 25] },
      ],
      meshes: [],
    };
    const s = await FieldSimulation.create(
      floor,
      Array.from({ length: 8 }, (_, i): Vec3 => [0, 0.08, i * 0.16]),
      true,
    );
    try {
      for (const alliance of ['blue', 'red'] as const) {
        s.startSession(
          { ...DEFAULT_MATCH, robot: '8592-prismarine', alliance, preloads: 8 },
          true,
        );
        s.robot!.teleport([0, 0.26, 0]);
        run(s, 0.6);
        const r = s.robotController!;
        expect(r.shooter.solve()?.target.kind).toBe('Pass');
        r.input.shoot = true;
        run(s, 6);
        expect(r.shooter.shotsFired).toBe(8);
        expect(r.shooter.elevation).toBeCloseTo((64 * Math.PI) / 180, 6);
        expect(r.shooter.hood).toBe(0);
      }
    } finally {
      s.dispose();
    }
  });
  it('keeps the intake extended while firing and defers shooting until translation settles', async () => {
    const floor: CollisionAsset = {
      boxes: [
        { element: 'floor', center: [0, -0.1, 0], halfExtents: [25, 0.1, 25] },
      ],
      meshes: [],
    };
    const s = await FieldSimulation.create(
      floor,
      Array.from({ length: 8 }, (_, i): Vec3 => [0, 0.08, i * 0.16]),
      true,
    );
    try {
      s.startSession(
        { ...DEFAULT_MATCH, robot: '8592-prismarine', preloads: 8 },
        true,
      );
      run(s, 0.6);
      const r = s.robotController!;
      s.robot!.input = { ...NEUTRAL_INPUT, strafe: 0.3 };
      r.input.shoot = true;
      run(s, 1.5);
      expect(r.shooter.shotsFired).toBe(0);
      expect(r.chassis.pose.intake).toBe(1);
      s.robot!.input = { ...NEUTRAL_INPUT };
      run(s, 5);
      expect(r.shooter.shotsFired).toBe(8);
      s.startSession(
        { ...DEFAULT_MATCH, robot: '8592-prismarine', preloads: 0 },
        true,
      );
      run(s, 0.6);
      r.requestIntakeToggle();
      run(s, 0.6);
      expect(r.chassis.pose.intake).toBe(0);
      r.input.intake = true;
      run(s, 0.6);
      expect(r.chassis.pose.intake).toBe(1);
      expect(PRISMARINE.mechanisms.climb).toBe(false);
    } finally {
      s.dispose();
    }
  });
  it('removes CAD game pieces and helpers and keeps corrected assemblies inside the robot envelope', async () => {
    await MeshoptDecoder.ready;
    const doc = await new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
      .read('public/assets/robots/8592-prismarine/robot.glb');
    // This purple material belongs exclusively to the two embedded source fuel solids.
    expect(
      doc
        .getRoot()
        .listMaterials()
        .some((m) => {
          const [r, g, b] = m.getBaseColorFactor();
          return (
            Math.abs(r - 0.764706) < 0.001 &&
            Math.abs(g - 0.545098) < 0.001 &&
            Math.abs(b - 0.803922) < 0.001
          );
        }),
    ).toBe(false);
    const nodes = doc.getRoot().listNodes();
    const roller = (id: string) =>
      nodes.find((n) => n.getExtras().mechanism === id)!;
    const low = roller('shooter-roller-360').getWorldMatrix().slice(12, 15);
    const high = roller('shooter-roller-418').getWorldMatrix().slice(12, 15);
    expect(high[0]).toBeGreaterThan(low[0]); // the ascending exit path points along simulated +X
    expect(high[1]).toBeGreaterThan(low[1]);
    expect(doc.getRoot().listTextures()).toHaveLength(2);
    for (const key of ['wrap', 'carbon']) {
      const mat = doc
        .getRoot()
        .listMaterials()
        .find((m) => m.getName() === `8592-${key}`)!;
      expect(mat.getBaseColorTexture()?.getImage()?.byteLength).toBeGreaterThan(
        0,
      );
    }
    for (const n of doc.getRoot().listNodes()) {
      expect(n.getName()).not.toMatch(/Game Piece|CameraFOV|Ball Path/);
      if (n.getExtras().mechanism) continue;
      for (const p of n.getMesh()?.listPrimitives() ?? []) {
        const position = p.getAttribute('POSITION')!;
        const box = new Box3(
          new Vector3(...position.getMinNormalized([])),
          new Vector3(...position.getMaxNormalized([])),
        ).applyMatrix4(new Matrix4().fromArray(n.getWorldMatrix()));
        expect(box.min.x).toBeGreaterThan(-0.66);
        expect(box.max.x).toBeLessThan(0.5);
        expect(box.min.y).toBeGreaterThan(-0.24);
        expect(box.max.y).toBeLessThan(0.65);
        expect(box.min.z).toBeGreaterThan(-0.46);
        expect(box.max.z).toBeLessThan(0.46);
      }
    }
    const wheels = doc
      .getRoot()
      .listNodes()
      .filter((n) => String(n.getExtras().mechanism ?? '').endsWith('-wheel'));
    expect(wheels).toHaveLength(4);
    for (const wheel of wheels) {
      const bounds = new Box3();
      wheel.traverse((n) => {
        for (const p of n.getMesh()?.listPrimitives() ?? []) {
          const a = p.getAttribute('POSITION')!;
          bounds.union(
            new Box3(
              new Vector3(...a.getMinNormalized([])),
              new Vector3(...a.getMaxNormalized([])),
            ).applyMatrix4(new Matrix4().fromArray(n.getWorldMatrix())),
          );
        }
      });
      const size = bounds.getSize(new Vector3());
      expect(size.x).toBeCloseTo(0.1016, 2);
      expect(size.y).toBeCloseTo(0.1016, 2);
      expect(size.z).toBeLessThan(0.041); // four-inch tread, 1.5-inch wide, axle +Z
    }
  });
});
