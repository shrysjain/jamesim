import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { RobotView } from '../../../view/RobotView';
import { STARTING_POSE } from '../../poses';
import type { SwerveChassis } from '../../../sim/SwerveChassis';
import type { RobotSimulation } from '../../../sim/RobotSimulation';
import { DOWNPOUR as D } from './definition';
let source: THREE.Group;
beforeAll(async () => {
  await MeshoptDecoder.ready; const b = readFileSync(`public${D.model}`);
  source = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')).scene;
});
function fixture() {
  const model = source.clone(true), view = new RobotView(); view['models'].set(D.id, model); view.group.add(model); view.setDefinition(D);
  const nodes = new Map<string, THREE.Object3D>(); model.traverse(n => { if (n.userData.mechanism) nodes.set(n.userData.mechanism, n); });
  const robot = { definition: D, pose: { ...STARTING_POSE }, renderRotation: new THREE.Quaternion(),
    body: { translation: () => ({ x: 0, y: .223, z: 0 }), rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) },
    modules: D.modules.map(m => ({ ...m, angle: 0, speed: 0, suspension: .1122 })) } as unknown as SwerveChassis;
  const mechanisms = { rollerAngle: 0, kickerDeployment: 0,
    shooter: { alliance: 'blue', drumAngle: 0, feederAngle: 0, turretYaw: 0, elevation: D.shooterGeometry.maxElevation },
    climber: { telemetry: { extension: 0 } } } as unknown as RobotSimulation;
  return { view, nodes, robot, mechanisms };
}
describe('Downpour source CAD articulation', () => {
  it('keeps both crash-bar tubes static while the powered roller spins on its own shaft', () => {
    const { view, nodes, robot, mechanisms } = fixture();
    try {
      robot.pose.intake = 1; view.update(robot, 0, mechanisms); view.group.updateMatrixWorld(true);
      const bars = ['intake-crash-bar', 'intake-lower-bar'].map(n => nodes.get(n)!);
      const matrices = bars.map(n => n.matrixWorld.clone());
      const roller = nodes.get('intake-roller-main')!, pivot = roller.getWorldPosition(new THREE.Vector3());
      for (const angle of [0, .5, Math.PI / 2, Math.PI, 4]) {
        mechanisms.rollerAngle = angle; view.update(robot, 0, mechanisms); view.group.updateMatrixWorld(true);
        bars.forEach((n, i) => expect(n.matrixWorld.elements).toEqual(matrices[i].elements));
        expect(roller.getWorldPosition(new THREE.Vector3()).distanceTo(pivot)).toBeLessThan(1e-12);
        const center = new THREE.Box3().setFromObject(roller, true).getCenter(new THREE.Vector3());
        expect(Math.hypot(center.x - pivot.x, center.y - pivot.y)).toBeLessThan(.002);
      }
    } finally { view.dispose(); }
  });
  it('folds only the actual moving intake, slides the horizontal hopper and rotates two separate hood rollers', () => {
    const { view, nodes, robot, mechanisms } = fixture();
    try {
      for (const extension of [0, .4, 1]) {
        robot.pose.intake = extension; robot.pose.hopper = extension; robot.pose.hood = .5;
        view.update(robot, 0, mechanisms); view.group.updateMatrixWorld(true);
        expect(nodes.get('intake')!.rotation.z).toBeCloseTo(D.intake.stowedAngle * (1 - extension));
        expect(nodes.get('hopper')!.position.x).toBeCloseTo(.3 * (1 - extension));
        expect(nodes.get('hood')!.rotation.z).toBeCloseTo(-D.hood.maxAngle * .5);
        expect(nodes.get('hood-roller-1')!.position.distanceTo(nodes.get('hood-roller-2')!.position)).toBeGreaterThan(.04);
      }
    } finally { view.dispose(); }
  });
  it('keeps real wheel and fork roots rigid within the frame and normalizes all four wheel axles', () => {
    const { view, nodes, robot, mechanisms } = fixture();
    const roots = D.modules.flatMap(m => [nodes.get(m.name + '-wheel')!, nodes.get(m.name + '-fork')!]);
    const original = roots.map(n => n.position.clone());
    try {
      for (const support of [0, .04, .1122, .25]) {
        robot.modules.forEach(m => { m.suspension = support; m.angle = .6; m.speed = 2; }); view.update(robot, 1 / 120, mechanisms);
        roots.forEach((n, i) => expect(n.position.distanceTo(original[i])).toBeLessThan(1e-12));
      }
      // Each wheel was separated from its own exported X2 occurrence. Its axle
      // must be Z even where the original instance was turned ninety degrees.
      robot.modules.forEach(m => { m.angle = 0; m.speed = 0; });
      for (const m of D.modules) {
        const wheel = nodes.get(m.name + '-wheel')!; wheel.rotation.set(0, 0, 0); view.group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(wheel, true), size = box.getSize(new THREE.Vector3());
        expect(size.z).toBeLessThan(.061); expect(size.x).toBeGreaterThan(.075); expect(size.y).toBeGreaterThan(.075);
      }
    } finally { view.dispose(); }
  });
});
