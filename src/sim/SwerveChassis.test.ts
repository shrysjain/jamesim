import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FieldSimulation } from './FieldSimulation';
import { NEUTRAL_INPUT, DEFAULT_TUNING } from './SwerveChassis';
import { toRobotInput } from './driveInput';
import type { CollisionAsset, FieldManifest, Vec3 } from '../field/types';

const floor: CollisionAsset = { boxes: [{ element: 'floor', center: [0, -0.1, 0], halfExtents: [25, 0.1, 25] }], meshes: [] };
let field: CollisionAsset, manifest: FieldManifest;
beforeAll(() => {
  field = JSON.parse(readFileSync(new URL('../../public/assets/field-collisions.json', import.meta.url), 'utf8'));
  manifest = JSON.parse(readFileSync(new URL('../../public/assets/field-manifest.json', import.meta.url), 'utf8'));
});
function run(sim: FieldSimulation, seconds: number) { for (let i = 0; i < Math.round(seconds * 120); i++) sim.update(1 / 120); }
async function setup(asset = floor, position: Vec3 = [0, 0.26, 0], yaw = 0, fuel: Vec3[] = []) {
  const sim = await FieldSimulation.create(asset, fuel, true);
  sim.robot!.teleport(position, yaw); sim.setRunning(true); run(sim, 0.4);
  return sim;
}

describe('swerve dynamics', () => {
  it('rejects pitch and roll impulses while retaining yaw and ground traction', async () => {
    const sim = await setup();
    try {
      sim.robot!.body.applyTorqueImpulse({ x: 300, y: 2, z: -300 }, true);
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, turn: 0.5 }; run(sim, 1);
      expect(sim.robot!.telemetry.tilt).toBeLessThan(0.01);
      expect(sim.robot!.telemetry.speed).toBeGreaterThan(1);
      expect(sim.robot!.telemetry.turnRate).toBeGreaterThan(1);
    } finally { sim.dispose(); }
  });
  it('accelerates, reaches the speed limit, and brakes without prescribing a body velocity', async () => {
    const sim = await setup();
    try {
      const robot = sim.robot!;
      robot.input = { ...NEUTRAL_INPUT, forward: 1 };
      run(sim, 0.25); expect(robot.telemetry.speed).toBeGreaterThan(0.7); expect(robot.telemetry.speed).toBeLessThan(2.4);
      run(sim, 1); expect(robot.telemetry.speed).toBeCloseTo(DEFAULT_TUNING.maxSpeed, 1);
      const beforeBrake = robot.body.translation().x;
      robot.input = { ...NEUTRAL_INPUT, brake: true }; run(sim, 0.8);
      expect(robot.telemetry.speed).toBeLessThan(0.12);
      expect(robot.body.translation().x - beforeBrake).toBeGreaterThan(0.4);
      expect(robot.body.translation().x - beforeBrake).toBeLessThan(1.8);
      expect(robot.telemetry.grounded).toBe(4); expect(robot.telemetry.tilt).toBeLessThan(1);
    } finally { sim.dispose(); }
  });

  it('strafes and rotates, and normalizes diagonal input', async () => {
    const speeds = [];
    for (const input of [{ forward: 1, strafe: 0, turn: 0 }, { forward: 0, strafe: 1, turn: 0 }, { forward: 1, strafe: 1, turn: 0 }, { forward: 0, strafe: 0, turn: 1 }]) {
      const sim = await setup();
      try {
        sim.robot!.input = { ...NEUTRAL_INPUT, ...input }; run(sim, 1.5);
        if (input.turn) {
          expect(sim.robot!.telemetry.turnRate).toBeGreaterThan(3.8);
          expect(sim.robot!.telemetry.speed).toBeLessThan(0.15);
        } else { speeds.push(sim.robot!.telemetry.speed); }
      } finally { sim.dispose(); }
    }
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeLessThan(0.15);
  });

  it('has no drive or yaw authority in the air', async () => {
    const sim = await FieldSimulation.create(floor, [], true);
    try {
      sim.robot!.teleport([0, 3, 0]); sim.setRunning(true);
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, turn: 1 }; run(sim, 0.25);
      expect(sim.robot!.telemetry.speed).toBeLessThan(0.001);
      expect(Math.abs(sim.robot!.telemetry.turnRate)).toBeLessThan(0.001);
      expect(sim.robot!.telemetry.grounded).toBe(0);
    } finally { sim.dispose(); }
  });

  it('removes off-axis drift without changing yaw or vertical flight', async () => {
    const sim = await setup();
    try {
      const robot = sim.robot!;
      robot.teleport([0, 1.5, 0], 0.8);
      const q = robot.body.rotation();
      robot.body.setRotation({ ...q, x: 0.002, z: -0.003 }, true);
      robot.body.setAngvel({ x: 0.2, y: 1.5, z: -0.3 }, true);
      robot.body.setLinvel({ x: 0.4, y: 2, z: -0.2 }, true);
      robot.enforceUpright();
      expect(robot.telemetry.heading).toBeCloseTo(0.8, 5);
      expect(robot.body.angvel().y).toBeCloseTo(1.5);
      expect(robot.body.linvel()).toEqual({ x: expect.closeTo(0.4), y: 2, z: expect.closeTo(-0.2) });
      expect(robot.body.translation().y).toBe(1.5);
      run(sim, 0.1);
      expect(robot.body.translation().y).toBeGreaterThan(1.6);
      expect(robot.telemetry.grounded).toBe(0);
      expect(robot.telemetry.heading).toBeGreaterThan(0.9);
      run(sim, 1.5);
      expect(robot.body.rotation().x).toBe(0); expect(robot.body.rotation().z).toBe(0);
      expect(robot.body.translation().y).toBeLessThan(0.24);
      expect(robot.telemetry.grounded).toBe(4);
    } finally { sim.dispose(); }
  });

  it('gives equivalent motion at different render update rates', async () => {
    const positions = [];
    for (const rate of [30, 60, 144]) {
      const sim = await setup();
      try {
        sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, strafe: 0.4, turn: 0.2 };
        for (let i = 0; i < rate * 2; i++) sim.update(1 / rate);
        positions.push(sim.robot!.body.translation());
      } finally { sim.dispose(); }
    }
    for (const p of positions) { expect(p.x).toBeCloseTo(positions[0].x, 1); expect(p.z).toBeCloseTo(positions[0].z, 1); }
  });

  it('makes precision input slower and bounds combined translation and rotation', async () => {
    const sim = await setup();
    try {
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, slow: true }; run(sim, 1.2);
      expect(sim.robot!.telemetry.speed).toBeCloseTo(DEFAULT_TUNING.maxSpeed * 0.32, 1);
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, strafe: 1, turn: 1 }; run(sim, 1);
      expect(sim.robot!.modules.every((m) => Math.abs(m.speed) <= DEFAULT_TUNING.maxSpeed + 0.001)).toBe(true);
      expect(sim.robot!.telemetry.speed).toBeLessThan(DEFAULT_TUNING.maxSpeed + 0.1);
    } finally { sim.dispose(); }
  });

  it('keeps field-relative translation aligned while turning the chassis', async () => {
    const sim = await setup(floor, [0, 0.23, 0], Math.PI);
    try {
      for (let i = 0; i < 120 * 1.8; i++) {
        sim.robot!.input = toRobotInput({ ...NEUTRAL_INPUT, forward: 1, turn: 0.6 }, sim.robot!.telemetry.heading, 'field');
        sim.update(1 / 120);
      }
      expect(sim.robot!.body.translation().x).toBeLessThan(-3);
      expect(Math.abs(sim.robot!.body.translation().z)).toBeLessThan(0.25);
      expect(sim.robot!.telemetry.turnRate).toBeGreaterThan(1.5);
      expect(sim.robot!.telemetry.tilt).toBeLessThan(3);
    } finally { sim.dispose(); }
  });
});

describe('chassis on the official field', () => {
  it('is stopped by the alliance wall at full speed', async () => {
    const sim = await setup(field, [6.1, 0.26, 2.1]);
    try {
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1 }; run(sim, 1.5);
      expect(sim.robot!.body.translation().x).toBeLessThan(7.9);
      expect(sim.robot!.body.translation().x).toBeGreaterThan(7.5);
      expect(sim.robot!.telemetry.speed).toBeLessThan(0.3);
    } finally { sim.dispose(); }
  }, 30_000);

  it.each([-1, 1])('crosses both bump lanes on alliance side %i with bounded visual lean and level physics', async (side) => {
    for (const z of [-1.65, 1.65]) {
      const sim = await setup(field, [side * 5.35, 0.26, z], side > 0 ? Math.PI : 0);
      try {
        let maxHeight = 0, maxTilt = 0;
        sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, slow: true };
        for (let i = 0; i < 120 * 3; i++) {
          sim.update(1 / 120); maxHeight = Math.max(maxHeight, sim.robot!.body.translation().y); maxTilt = Math.max(maxTilt, sim.robot!.telemetry.tilt);
          expect(sim.robot!.body.rotation().x).toBe(0); expect(sim.robot!.body.rotation().z).toBe(0);
        }
        expect(maxHeight).toBeGreaterThan(0.32); expect(maxHeight).toBeLessThan(0.65);
        expect(maxTilt).toBeGreaterThan(3); expect(maxTilt).toBeLessThan(15.1);
        expect(sim.robot!.body.translation().x * side).toBeLessThan(3);
        expect(sim.robot!.body.translation().y).toBeGreaterThan(0.18);
      } finally { sim.dispose(); }
    }
  }, 30_000);

  it.each([[-1, 0], [-1, 1], [1, 0], [1, 1]])('passes both trench arms on side %i with deployment %i', async (side, deployed) => {
    for (const z of [-3.35, 3.35]) {
      const sim = await setup(field, [side * 5.35, 0.26, z], side > 0 ? Math.PI : 0);
      try {
        sim.robotController!.inspect({ intake: deployed, hopper: deployed, hood: 0 });
        sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1 }; run(sim, 1.2);
        expect(sim.robot!.body.translation().x * side).toBeLessThan(3);
        expect(sim.robot!.telemetry.tilt).toBeLessThan(0.01);
        expect(sim.robot!.body.translation().y).toBeGreaterThan(0.18);
      } finally { sim.dispose(); }
    }
  }, 30_000);

  it.each([0, 0.25])('crosses a bump at full speed with approach angle %f', async (angle) => {
    const sim = await setup(field, [5.35, 0.26, 1.65 - Math.tan(angle) * 1.7], Math.PI + angle);
    try {
      let maxHeight = 0, maxTilt = 0;
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1 };
      // Assisted terrain height must remain bounded and settle after crossing.
      for (let i = 0; i < 120 * 2.5; i++) {
        sim.update(1 / 120);
        maxHeight = Math.max(maxHeight, sim.robot!.body.translation().y);
        maxTilt = Math.max(maxTilt, sim.robot!.telemetry.tilt);
        expect(sim.robot!.body.rotation().x).toBe(0); expect(sim.robot!.body.rotation().z).toBe(0);
      }
      expect(sim.robot!.body.translation().x).toBeLessThan(2.6);
      expect(maxHeight).toBeGreaterThan(0.33); expect(maxHeight).toBeLessThan(0.9);
      expect(maxTilt).toBeGreaterThan(3); expect(maxTilt).toBeLessThan(15.1);
      expect(sim.robot!.body.translation().y).toBeGreaterThan(0.18);
    } finally { sim.dispose(); }
  }, 30_000);

  it('stops against a trench support instead of driving through it', async () => {
    const sim = await setup(field, [5.35, 0.26, 2.75], Math.PI);
    try {
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, slow: true }; run(sim, 2);
      expect(sim.robot!.body.translation().x).toBeGreaterThan(4);
      expect(sim.robot!.body.translation().x).toBeLessThan(4.8);
      expect(sim.robot!.telemetry.speed).toBeLessThan(0.2);
    } finally { sim.dispose(); }
  }, 30_000);

  it('pushes the full fuel supply with no loss through the floor and restores the full scene', async () => {
    const sim = await setup(field, [2.1, 0.26, 1.5], Math.PI, manifest.fuel);
    try {
      const before = sim.fuel.map((b) => b.translation());
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, slow: true }; run(sim, 2.5);
      const displaced = sim.fuel.filter((body, i) => Math.hypot(body.translation().x - before[i].x, body.translation().z - before[i].z) > 0.1);
      expect(displaced.length).toBeGreaterThan(8);
      expect(sim.fuel).toHaveLength(504);
      expect(sim.fuel.every((b) => b.translation().y > -0.02)).toBe(true);
      expect(sim.robot!.telemetry.tilt).toBeLessThan(25);
      sim.reset(); expect(sim.robot!.telemetry.speed).toBe(0); expect(sim.robot!.input).toEqual(NEUTRAL_INPUT);
      expect(sim.fuel[0].translation().x).toBeCloseTo(manifest.fuel[0][0], 5);
    } finally { sim.dispose(); }
  }, 30_000);

  it('keeps full-speed fuel impacts bounded without tunneling through the floor', async () => {
    const sim = await setup(field, [2.1, 0.26, 1.5], Math.PI, manifest.fuel);
    try {
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1 };
      let maxSpeed = 0, maxTilt = 0;
      for (let i = 0; i < 180; i++) {
        sim.update(1 / 120); maxTilt = Math.max(maxTilt, sim.robot!.telemetry.tilt);
        for (const body of sim.fuel) {
          const v = body.linvel(); maxSpeed = Math.max(maxSpeed, Math.hypot(v.x, v.y, v.z));
          expect(body.translation().y).toBeGreaterThan(-0.02);
        }
      }
      expect(maxSpeed).toBeLessThan(20); expect(maxTilt).toBeLessThan(45);
      expect(sim.robot!.body.translation().x).toBeLessThan(0.5);
    } finally { sim.dispose(); }
  }, 30_000);

  it('pushes a row of floor fuel with the bumper instead of riding onto it', async () => {
    const fuel: Vec3[] = Array.from({ length: 8 }, (_, i) => [1 + i * 0.153, 0.0755, 0]);
    const sim = await setup(floor, [0, 0.23, 0], 0, fuel);
    try {
      let maxBodyHeight = 0, maxFuelHeight = 0, maxTilt = 0;
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, slow: true };
      for (let i = 0; i < 120 * 1.8; i++) {
        sim.update(1 / 120); maxBodyHeight = Math.max(maxBodyHeight, sim.robot!.body.translation().y);
        maxTilt = Math.max(maxTilt, sim.robot!.telemetry.tilt);
        for (const body of sim.fuel) maxFuelHeight = Math.max(maxFuelHeight, body.translation().y);
      }
      expect(sim.robot!.body.translation().x).toBeGreaterThan(1.6);
      const p = sim.robot!.body.translation();
      // Fuel may scatter or stack above the bumper; floor fuel must not enter under the frame.
      expect(sim.fuel.some((b) => Math.abs(b.translation().x - p.x) < 0.44 && Math.abs(b.translation().z - p.z) < 0.40 && b.translation().y < 0.14)).toBe(false);
      expect(sim.fuel.every((b, i) => b.translation().x > fuel[i][0] + 0.5)).toBe(true);
      expect(maxBodyHeight).toBeLessThan(0.245); expect(maxTilt).toBeLessThan(5);
      expect(maxFuelHeight).toBeLessThan(0.4);
    } finally { sim.dispose(); }
  }, 30_000);

  it('meets an isolated floor ball at bumper height and pushes it without ride-up', async () => {
    const sim = await setup(floor, [0, 0.23, 0], 0, [[1, 0.0755, 0]]);
    try {
      let maxBodyHeight = 0, maxFuelHeight = 0;
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1, slow: true };
      for (let i = 0; i < 180; i++) {
        sim.update(1 / 120); maxBodyHeight = Math.max(maxBodyHeight, sim.robot!.body.translation().y);
        maxFuelHeight = Math.max(maxFuelHeight, sim.fuel[0].translation().y);
      }
      expect(sim.fuel[0].translation().x).toBeGreaterThan(sim.robot!.body.translation().x + 0.5);
      expect(maxFuelHeight).toBeLessThan(0.10); expect(maxBodyHeight).toBeLessThan(0.24);
    } finally { sim.dispose(); }
  });

  it('displaces fuel underneath a landing robot and drives through a pile without beaching', async () => {
    const fuel: Vec3[] = [0, 1].flatMap(layer => [0, 1, 2, 3].flatMap(row => [-0.23, -0.077, 0.077, 0.23].map(z => [row * 0.153, 0.076 + layer * 0.153, z] as Vec3)));
    const sim = await setup(floor, [0, 0.4, 0], 0, fuel);
    try {
      const handles = sim.fuel.map(b => b.handle);
      sim.robot!.input = { ...NEUTRAL_INPUT, forward: 1 }; run(sim, 1.5);
      expect(sim.robot!.body.translation().x).toBeGreaterThan(3);
      expect(sim.robot!.body.translation().y).toBeLessThan(0.24);
      expect(sim.robot!.telemetry.tilt).toBeLessThan(0.01);
      expect(sim.robot!.telemetry.grounded).toBe(4);
      expect(sim.fuel.every(b => b.translation().y > 0)).toBe(true);
      expect(sim.fuel.map(b => b.handle)).toEqual(handles);
    } finally { sim.dispose(); }
  });
});
