import { HumanPlayer } from './HumanPlayer';
import { ROBOTS } from '../robot/RobotDefinition';
import RAPIER from '@dimforge/rapier3d-compat';
import type { CollisionAsset, Vec3 } from '../field/types';
import { NEUTRAL_INPUT } from './SwerveChassis';
import { CollisionGroups } from './collisionGroups';
import { FuelSystem, FUEL_RADIUS } from './FuelSystem';
import { RobotSimulation } from './RobotSimulation';
import { HubSystem } from './HubSystem';
import { MatchRules } from './MatchRules';
import type { MatchConfig } from './MatchRules';
export { FUEL_RADIUS } from './FuelSystem';

const STEP = 1 / 120;

/** Owns physics only. Camera, DOM, and renderer state never enter this class. */
export class FieldSimulation {
  readonly world: RAPIER.World;
  readonly fuelSystem: FuelSystem;
  readonly hubs: HubSystem;
  readonly humanPlayer: HumanPlayer;
  readonly match = new MatchRules();
  get fuel() { return this.fuelSystem.bodies; }
  readonly probe: RAPIER.RigidBody;
  robotController: RobotSimulation | null;
  get robot() { return this.robotController?.chassis ?? null; }
  readonly colliderElements = new Map<number, string>();
  private accumulator = 0;
  private autoTowerAssessed = false;
  private finalTowerAssessed = false;
  running = false;
  probeVisible = false;
  physicsMs = 0;

  static async create(asset: CollisionAsset, fuel: Vec3[], withRobot = false, withHubs = asset.meshes.some(m => m.element.startsWith('hub-'))) {
    await RAPIER.init();
    return new FieldSimulation(asset, fuel, withRobot, withHubs);
  }

  private constructor(asset: CollisionAsset, fuel: Vec3[], withRobot: boolean, withHubs: boolean) {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = STEP;
    this.world.numSolverIterations = 4;
    for (const box of asset.boxes) {
      const collider = this.world.createCollider(RAPIER.ColliderDesc.cuboid(...box.halfExtents)
        .setTranslation(...box.center).setFriction(0.65).setRestitution(0.15).setCollisionGroups(CollisionGroups.field));
      this.colliderElements.set(collider.handle, box.element);
    }
    for (const mesh of asset.meshes) {
      const collider = this.world.createCollider(RAPIER.ColliderDesc.trimesh(
        new Float32Array(mesh.vertices), new Uint32Array(mesh.indices),
      ).setFriction(0.55).setRestitution(0.18).setCollisionGroups(mesh.element.startsWith('bump-') ? CollisionGroups.bump : CollisionGroups.field));
      this.colliderElements.set(collider.handle, mesh.element);
    }
    this.fuelSystem = new FuelSystem(this.world, fuel.map(p => [...p]));
    this.humanPlayer = new HumanPlayer(this.world, this.fuelSystem);
    this.hubs = new HubSystem(this.world, this.fuelSystem, withHubs, event => this.match.recordProcessed(event));
    this.probe = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, -20, 0).setCcdEnabled(true).setCanSleep(true));
    this.world.createCollider(RAPIER.ColliderDesc.ball(FUEL_RADIUS)
      .setMass(0.215).setRestitution(0.45).setFriction(0.6).setCollisionGroups(CollisionGroups.probe), this.probe);
    this.probe.setEnabled(false);
    this.robotController = withRobot ? new RobotSimulation(this.world, this.fuelSystem, this.colliderElements) : null;
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  setRunning(running: boolean) {
    this.running = running && this.match.phase !== 'Complete';
    this.accumulator = 0;
    // Resume preserves sleeping islands. Impacts wake staged fuel naturally;
    // waking all 504 balls after every pause creates needless solver work.
    if (!running && this.robot) this.robot.input = { ...NEUTRAL_INPUT };
    if (!running) this.robotController?.clearInput();
  }

  update(delta: number) {
    if (!this.running) return;
    this.accumulator += Math.min(delta, 0.05);
    const start = performance.now();
    while (this.accumulator >= STEP) {
      this.fuelSystem.time += STEP;
      if (this.robotController) {
        const r = this.robotController;
        if (r.actuatorsEnabled && !this.match.actuatorsEnabled) {
          r.clearInput(); r.chassis.stopDrive();
        }
        r.actuatorsEnabled = this.match.actuatorsEnabled;
        if (!this.match.driverEnabled) {
          r.chassis.input = { ...NEUTRAL_INPUT }; r.input = { intake: false, reverse: false,
            shoot: false };
        }
      }
      const robot = this.robotController;
      if (robot) robot.climber.step(STEP, !!robot.input.climb, !!robot.input.lower, this.match.actuatorsEnabled, robot.shooter.alliance);
      this.robotController?.preStep(STEP);
      this.robotController?.contacts.displaceFuel();
      this.hubs.beforeStep();
      this.world.step();
      // Contacts and cargo impulses must never turn physical pitch/roll drift
      // into vertical fuel displacement or next-frame suspension forces.
      this.robot?.enforceUpright();
      this.robotController?.contacts.displaceFuel();
      this.fuelSystem.postStep(STEP);
      this.hubs.postStep(STEP);
      this.humanPlayer.collectReturns();
      // Clearance queries need the current broad phase before a managed release.
      this.humanPlayer.step(!!robot?.input.supply, this.match.actuatorsEnabled, robot?.shooter.alliance ?? 'blue');
      this.robotController?.postStep(STEP);
      this.accumulator -= STEP;
      if (this.match.mode === 'match' && robot) {
        const time = this.match.elapsed + STEP;
        if (!this.autoTowerAssessed && time >= 20 && !this.match.telemetry.endedEarly) {
          this.match.assessTower(robot.shooter.alliance, robot.climber.level, 'auto'); this.autoTowerAssessed = true;
        }
        if (this.match.phase === 'Final scoring' && !this.finalTowerAssessed) {
          const velocity = robot.chassis.body.linvel(), spin = robot.chassis.body.angvel();
          const atRest = Math.hypot(velocity.x, velocity.y, velocity.z) < .05 && Math.hypot(spin.x, spin.y, spin.z) < .05;
          if (atRest || this.match.telemetry.phaseRemaining <= STEP + 1e-7) {
            const autoOnly = this.match.telemetry.endedAt !== null && this.match.telemetry.endedAt < 23;
            if (!autoOnly || !this.autoTowerAssessed) this.match.assessTower(robot.shooter.alliance, robot.climber.level, autoOnly ? 'auto' : 'teleop');
            this.finalTowerAssessed = true;
          }
        }
      }
      this.match.advance();
      if (this.match.phase === 'Complete') { this.setRunning(false); break; }
    }
    this.physicsMs = performance.now() - start;
  }

  reset() {
    this.running = false;
    this.autoTowerAssessed = this.finalTowerAssessed = false;
    this.accumulator = 0;
    this.fuelSystem.reset();
    this.hubs.reset(); this.humanPlayer.reset();
    this.match.reset();
    this.probe.setEnabled(false);
    this.probeVisible = false;
    this.robotController?.reset();
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  startPractice() { this.reset(); this.setRunning(true); }
  startMatch(config: MatchConfig) {
    this.reset(); this.match.start(config);
    const definition = ROBOTS[this.match.config.robot ?? '2910-reblitz'];
    if (this.robotController && this.robotController.chassis.definition.id !== definition.id) {
      this.world.removeRigidBody(this.robotController.chassis.body);
      this.robotController = new RobotSimulation(this.world, this.fuelSystem, this.colliderElements, definition);
    }
    this.configureRobot(config);
    const neutral = this.fuelSystem.records.filter(f => Math.abs(f.body.translation().x) < 1.1 && f.body.translation().y < 0.15).slice(-this.match.config.preloads);
    if (this.match.config.preloads) this.robotController?.preload(neutral.map(f => f.id));
    if (config.humanSupply) this.humanPlayer.stock();
    this.setRunning(true);
  }
  configureRobot(config: MatchConfig) {
    const r = this.robotController; if (!r) return;
    const sign = config.alliance === 'red' ? -1 : 1;
    r.shooter.alliance = config.alliance === 'red' ? 'red' : 'blue';
    r.chassis.teleport([sign * 6.1, 0.26, sign * (config.spawn === 'right' ? -2.1 : config.spawn === 'center' ? -0.288925 : 2.1)], sign === 1 ? 0 : Math.PI);
  }
  restartMatch() { this.startMatch({ ...this.match.config }); }

  dropProbe(position: Vec3) {
    this.probe.setEnabled(true);
    this.probe.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
    this.probe.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.probe.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.probeVisible = true;
    this.running = true;
    this.accumulator = 0;
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  get awakeBodies() {
    let count = 0;
    this.world.forEachRigidBody((body) => { if (body.isEnabled() && !body.isSleeping()) count++; });
    return count;
  }

  dispose() { this.world.free(); }
}
