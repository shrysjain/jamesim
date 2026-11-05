import { expect, it } from 'vitest';
import { MATTERHORN } from './robots/9496-matterhorn/definition';
import { ICARUS } from './robots/5000-icarus-2/definition';
import { retainingNetPanels } from './retainingNet';
import { HopperDynamics } from '../sim/HopperDynamics';
import { v3 } from '../sim/vector';
const pose = { intake: 1, hopper: 1, hood: 0 };
it('moves fitted nets with the actual cargo bounds and leaves the Icarus rigid roof/turret open', () => {
  const open = retainingNetPanels(MATTERHORN, pose), closed = retainingNetPanels(MATTERHORN, { ...pose, intake: 0, hopper: 0 });
  expect(open).toHaveLength(5); expect(closed).toHaveLength(5);
  expect(Math.min(...closed.flat().map(p => p[0])) - Math.min(...open.flat().map(p => p[0]))).toBeCloseTo(.3048);
  for (const panel of retainingNetPanels(ICARUS, { ...pose, opposedIntake: 1 })) {
    const xs = panel.map(p => p[0]); expect(Math.max(...xs) <= -.328613 || Math.min(...xs) >= .328613).toBe(true);
  }
});
it('retains original local cargo against the net above a finite rim, while the uncovered control can spill', () => {
  const run = (covered: boolean) => {
    const d = { ...MATTERHORN, hopper: { ...MATTERHORN.hopper, retainingNet: covered ? MATTERHORN.hopper.retainingNet : undefined } };
    const hopper = new HopperDynamics(d), f = { id: 71, state: 'stored' as const, local: v3(-.3, .40, .30) };
    const motion = { position: v3(0, .223, 0), velocity: v3(), angularVelocity: v3(), rotation: { x: 0, y: 0, z: 0, w: 1 } };
    let spilled = false;
    for (let i = 0; i < 120; i++) { motion.velocity.z -= .04; spilled ||= hopper.step(1 / 120, [f], pose, motion).length > 0; }
    return { f, spilled };
  };
  const covered = run(true), open = run(false);
  expect(covered.spilled).toBe(false); expect(Math.abs(covered.f.local.z) + .075).toBeLessThanOrEqual(MATTERHORN.hopper.volume!.halfWidth + .001);
  expect(open.spilled).toBe(true); expect(covered.f.id).toBe(71);
});
