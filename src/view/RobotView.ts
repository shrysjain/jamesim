import type { Alliance } from '../field/targets';
import * as THREE from 'three';
import { runtimeAsset } from '../runtimeAssets';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { SwerveChassis } from '../sim/SwerveChassis';
import { REBLITZ, ROBOTS, STARTING_POSE, partTransform } from '../robot/RobotDefinition';
import type { RobotDefinition, RobotPart, SpinSource } from '../robot/RobotDefinition';
import type { RobotSimulation } from '../sim/RobotSimulation';

/** Prepared team CAD, batched around explicit mechanism frames offline. */
export class RobotView {
  readonly group = new THREE.Group();
  readonly contacts = import.meta.env.DEV ? new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#7cf3c9', depthTest: false })) : null;
  private model: THREE.Group | null = null;
  private nodes = new Map<string, THREE.Object3D>();
  private models = new Map<string, THREE.Group>();
  private poseNodes: { part: RobotPart; node: THREE.Object3D }[] = [];
  private spinNodes: { node: THREE.Object3D; axis: 'x' | 'y' | 'z'; source: SpinSource; factor: number }[] = [];
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
    this.poseNodes = Object.entries(definition.visual.poseNodes).flatMap(([part, name]) => {
      const node = this.nodes.get(name); return node ? [{ part: part as RobotPart, node }] : [];
    });
    this.spinNodes = [];
    for (const [name, node] of this.nodes) {
      const binding = definition.visual.spin.find(b => b.node === name || !!b.prefix && name.startsWith(b.prefix));
      if (binding) this.spinNodes.push({ node, axis: binding.axis ?? node.userData.spinAxis ?? 'z', source: binding.source, factor: binding.factor });
    }
    this.wheelRotation.fill(0);
  }
  preview(definition: RobotDefinition, alliance: Alliance) {
    this.setDefinition(definition); this.setAlliance(alliance); this.group.position.y = definition.visual.previewHeight;
    for (const { part, node } of this.poseNodes) {
      const { angle, pivot, shift, rise } = partTransform(definition, part, STARTING_POSE);
      node.position.set(pivot[0]+shift, pivot[1]+rise, pivot[2]); node.rotation.z = angle;
    }
    const climber = this.nodes.get(definition.visual.climber ?? ''); if (climber) climber.position.y = 0;
    const kicker = this.nodes.get(definition.visual.kicker?.node ?? ''); if (kicker) kicker.rotation.z = 0;
  }

  setAlliance(alliance: Alliance) {
    if (alliance === this.alliance && !this.refreshBumpers) return;
    this.alliance = alliance; this.refreshBumpers = false;
    this.model?.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        const names = this.model?.userData.bumperMaterial;
        if (!(material instanceof THREE.MeshStandardMaterial) || !(Array.isArray(names) ? names.includes(material.name) : material.name === names)) continue;
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
      for (const name of definition.visual.requiredNodes) if (!names.has(name)) throw new Error(`${definition.name}: missing ${name} assembly.`);
      const bumperNames = definition.visual.bumperMaterial;
      if (Array.isArray(bumperNames)) {
        let fabric: THREE.Material | undefined;
        gltf.scene.traverse(object => {
          if (object instanceof THREE.Mesh) fabric ??= (Array.isArray(object.material) ? object.material : [object.material]).find(m => m.name === bumperNames[0]);
        });
        // Baked lettering uses the exact fabric material, including its finish,
        // so it cannot show through as a differently lit second number.
        if (fabric) gltf.scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const replace = (m: THREE.Material) => bumperNames.includes(m.name) ? fabric! : m;
          object.material = Array.isArray(object.material) ? object.material.map(replace) : replace(object.material);
        });
      }
      gltf.scene.userData.bumperMaterial = definition.visual.bumperMaterial;
      gltf.scene.visible = false; this.models.set(definition.id, gltf.scene); this.group.add(gltf.scene);
    }));
    await document.fonts.load('italic 800 80px "Barlow Condensed"');
    if (this.disposed) return;
    this.group.add(this.badges);
    for (const definition of Object.values(ROBOTS).filter(d => d.model)) {
      const number = definition.teamNumber;
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 144;
      const ctx = canvas.getContext('2d')!;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 800 114px "Barlow Condensed", sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = '#103b7a'; ctx.strokeText(number, 256, 78);
      ctx.fillStyle = '#ffffff'; ctx.fillText(number, 256, 78);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
      const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.15, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
      const geometry = new THREE.PlaneGeometry(...definition.visual.numberSize);
      for (const sign of [-1, 1]) {
        const end = new THREE.Mesh(geometry, material); end.position.set(sign * (definition.length / 2 + definition.visual.numberOffset), definition.bumperCenterY, 0); end.rotation.y = sign * Math.PI / 2; end.userData.robot = definition.id; this.badges.add(end);
        const side = new THREE.Mesh(geometry, material); side.position.set(0, definition.bumperCenterY, sign * (definition.width / 2 + definition.visual.numberOffset)); side.rotation.y = sign > 0 ? 0 : Math.PI; side.userData.robot = definition.id; this.badges.add(side);
      }
    }
    this.setDefinition(REBLITZ);
  }

  update(robot: SwerveChassis, dt: number, mechanisms: RobotSimulation | null = null) {
    if (mechanisms) this.setAlliance(mechanisms.shooter.alliance);
    const p = robot.body.translation(), q = robot.renderRotation, physicalRotation = robot.body.rotation(), d = robot.definition;
    this.group.position.set(p.x, p.y, p.z); this.group.quaternion.set(q.x, q.y, q.z, q.w);
    for (const { part, node } of this.poseNodes) {
      const { angle, pivot, shift, rise } = partTransform(d, part, robot.pose);
      node.position.set(pivot[0] + shift, pivot[1] + rise, pivot[2]); node.rotation.z = angle;
    }
    if (mechanisms) {
      for (const { node, axis, source, factor } of this.spinNodes) {
        const angle = source === 'indexer' ? mechanisms.indexerAngle : source === 'intake' ? mechanisms.rollerAngle : source === 'feeder' ? mechanisms.rollerAngle * .7 + mechanisms.shooter.feederAngle : mechanisms.shooter.drumAngle;
        node.rotation[axis] = angle * factor;
      }
      const visual = d.visual;
      const turret = this.nodes.get(visual.turret ?? ''); if (turret) turret.rotation.y = mechanisms.shooter.turretYaw;
      const hood = this.nodes.get(visual.turretHood ?? ''); if (hood) hood.rotation.z = mechanisms.shooter.elevation - (d.shooterGeometry?.maxElevation ?? 0);
      const kicker = visual.kicker && this.nodes.get(visual.kicker.node); if (kicker && visual.kicker) kicker.rotation.z = mechanisms.kickerDeployment * visual.kicker.radians;
    }
    const climber = this.nodes.get(d.visual.climber ?? '');
    if (climber) climber.position.y = (mechanisms?.climber.telemetry.extension ?? 0) * (d.climb?.travel ?? 0);
    const points: number[] = [];
    robot.modules.forEach((m, i) => {
      const id = d.modules[i].name;
      this.wheelRotation[i] -= m.speed * dt / d.wheelRadius;
      for (const suffix of ['wheel', 'fork']) {
        const node = this.nodes.get(`${id}-${suffix}`); if (!node) continue;
        // The prepared CAD fixes each axle/fork to the frame. Terrain lean moves
        // the whole robot; contact-query distances never articulate a module.
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
