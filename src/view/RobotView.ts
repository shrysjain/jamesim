import * as THREE from 'three';
import { runtimeAsset } from '../runtimeAssets';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { SwerveChassis } from '../sim/SwerveChassis';
import { REBLITZ, partTransform } from '../robot/RobotDefinition';
import type { RobotPart } from '../robot/RobotDefinition';
import type { RobotSimulation } from '../sim/RobotSimulation';
import { rotate, unrotate, v3 } from '../sim/vector';

/** Prepared team CAD, batched around explicit mechanism frames offline. */
export class RobotView {
  readonly group = new THREE.Group();
  readonly contacts = import.meta.env.DEV ? new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#7cf3c9', depthTest: false })) : null;
  private model: THREE.Group | null = null;
  private nodes = new Map<string, THREE.Object3D>();
  private wheelRotation = [0, 0, 0, 0];
  private disposed = false;

  constructor() { if (this.contacts) { this.contacts.frustumCulled = false; this.contacts.renderOrder = 22; this.contacts.visible = false; } }

  async load() {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(runtimeAsset(REBLITZ.model));
    if (this.disposed) { this.disposeObject(gltf.scene); return; }
    this.model = gltf.scene;
    this.model.traverse(object => {
      if (object.userData.mechanism) this.nodes.set(object.userData.mechanism, object);
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    for (const name of ['chassis', 'intake', 'hopper', 'hood']) if (!this.nodes.has(name)) throw new Error(`Robot model missing ${name} assembly.`);
    this.group.add(this.model);
    await document.fonts.load('italic 800 80px "Barlow Condensed"');
    if (this.disposed) return;
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 144;
    const ctx = canvas.getContext('2d')!;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 800 114px "Barlow Condensed", sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = '#103b7a'; ctx.strokeText('2910', 256, 78);
    ctx.fillStyle = '#ffffff'; ctx.fillText('2910', 256, 78);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.15, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const geometry = new THREE.PlaneGeometry(0.295, 0.083);
    for (const sign of [-1, 1]) {
      const end = new THREE.Mesh(geometry, material); end.position.set(sign * (REBLITZ.length / 2 + 0.0015), REBLITZ.bumperCenterY, 0); end.rotation.y = sign * Math.PI / 2; this.group.add(end);
      const side = new THREE.Mesh(geometry, material); side.position.set(0, REBLITZ.bumperCenterY, sign * (REBLITZ.width / 2 + 0.0015)); side.rotation.y = sign > 0 ? 0 : Math.PI; this.group.add(side);
    }
  }

  update(robot: SwerveChassis, dt: number, mechanisms: RobotSimulation | null = null) {
    const p = robot.body.translation(), q = robot.renderRotation, physicalRotation = robot.body.rotation(), d = robot.definition;
    this.group.position.set(p.x, p.y, p.z); this.group.quaternion.set(q.x, q.y, q.z, q.w);
    for (const part of ['intake', 'hopper', 'hood'] as RobotPart[]) {
      const node = this.nodes.get(part); if (!node) continue;
      const { angle, pivot, shift } = partTransform(d, part, robot.pose);
      node.position.set(pivot[0] + shift, pivot[1], pivot[2]); node.rotation.z = angle;
    }
    if (mechanisms) for (const [name, node] of this.nodes) {
      if (name.startsWith('intake-roller-')) node.rotation.z = mechanisms.rollerAngle;
      else if (name.startsWith('feeder-roller-')) node.rotation.z = mechanisms.rollerAngle * 0.7 + mechanisms.shooter.feederAngle;
      else if (name === 'shooter-drum' || name.startsWith('hood-roller-')) node.rotation.z = -mechanisms.shooter.drumAngle;
      else if (name === 'shooter-flywheel') node.rotation.z = -mechanisms.shooter.drumAngle * 6.7;
    }
    const points: number[] = [];
    robot.modules.forEach((m, i) => {
      const id = d.modules[i].name;
      this.wheelRotation[i] -= m.speed * dt / d.wheelRadius;
      for (const suffix of ['wheel', 'fork']) {
        const node = this.nodes.get(`${id}-${suffix}`); if (!node) continue;
        const local = unrotate(rotate(v3(m.x, d.mountY - m.suspension, m.z), physicalRotation), q);
        node.position.set(local.x, local.y, local.z);
        const steer = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -m.angle);
        if (suffix === 'wheel') steer.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.wheelRotation[i]));
        node.quaternion.copy(steer);
      }
      if (this.contacts?.visible && m.grounded) {
        const mount = new THREE.Vector3(m.x, d.mountY, m.z).applyQuaternion(new THREE.Quaternion(physicalRotation.x, physicalRotation.y, physicalRotation.z, physicalRotation.w)).add(this.group.position);
        points.push(mount.x, mount.y, mount.z, m.point.x, m.point.y, m.point.z,
          m.point.x, m.point.y, m.point.z, m.point.x + m.force.x * 0.001, m.point.y + m.force.y * 0.001, m.point.z + m.force.z * 0.001);
      }
    });
    if (this.contacts?.visible) this.contacts.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  }
  private disposeObject(object: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    object.traverse(o => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } });
    geometries.forEach(g => g.dispose()); materials.forEach(m => { if ('map' in m) (m.map as THREE.Texture | null)?.dispose(); m.dispose(); });
  }
  dispose() { this.disposed = true; this.disposeObject(this.group); this.contacts?.geometry.dispose(); (this.contacts?.material as THREE.Material | undefined)?.dispose(); }
}
