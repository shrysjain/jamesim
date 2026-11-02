import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ROBOTS } from '../robot/registry';
import { STARTING_POSE } from '../robot/poses';
import type { SwerveChassis } from '../sim/SwerveChassis';
import { RobotView } from './RobotView';

describe('rigid CAD module mounting', () => {
  for (const definition of Object.values(ROBOTS)) it(`${definition.id}: preserves mounts during steering, spin, terrain lean and loss of contact`, () => {
    const view = new RobotView(), model = new THREE.Group();
    const mounts = new Map<THREE.Object3D, number[]>();
    definition.modules.forEach((m, i) => {
      for (const suffix of ['fork', 'wheel']) {
        const node = new THREE.Group(); node.userData.mechanism = `${m.name}-${suffix}`;
        // Include exporter offsets: even a small correction to the source mount
        // must survive runtime updates without being rebuilt from ideal dimensions.
        node.position.set(m.x + .0001 * i, -.17214, m.z - .0001 * i);
        mounts.set(node, node.position.toArray()); model.add(node);
      }
    });
    // Inject a small prepared-scene fixture without browser loading/font setup.
    view['models'].set(definition.id, model); view.group.add(model); view.setDefinition(definition);
    const renderRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(.12, .4, -.15));
    const robot = {
      definition, pose: STARTING_POSE, renderRotation,
      body: { translation: () => ({ x: 1, y: .4, z: 2 }), rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) },
      modules: definition.modules.map(m => ({ ...m, angle: .6, speed: 2, suspension: .025, grounded: true })),
    } as unknown as SwerveChassis;
    try {
      for (const support of [.025, .12, .3]) {
        robot.modules.forEach(m => { m.suspension = support; m.grounded = support < .3; });
        view.update(robot, 1 / 60);
        for (const [node, position] of mounts) expect(node.position.toArray()).toEqual(position);
        expect(view.group.quaternion.toArray()).toEqual(renderRotation.toArray());
      }
      const fork = model.children[0], wheel = model.children[1];
      expect(fork.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(.6);
      expect(wheel.quaternion.angleTo(fork.quaternion)).toBeGreaterThan(.1);
    } finally { view.dispose(); }
  });
});
