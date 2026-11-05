import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { RobotView } from '../../../view/RobotView';
import { STARTING_POSE } from '../../poses';
import type { SwerveChassis } from '../../../sim/SwerveChassis';
import type { RobotSimulation } from '../../../sim/RobotSimulation';
import { SIMBOT_TIM as D, TIM_TRAVEL, TIM_RISE } from './definition';
import { FieldSimulation } from '../../../sim/FieldSimulation';
import { DEFAULT_MATCH } from '../../../sim/MatchRules';

let source: THREE.Group;
beforeAll(async () => {
  await MeshoptDecoder.ready;
  const bytes = readFileSync(`public${D.model}`);
  source = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
});

function fixture() {
  const model = source.clone(true), view = new RobotView();
  view['models'].set(D.id, model); view.group.add(model); view.setDefinition(D);
  const nodes = new Map<string, THREE.Object3D>();
  model.traverse(node => { if (node.userData.mechanism) nodes.set(node.userData.mechanism, node); });
  const robot = { definition: D, pose: { ...STARTING_POSE }, renderRotation: new THREE.Quaternion(),
    body: { translation: () => ({ x: 0, y: .223, z: 0 }), rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) },
    modules: D.modules.map(module => ({ ...module, angle: 0, speed: 0, suspension: .1122 })) } as unknown as SwerveChassis;
  const mechanisms = { rollerAngle: 0, indexerAngle: 0, kickerDeployment: 0,
    shooter: { alliance: 'blue', drumAngle: 0, feederAngle: 0, turretYaw: 0, elevation: D.shooterGeometry.maxElevation },
    climber: { telemetry: { extension: 0 } } } as unknown as RobotSimulation;
  return { view, nodes, robot, mechanisms };
}

describe('Simbot Tim prepared CAD animation', () => {
  it('keeps the lower kicker down as the real upper roller carriage slides', () => {
    const { view, nodes, robot, mechanisms } = fixture();
    try {
      const lower = nodes.get('intake-roller-lower')!, upper = nodes.get('intake-roller-upper')!;
      const lowerPositions: THREE.Vector3[] = [], upperPositions: THREE.Vector3[] = [];
      for (const extension of [0, 6.4 / 13.55, 1, .5, 0]) {
        robot.pose.intake = extension; view.update(robot, 0, mechanisms); view.group.updateMatrixWorld(true);
        lowerPositions.push(lower.getWorldPosition(new THREE.Vector3()));
        upperPositions.push(upper.getWorldPosition(new THREE.Vector3()));
      }
      lowerPositions.forEach(position => expect(position.distanceTo(lowerPositions[0])).toBeLessThan(1e-12));
      expect(upperPositions[2].distanceTo(upperPositions[0])).toBeGreaterThan(.34);
      expect(upperPositions[4].distanceTo(upperPositions[0])).toBeLessThan(1e-12);
    } finally { view.dispose(); }
  });

  it('moves the intact polycarbonate wrap and top rim with the carriage, while keeping every preload inside its front wall', () => {
    const { view, nodes, robot, mechanisms } = fixture();
    try {
      const initial = new Map<string, THREE.Vector3>();
      for (const extension of [0, .5, 1]) {
        robot.pose.intake = extension; view.update(robot, 0, mechanisms); view.group.updateMatrixWorld(true);
        for (const id of ['hopper-shell', 'hopper-rim']) {
          const node = nodes.get(id)!; expect(node.parent).toBe(nodes.get('intake'));
          const center = new THREE.Box3().setFromObject(node, true).getCenter(new THREE.Vector3());
          if (extension === 0) initial.set(id, center.clone());
          const delta = center.sub(initial.get(id)!);
          expect(delta.x).toBeCloseTo(-TIM_TRAVEL * extension, 5);
          expect(delta.y).toBeCloseTo(-TIM_RISE * extension, 5);
        }
        const front = D.hopper.volume!.frontX + TIM_TRAVEL * (1 - extension);
        for (const p of D.cargoSlots.slice(0, 8)) expect(p[0] - .075).toBeGreaterThanOrEqual(front);
      }
      const rim = nodes.get('hopper-rim')!; let triangles = 0;
      rim.traverse(n => { if (n instanceof THREE.Mesh) triangles += (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3; });
      // The source's .79mm cap retains its complete 524-triangle tessellation;
      // unbounded decimation previously punched diagonal holes through it.
      expect(triangles).toBe(524);
    } finally { view.dispose(); }
  });

  it('launches along the actual final hood-roller tangent at distinct hub and pass elevations', async () => {
    const elevations: number[] = [];
    for (const position of [[6.2, .26, 2.1], [0, .26, 0]] as [number, number, number][]) {
      const simulation = await FieldSimulation.create({ boxes: [{ element: 'floor', center: [0, -.1, 0], halfExtents: [25, .1, 25] }], meshes: [] }, [[0, .08, 3]], true);
      const { view, nodes } = fixture();
      try {
        simulation.startSession({ ...DEFAULT_MATCH, robot: D.id as '1114-simbot-tim', preloads: 1 }, true);
        simulation.robot!.teleport(position, 0);
        const r = simulation.robotController!;
        for (let tick = 0; tick < 84; tick++) simulation.update(1 / 120);
        r.input.shoot = true;
        for (let tick = 0; tick < 1500 && !r.shooter.shotsFired; tick++) simulation.update(1 / 120);
        expect(r.shooter.shotsFired, JSON.stringify(r.shooter.telemetry)).toBe(1);
        view.update(r.chassis, 0, r); view.group.updateMatrixWorld(true);
        const shaft = nodes.get('shooter-drum')!.getWorldPosition(new THREE.Vector3());
        const lastRoller = nodes.get('hood-roller-2')!.getWorldPosition(new THREE.Vector3());
        const q = r.chassis.renderRotation, axis = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
        const tangent = axis.cross(lastRoller.sub(shaft)).normalize();
        const shot = r.shooter.shots[0], chassisVelocity = r.chassis.body.velocityAtPoint(shot.position);
        const launch = new THREE.Vector3(shot.velocity.x - chassisVelocity.x, shot.velocity.y - chassisVelocity.y, shot.velocity.z - chassisVelocity.z).normalize();
        expect(tangent.dot(launch), 'physical fuel must leave through the sloped roller opening').toBeGreaterThan(Math.cos(.16));
        const local = launch.clone().applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w).invert());
        expect(local.x).toBeLessThan(0);
        elevations.push(r.shooter.elevation);
      } finally { view.dispose(); simulation.dispose(); }
    }
    expect(Math.abs(elevations[0] - elevations[1])).toBeGreaterThan(.08);
  }, 30000);

  it('spins every prepared roller about its own shaft rather than orbiting a neighboring cylinder', () => {
    const { view, nodes, robot, mechanisms } = fixture();
    try {
      robot.pose.intake = .7; robot.pose.hood = .3;
      const ids = [...nodes.keys()].filter(id => /^(intake-roller-|feeder-roller-|hood-roller-|shooter-drum$)/.test(id));
      expect(ids.length).toBeGreaterThan(20);
      for (const angle of [0, .5, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI]) {
        mechanisms.rollerAngle = angle; mechanisms.shooter.drumAngle = angle; mechanisms.shooter.feederAngle = angle;
        view.update(robot, 0, mechanisms); view.group.updateMatrixWorld(true);
        for (const id of ids) {
          const node = nodes.get(id)!, center = new THREE.Box3().setFromObject(node, true).getCenter(new THREE.Vector3());
          const localCenter = node.worldToLocal(center);
          expect(Math.hypot(localCenter.x, localCenter.y), `${id} has an offset roller shaft`).toBeLessThan(.015);
        }
      }
    } finally { view.dispose(); }
  });

  it('retains rigid wheel and fork mounts while steering and ground support vary', () => {
    const { view, nodes, robot, mechanisms } = fixture();
    const roots = D.modules.flatMap(module => [nodes.get(module.name + '-wheel')!, nodes.get(module.name + '-fork')!]);
    const initial = roots.map(node => node.position.clone());
    try {
      for (const support of [0, .05, .1122, .25]) {
        robot.modules.forEach(module => { module.suspension = support; module.angle = .6; module.speed = 2; });
        view.update(robot, 1 / 120, mechanisms);
        roots.forEach((node, index) => expect(node.position.distanceTo(initial[index])).toBeLessThan(1e-12));
      }
    } finally { view.dispose(); }
  });
});
