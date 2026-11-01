import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';

const loader = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const practice = process.argv.includes('--practice');
try {
  const { FieldSimulation } = await loader.ssrLoadModule('/src/sim/FieldSimulation.ts');
  const { NEUTRAL_INPUT } = await loader.ssrLoadModule('/src/sim/SwerveChassis.ts');
  const asset = JSON.parse(await readFile('public/assets/field-collisions.json', 'utf8'));
  const manifest = JSON.parse(await readFile('public/assets/field-manifest.json', 'utf8'));
  const sim = await FieldSimulation.create(asset, manifest.fuel, true);
  try {
    const run = seconds => { for (let i = 0; i < Math.round(seconds * 120); i++) sim.update(1 / 120); };
    const robot = sim.robotController;
    robot.respawn('fuel'); sim.setRunning(true);
    robot.input = { intake: true, reverse: false }; sim.robot.input = { ...NEUTRAL_INPUT, forward: -1 }; run(1.5);
    const collected = robot.held.length;
    robot.respawn('practice'); robot.input = { intake: false, reverse: false, shoot: true };
    const times = [];
    let peakAirborne = 0;
    for (let i = 0; i < 600; i++) {
      const start = performance.now(); sim.update(1 / 120); times.push(performance.now() - start);
      peakAirborne = Math.max(peakAirborne, sim.fuelSystem.counts.airborne);
    }
    const counts = sim.fuelSystem.counts;
    if (!collected || robot.held.length || robot.shooter.shotsFired !== collected) throw new Error('Collect/carry/shoot cycle failed');
    if (counts.total !== 504 || counts.loose + counts.airborne + counts.stored + counts.transferring + counts.feeding + counts.hubTransit !== 504) throw new Error('Fuel conservation failed');
    const hubs = sim.hubs.telemetry;
    if (practice && (!hubs.blue.hits || hubs.inTransit || hubs.returned !== hubs.blue.hits + hubs.red.hits)) throw new Error('Hub entry/return cycle failed');
    times.sort((a, b) => a - b);
    const report = { date: new Date().toISOString(), scenario: 'Official field, 504 fuel; intake 1.5 s, robot-only respawn, shoot 5 s',
      collected, launched: robot.shooter.shotsFired, lanesUsed: [...new Set(robot.shooter.shots.map(s => s.lane))].sort(),
      remainingCargo: robot.held.length, finalMassKg: sim.robot.body.mass(), counts, peakAirborne, hubs,
      stepMs: { mean: times.reduce((a, b) => a + b) / times.length, p95: times[Math.floor(times.length * 0.95)], max: times.at(-1) },
      notes: 'Headless wall time per 120 Hz simulation step, including aim selection and field/fuel physics. No rendering; local load and warmup affect timing. Launch counts are not scored hub entries.' };
    await writeFile(practice ? 'docs/practice-baseline.json' : 'docs/shooter-baseline.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { sim.dispose(); }
} finally { await loader.close(); }
