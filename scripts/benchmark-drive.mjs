import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

// Use the same TypeScript simulation as the client, without WebGL or a browser.
const loader = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { FieldSimulation } = await loader.ssrLoadModule('/src/sim/FieldSimulation.ts');
  const { NEUTRAL_INPUT } = await loader.ssrLoadModule('/src/sim/SwerveChassis.ts');
  const asset = JSON.parse(await readFile(new URL('../public/assets/field-collisions.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('../public/assets/field-manifest.json', import.meta.url), 'utf8'));
  const sim = await FieldSimulation.create(asset, manifest.fuel, true);
  try {
    sim.world.profilerEnabled = !!process.env.DRIVE_PROFILE;
    sim.robot.teleport([2.1, 0.26, 1.5], Math.PI); sim.setRunning(true);
    const steps = [], poses = sim.fuel.map((b) => b.translation());
    const profile = { step: 0, ccd: 0, collision: 0, narrow: 0, solver: 0, userChanges: 0 };
    let maxTilt = 0, peakAwake = 0;
    for (let tick = 0; tick < 120 * 8; tick++) {
      // Drive into the fuel, then reverse through the disturbed supply, then settle.
      sim.robot.input = { ...NEUTRAL_INPUT, forward: tick < 120 * 2 ? 1 : tick < 120 * 4 ? -1 : 0, slow: true };
      const start = performance.now(); sim.update(1 / 120); steps.push(performance.now() - start);
      if (process.env.DRIVE_PROFILE) {
        profile.step += sim.world.timingStep(); profile.ccd += sim.world.timingCcd();
        profile.collision += sim.world.timingCollisionDetection(); profile.narrow += sim.world.timingNarrowPhase();
        profile.solver += sim.world.timingSolver(); profile.userChanges += sim.world.timingUserChanges();
      }
      maxTilt = Math.max(maxTilt, sim.robot.telemetry.tilt); peakAwake = Math.max(peakAwake, sim.awakeBodies);
    }
    steps.sort((a, b) => a - b);
    const rounded = (x) => Math.round(x * 1000) / 1000;
    const report = {
      date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }), runtime: process.version,
      scenario: 'One 56 kg swerve chassis, 504 fuel, official field; 8 s at 120 Hz. 2 s precision forward, 2 s reverse, 4 s settling. Node headless, no warmup exclusion.',
      p50StepMs: rounded(steps[Math.floor(steps.length * 0.5)]), p95StepMs: rounded(steps[Math.floor(steps.length * 0.95)]), maxStepMs: rounded(steps.at(-1)),
      peakAwake, maxTiltDegrees: rounded(maxTilt), fuel: sim.fuel.length,
      displacedFuel: sim.fuel.filter((b, i) => Math.hypot(b.translation().x - poses[i].x, b.translation().z - poses[i].z) > 0.1).length,
      belowFloor: sim.fuel.filter((b) => b.translation().y < -0.02).length,
    };
    if (process.env.DRIVE_PROFILE) console.log('Average engine timings (ms)', Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, rounded(value / steps.length)])));
    if (!process.env.DRIVE_PROFILE) await writeFile(new URL('../docs/driving-baseline.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    if (report.belowFloor || !report.displacedFuel) process.exitCode = 1;
  } finally { sim.dispose(); }
} finally { await loader.close(); }
