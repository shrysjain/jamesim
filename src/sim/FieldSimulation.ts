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
  readonly match = new MatchRules();
  get fuel() { return this.fuelSystem.bodies; }
  readonly probe: RAPIER.RigidBody;
  readonly robotController: RobotSimulation | null;
  get robot() { return this.robotController?.chassis ?? null; }
  readonly colliderElements = new Map<number, string>();
  private accumulator = 0;
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
      this.robotController?.preStep(STEP);
      this.robotController?.contacts.displaceFuel();
      this.hubs.beforeStep();
      this.world.step();
      this.robotController?.contacts.displaceFuel();
      this.fuelSystem.postStep(STEP);
      this.hubs.postStep(STEP);
      this.robotController?.postStep(STEP);
      this.accumulator -= STEP;
      this.match.advance();
      if (this.match.phase === 'Complete') { this.setRunning(false); break; }
    }
    this.physicsMs = performance.now() - start;
  }

  reset() {
    this.running = false;
    this.accumulator = 0;
    this.fuelSystem.reset();
    this.hubs.reset();
    this.match.reset();
    this.probe.setEnabled(false);
    this.probeVisible = false;
    this.robotController?.reset();
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  startPractice() { this.reset(); this.setRunning(true); }
  startMatch(config: MatchConfig) {
    this.reset(); this.match.start(config);
    const neutral = this.fuelSystem.records.filter(f => Math.abs(f.body.translation().x) < 1.1 && f.body.translation().y < 0.15).slice(-this.match.config.preloads);
    if (this.match.config.preloads) this.robotController?.preload(neutral.map(f => f.id));
    this.setRunning(true);
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
