import { expect, it } from 'vitest';
import { FieldSimulation } from './FieldSimulation';
import { DEFAULT_MATCH } from './MatchRules';
import { NEUTRAL_INPUT } from './SwerveChassis';
import type { CollisionAsset } from '../field/types';
const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [25, .1, 25] }], meshes: [] };
const run = (s: FieldSimulation, seconds: number) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.update(1 / 120); };
it('Reblitz collects original fuel while shooting, and retains drive/intake and moving-hub limits', async () => {
  const s = await FieldSimulation.create(floor, Array.from({ length: 8 }, (_, i) => [0, .08, i * .16]), true);
  try {
    s.startSession({ ...DEFAULT_MATCH, preloads: 4 }, true); s.robot!.teleport([6.2, .26, 0], Math.PI); run(s, .6);
    const r = s.robotController!, handles = s.fuel.map(b => b.handle), incoming = s.fuelSystem.records.find(f => f.owner === null)!;
    incoming.body.setTranslation(r.toWorld({ x: -.62, y: -.145, z: 0 }), true); incoming.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    s.world.propagateModifiedBodyPositionsToColliders(); r.input = { intake: true, shoot: true }; run(s, .2);
    expect(incoming.owner).toBe(r.owner); expect(r.chassis.pose.intake).toBe(1); run(s, 3);
    expect(r.shooter.shots.some(shot => shot.id === incoming.id)).toBe(true);
    r.input.shoot = false; r.input.intake = true; r.chassis.input = { ...NEUTRAL_INPUT, strafe: .3 }; run(s, .5);
    expect(r.chassis.telemetry.speed).toBeGreaterThan(.4);
    const next = s.fuelSystem.records.find(f => f.owner === null && !r.shooter.shots.some(shot => shot.id === f.id))!;
    next.body.setTranslation(r.toWorld({ x: -.62, y: -.145, z: 0 }), true); next.body.setLinvel(r.chassis.body.linvel(), true);
    s.world.propagateModifiedBodyPositionsToColliders(); run(s, .1); expect(next.owner).toBe(r.owner);
    const fired = r.shooter.shotsFired; r.input.shoot = true; run(s, .3);
    expect(r.shooter.shotsFired).toBe(fired); expect(r.shooter.solution?.target.kind).toBe('Hub');
    expect(r.chassis.telemetry.speed).toBeGreaterThan(.4);
    expect(s.fuel.map(b => b.handle)).toEqual(handles); expect(s.fuelSystem.records).toHaveLength(8);
  } finally { s.dispose(); }
});
