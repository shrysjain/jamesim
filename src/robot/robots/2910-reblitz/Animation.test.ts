import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { RobotView } from '../../../view/RobotView';
import { REBLITZ as D } from './definition';
import type { SwerveChassis } from '../../../sim/SwerveChassis';
import type { RobotSimulation } from '../../../sim/RobotSimulation';

let source: THREE.Group;
beforeAll(async () => {
  await MeshoptDecoder.ready; const b = readFileSync(`public${D.model}`);
  source = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')).scene;
});
// Original zero-angle centers measured from the retained prepared CAD.
const rollers = [
  [1, -.2557956874370575, -.021269409143924722],
  [2, -.13238707184791565, -.05433664672970773],
  [3, -.07068276405334473, -.07087026738524438],
  [4, -.19409137964248657, -.037803027936816225],
  [5, .2782089412212372, .13960521093606948],
  [6, -.008978456258773804, -.08740388431549073],
  [7, .2889789044857005, .04458259216547261],
];

it.each(rollers)('feeder roller %i spins on its shaft instead of orbiting', (id, x, y) => {
  const model = source.clone(true), view = new RobotView();
  view['models'].set(D.id, model); view.group.add(model); view.setDefinition(D);
  const robot = { definition: D, pose: { intake: 1, hopper: 1, hood: 0 }, renderRotation: new THREE.Quaternion(),
    body: { translation: () => ({ x: 0, y: .223, z: 0 }), rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) },
    modules: D.modules.map(m => ({ ...m, angle: 0, speed: 0, suspension: D.springLength })) } as unknown as SwerveChassis;
  const mechanism = { rollerAngle: 0, indexerAngle: 0, kickerDeployment: 0,
    shooter: { alliance: 'blue', feederAngle: 0, drumAngle: 0, turretYaw: 0, elevation: D.shooterGeometry.maxElevation },
    climber: { telemetry: { extension: 0 } } } as unknown as RobotSimulation;
  const node = view['nodes'].get(`feeder-roller-${id}`)!;
  try {
    expect(node).toBeDefined();
    for (let step = 0; step < 48; step++) {
      mechanism.shooter.feederAngle = step * Math.PI / 12;
      view.update(robot, 1 / 120, mechanism); view.group.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(node, true), center = bounds.getCenter(new THREE.Vector3());
      expect(Math.hypot(center.x - x, center.y - (.223 + y))).toBeLessThan(.0002);
      expect(bounds.getSize(new THREE.Vector3()).z).toBeCloseTo(.6223, 4);
    }
    // Preview after play must retain the same centered assembly as well.
    view.preview(D, 'red'); view.group.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(node, true).getCenter(new THREE.Vector3());
    expect(Math.hypot(center.x - x, center.y - (.223 + y))).toBeLessThan(.0002);
  } finally { view.dispose(); }
});
