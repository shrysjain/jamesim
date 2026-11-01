import type { Alliance } from '../field/targets';
import * as THREE from 'three';
import { runtimeAsset } from '../runtimeAssets';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { SwerveChassis } from '../sim/SwerveChassis';
import { REBLITZ, ROBOTS, partTransform } from '../robot/RobotDefinition';
import type { RobotDefinition, RobotPart } from '../robot/RobotDefinition';
import type { RobotSimulation } from '../sim/RobotSimulation';
import { rotate, unrotate, sub, v3 } from '../sim/vector';

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
  // A visible support tether for the managed tower constraint; not an invented CAD winch assembly.
  private towerSupport = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xaeb6c0 }));

  constructor() { this.towerSupport.visible = false; this.group.add(this.towerSupport); if (this.contacts) { this.contacts.frustumCulled = false; this.contacts.renderOrder = 22; this.contacts.visible = false; } }

  private badges = new THREE.Group();
  private procedural = new THREE.Group();
  private proceduralId = '';
  setDefinition(definition: RobotDefinition) {
    if (this.activeId !== definition.id) {
      this.activeId = definition.id; this.refreshBumpers = true;
      this.model = this.models.get(definition.id) ?? null;
      this.nodes.clear();
      for (const [id, model] of this.models) model.visible = id === definition.id;
      this.model?.traverse(object => { if (object.userData.mechanism) this.nodes.set(object.userData.mechanism, object); });
      for (const badge of this.badges.children) badge.visible = badge.userData.robot === definition.id;
      this.wheelRotation.fill(0);
    }
    this.badges.visible = !!definition.model;
    this.procedural.visible = !definition.model;
    if (definition.model || this.proceduralId === definition.id) return;
    this.disposeObject(this.procedural); this.procedural.clear(); this.proceduralId = definition.id;
    const box = (parent: THREE.Object3D, name: string, size: [number, number, number], position: [number, number, number], color: number, opacity = 1) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1 }));
      mesh.position.set(...position); mesh.name = name; if (name.startsWith('bumper-')) (mesh.material as THREE.MeshStandardMaterial).name = 'bumper'; mesh.castShadow = opacity === 1; parent.add(mesh); return mesh;
    };
    const highTide = !!definition.cargoSlots, rear = highTide ? -.96 : -.64, width = definition.width;
    box(this.procedural, 'frame', [definition.length - .1, .07, width - .12], [0, -.12, 0], 0x1b3138);
    for (const sign of [-1, 1]) {
      box(this.procedural, `bumper-side-${sign}`, [definition.length, .115, .076], [0, definition.bumperCenterY, sign * (width / 2 - .038)], 0x106b7a);
      box(this.procedural, `bumper-end-${sign}`, [.076, .115, width - .152], [sign * (definition.length / 2 - .038), definition.bumperCenterY, 0], 0x106b7a);
      box(this.procedural, `hopper-side-${sign}`, [.25 - rear, .428, .012], [(rear + .25) / 2, .114, sign * .34], 0x72dfdb, .3);
    }
    box(this.procedural, 'hopper-rear', [.015, .428, .68], [rear, .114, 0], 0x72dfdb, .3);
    const intake = new THREE.Mesh(new THREE.CylinderGeometry(.038, .038, .64, 16), new THREE.MeshStandardMaterial({ color: 0x15191d }));
    intake.rotation.x = Math.PI / 2; intake.position.set(highTide ? -1.04 : -.61, -.10, 0); intake.name = 'pickup-roller'; this.procedural.add(intake);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .045, 32), new THREE.MeshStandardMaterial({ color: 0xd7c783 }));
    rotor.position.set(-.18, -.02, 0); rotor.name = 'rotor'; this.procedural.add(rotor);
    const turret = new THREE.Group(); turret.name = 'turret'; turret.position.set(...(definition.shooterGeometry?.pivot ?? REBLITZ.hood.pivot)); this.procedural.add(turret);
    box(turret, 'turret-body', [.22, .14, .2], [0, .04, 0], 0xb6bec2);
    const hood = new THREE.Group(); hood.name = 'turret-hood'; turret.add(hood);
    box(hood, 'barrel', [.25, .08, .16], [.12, .08, 0], 0xf4d56a);
    for (const [index, module] of definition.modules.entries()) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(definition.wheelRadius, definition.wheelRadius, .045, 16), new THREE.MeshStandardMaterial({ color: 0x191919 }));
      wheel.name = `procedural-wheel-${index}`; wheel.rotation.x = Math.PI / 2; wheel.position.set(module.x, -.19, module.z); this.procedural.add(wheel);
    }
    if (definition.mechanisms.climb) {
      box(this.procedural, 'climber-mast', [.07, .6, .07], [.28, .25, -.27], 0xc7cbd1);
      box(this.procedural, 'climber-hook', [.75, .045, .06], [.6, .55, -.27], 0xf4d56a);
    }
    this.group.add(this.procedural);
  }

  setAlliance(alliance: Alliance) {
    if (alliance === this.alliance && !this.refreshBumpers) return;
    this.alliance = alliance; this.refreshBumpers = false;
    (this.model ?? this.procedural).traverse(object => {
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
      const required = definition.id === REBLITZ.id ? ['chassis', 'intake', 'hopper', 'hood'] : ['chassis', 'intake', 'turret', 'turret-hood', 'passive-kicker'];
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
    const intakeShift = (d.intake.stowTravel ?? 0) * (1 - robot.pose.intake);
    const hopperShift = d.hopper.stowTravel * (1 - robot.pose.hopper);
    if (d.cargoSlots) {
      for (const sign of [-1, 1]) {
        const side = this.procedural.getObjectByName(`hopper-side-${sign}`); if (side) { side.position.x = (-.96 + .25) / 2 + hopperShift / 2; side.scale.x = (1.21 - hopperShift) / 1.21; }
      }
      const rear = this.procedural.getObjectByName('hopper-rear'); if (rear) rear.position.x = -.96 + hopperShift;
      const roller = this.procedural.getObjectByName('pickup-roller'); if (roller) roller.position.x = -1.04 + intakeShift;
    }
    const turret = this.procedural.getObjectByName('turret');
    if (turret && mechanisms) turret.rotation.y = mechanisms.shooter.turretYaw;
    const hood = this.procedural.getObjectByName('turret-hood');
    if (hood && mechanisms) hood.rotation.z = mechanisms.shooter.elevation;
    const rotor = this.procedural.getObjectByName('rotor');
    if (rotor && mechanisms) rotor.rotation.y = mechanisms.shooter.feederAngle + mechanisms.rollerAngle * .1;
    const intake = this.procedural.getObjectByName('pickup-roller');
    if (intake && mechanisms) intake.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), mechanisms.rollerAngle));
    const mast = this.procedural.getObjectByName('climber-mast');
    const hook = this.procedural.getObjectByName('climber-hook');
    if (mast && hook && mechanisms) {
      const attachment = mechanisms.climber.telemetry.attachment;
      if (attachment) {
        const local = unrotate(sub(attachment, p), q);
        hook.position.set((.28 + local.x) / 2, local.y, local.z); hook.scale.x = Math.max(.1, (local.x - .28) / .75);
        mast.position.set(.28, (local.y - .05) / 2, local.z); mast.scale.y = Math.max(.1, (local.y + .05) / .6);
      } else { hook.position.set(.6, .55, -.27); hook.scale.set(1, 1, 1); mast.position.set(.28, .25, -.27); mast.scale.set(1, 1, 1); }
    }
    const attachment = mechanisms?.climber.telemetry.attachment;
    this.towerSupport.visible = !!d.model && !!attachment;
    if (this.towerSupport.visible && attachment) {
      const local = unrotate(sub(attachment, p), q);
      this.towerSupport.geometry.setFromPoints([new THREE.Vector3(.27, .2, 0), new THREE.Vector3(local.x, local.y, local.z)]);
    }
    const points: number[] = [];
    robot.modules.forEach((m, i) => {
      const id = d.modules[i].name;
      const proceduralWheel = this.procedural.getObjectByName(`procedural-wheel-${i}`);
      if (proceduralWheel) { proceduralWheel.position.y = d.mountY - m.suspension; proceduralWheel.rotation.y = -m.angle; }
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
  dispose() { this.disposed = true; this.disposeObject(this.group); this.towerSupport.geometry.dispose(); (this.towerSupport.material as THREE.Material).dispose(); this.contacts?.geometry.dispose(); (this.contacts?.material as THREE.Material | undefined)?.dispose(); }
}
