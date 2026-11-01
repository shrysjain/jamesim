import type { Alliance } from '../field/targets';
import * as THREE from 'three';
import { runtimeAsset } from '../runtimeAssets';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { SwerveChassis } from '../sim/SwerveChassis';
import { REBLITZ, ROBOTS, STARTING_POSE, partTransform } from '../robot/RobotDefinition';
import type { RobotDefinition, RobotPart } from '../robot/RobotDefinition';
import type { RobotSimulation } from '../sim/RobotSimulation';
import { rotate, unrotate, v3 } from '../sim/vector';

/** Prepared team CAD, batched around explicit mechanism frames offline. */
export class RobotView {
  readonly group = new THREE.Group();
  readonly contacts = import.meta.env.DEV ? new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#7cf3c9', depthTest: false })) : null;
  private model: THREE.Group | null = null;
  private nodes = new Map<string, THREE.Object3D>();
  private models = new Map<string, THREE.Group>();
  private activeId = '';
  private alliance: Alliance = 'blue';
  private refreshBumpers = true;
  private wheelRotation = [0, 0, 0, 0];
  private disposed = false;
  private badges = new THREE.Group();
  constructor() {
    if (this.contacts) { this.contacts.frustumCulled = false; this.contacts.renderOrder = 22; this.contacts.visible = false; }
  }
  setDefinition(definition: RobotDefinition) {
    if (this.activeId === definition.id) return;
    this.activeId = definition.id; this.refreshBumpers = true;
    this.model = this.models.get(definition.id) ?? null;
    this.nodes.clear();
    for (const [id, model] of this.models) model.visible = id === definition.id;
    this.model?.traverse(object => { if (object.userData.mechanism) this.nodes.set(object.userData.mechanism, object); });
    for (const badge of this.badges.children) badge.visible = badge.userData.robot === definition.id;
    this.wheelRotation.fill(0);
  }
  preview(definition: RobotDefinition, alliance: Alliance) {
    this.setDefinition(definition); this.setAlliance(alliance); this.group.position.y = .223;
    for (const part of ['intake', 'hopper', 'hood'] as RobotPart[]) {
      const node = this.nodes.get(part); if (!node) continue;
      const { angle, pivot, shift, rise } = partTransform(definition, part, STARTING_POSE);
      node.position.set(pivot[0]+shift, pivot[1]+rise, pivot[2]); node.rotation.z = angle;
    }
    const climber = this.nodes.get('climber'); if (climber) climber.position.y = 0;
  }

  setAlliance(alliance: Alliance) {
    if (alliance === this.alliance && !this.refreshBumpers) return;
    this.alliance = alliance; this.refreshBumpers = false;
    this.model?.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof THREE.MeshStandardMaterial) || material.name !== 'bumper') continue;
        // Prepared 2910 bumper vertices contain blue; disable that tint on bumper material only.
        if (material.vertexColors) { material.vertexColors = false; material.needsUpdate = true; }
        material.color.setHex(alliance === 'red' ? 0xc72f45 : 0x215fc4);
      }
    });
  }

  async load() {
    await Promise.all(Object.values(ROBOTS).filter(d => d.model).map(async definition => {
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(runtimeAsset(definition.model));
      if (this.disposed) { this.disposeObject(gltf.scene); return; }
      const names = new Set<string>();
      gltf.scene.traverse(object => {
        if (object.userData.mechanism) names.add(object.userData.mechanism);
        if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
      });
      const required = definition.id === REBLITZ.id ? ['chassis', 'intake', 'hopper', 'hood'] : ['chassis', 'intake', 'turret', 'turret-hood', 'passive-kicker', 'climber'];
      for (const name of required) if (!names.has(name)) throw new Error(`${definition.name}: missing ${name} assembly.`);
      gltf.scene.visible = false; this.models.set(definition.id, gltf.scene); this.group.add(gltf.scene);
    }));
    await document.fonts.load('italic 800 80px "Barlow Condensed"');
    if (this.disposed) return;
    this.group.add(this.badges);
    for (const definition of Object.values(ROBOTS).filter(d => d.model)) {
      const number = definition.id.split('-')[0];
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 144;
      const ctx = canvas.getContext('2d')!;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 800 114px "Barlow Condensed", sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = '#103b7a'; ctx.strokeText(number, 256, 78);
      ctx.fillStyle = '#ffffff'; ctx.fillText(number, 256, 78);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
      const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.15, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
      const geometry = new THREE.PlaneGeometry(0.295, 0.083);
      for (const sign of [-1, 1]) {
        const end = new THREE.Mesh(geometry, material); end.position.set(sign * (definition.length / 2 + 0.0015), definition.bumperCenterY, 0); end.rotation.y = sign * Math.PI / 2; end.userData.robot = definition.id; this.badges.add(end);
        const side = new THREE.Mesh(geometry, material); side.position.set(0, definition.bumperCenterY, sign * (definition.width / 2 + 0.0015)); side.rotation.y = sign > 0 ? 0 : Math.PI; side.userData.robot = definition.id; this.badges.add(side);
      }
    }
    this.setDefinition(REBLITZ);
  }

  update(robot: SwerveChassis, dt: number, mechanisms: RobotSimulation | null = null) {
    if (mechanisms) this.setAlliance(mechanisms.shooter.alliance);
    const p = robot.body.translation(), q = robot.renderRotation, physicalRotation = robot.body.rotation(), d = robot.definition;
    this.group.position.set(p.x, p.y, p.z); this.group.quaternion.set(q.x, q.y, q.z, q.w);
    for (const part of ['intake', 'hopper', 'hood'] as RobotPart[]) {
      const node = this.nodes.get(part); if (!node) continue;
      const { angle, pivot, shift, rise } = partTransform(d, part, robot.pose);
      node.position.set(pivot[0] + shift, pivot[1] + rise, pivot[2]); node.rotation.z = angle;
    }
    if (mechanisms) for (const [name, node] of this.nodes) {
      const axis: 'x' | 'y' | 'z' = node.userData.spinAxis ?? 'z';
      if (name.startsWith('intake-roller-')) node.rotation[axis] = mechanisms.rollerAngle;
      else if (name.startsWith('feeder-roller-')) node.rotation[axis] = mechanisms.rollerAngle * 0.7 + mechanisms.shooter.feederAngle;
      else if (name === 'shooter-drum' || name.startsWith('hood-roller-')) node.rotation.z = -mechanisms.shooter.drumAngle;
      else if (name === 'shooter-flywheel') node.rotation.z = -mechanisms.shooter.drumAngle * 6.7;
    }
    if (mechanisms) {
      const turret = this.nodes.get('turret'); if (turret) turret.rotation.y = mechanisms.shooter.turretYaw;
      const hood = this.nodes.get('turret-hood'); if (hood) hood.rotation.z = mechanisms.shooter.elevation - (d.shooterGeometry?.maxElevation ?? 0);
      const kicker = this.nodes.get('passive-kicker'); if (kicker) kicker.rotation.z = mechanisms.kickerDeployment * 163 * Math.PI / 180;
    }
    const climber = this.nodes.get('climber');
    if (climber) climber.position.y = (mechanisms?.climber.telemetry.extension ?? 0) * (d.climb?.travel ?? 0);
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
