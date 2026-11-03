import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { RobotView } from '../../../view/RobotView';
import { STARTING_POSE } from '../../poses';
import type { SwerveChassis } from '../../../sim/SwerveChassis';
import type { RobotSimulation } from '../../../sim/RobotSimulation';
import { SIMBOT_TIM as D } from './definition';

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
