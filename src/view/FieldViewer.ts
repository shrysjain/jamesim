import type { HumanPlayer } from '../sim/HumanPlayer';
import { DEFAULT_CONTROLS, readActions } from '../controls';
import type { Controls } from '../controls';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Ray, QueryFilterFlags } from '@dimforge/rapier3d-compat';
import { FieldSimulation, FUEL_RADIUS } from '../sim/FieldSimulation';
import type { CollisionAsset, FieldElement, FieldManifest, Vec3 } from '../field/types';
import { NEUTRAL_INPUT } from '../sim/SwerveChassis';
import type { DriveTelemetry, DriveSpawn } from '../sim/SwerveChassis';
import { RobotView } from './RobotView';
import { FOLLOW_FRAME, stabilizeFollowCamera } from './followCamera';
import { playerCameraFrame } from './playerCamera';
import type { PlayerCamera } from './playerCamera';
import { toRobotInput } from '../sim/driveInput';
import type { DriveFrame } from '../sim/driveInput';
import type { RobotPose } from '../robot/RobotDefinition';
import type { MechanismTelemetry } from '../sim/RobotSimulation';
import type { HubTelemetry } from '../sim/HubSystem';
import { HUBS, mouthVertices } from '../field/hubs';
import { HubLights } from './HubLights';
import type { MatchConfig, MatchTelemetry } from '../sim/MatchRules';
import { MatchAudio } from './MatchAudio';
import { DEFAULT_MATCH } from '../sim/MatchRules';
import { GRAPHICS } from '../settings';
import type { Settings } from '../settings';
import { runtimeAsset } from '../runtimeAssets';
import { unpackCollisions } from '../field/collisionAsset';
import { removeTowerBacking } from './towerBacking';

export type CameraMode = PlayerCamera | 'orbit';
export type CameraPreset = 'overview' | 'overhead' | 'blue' | 'red';
export type ViewerStats = { fps: number; drawCalls: number; triangles: number; colliders: number; awake: number; physicsMs: number; running: boolean; humanPlayer: HumanPlayer['telemetry'] | null; robot: DriveTelemetry | null; mechanisms: MechanismTelemetry | null; hubs: HubTelemetry | null; match: MatchTelemetry | null };
export type ViewerOptions = { colliders: boolean; visuals: boolean; fuel: boolean; grid: boolean; labels: boolean };
type Callbacks = {
  progress: (message: string) => void;
  ready: (manifest: FieldManifest) => void;
  selection: (element: FieldElement | null) => void;
  stats: (stats: ViewerStats) => void;
  focusLost: () => void;
  pauseRequested: () => void;
  restartRequested: () => void;
  error: (message: string) => void;
  camera: (preset: CameraPreset | null, mode: CameraMode) => void;
};

export class FieldViewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(48, 1, 0.04, 180);
  readonly controls!: OrbitControls;
  manifest!: FieldManifest;
  sim!: FieldSimulation;
  mode: CameraMode = 'follow';
  private playerCamera: PlayerCamera = 'follow';
  driveEnabled = true;
  driveFrame: DriveFrame = 'field';
  inspectEnabled = false;
  options: ViewerOptions = { colliders: false, visuals: true, fuel: true, grid: false, labels: false };
  selected: FieldElement | null = null;
  private model = new THREE.Group();
  private fuelMesh!: THREE.InstancedMesh;
  private probeMesh!: THREE.Mesh;
  private sun = new THREE.DirectionalLight(0xfff6e6, 3);
  private robotView = new RobotView();
  private hubLights = new HubLights();
  private matchAudio = new MatchAudio();
  private followPosition = new THREE.Vector3();
  private followTarget = new THREE.Vector3();
  private fieldMeshes = new Map<string, THREE.Mesh[]>();
  private cameraOccluders = new Map<THREE.Mesh, { original: THREE.Material | THREE.Material[]; faded: THREE.Material[]; opacity: number }>();
  private labels!: THREE.Group;
  private grid!: THREE.GridHelper;
  private debug!: THREE.LineSegments;
  private staticDebug!: THREE.LineSegments;
  private staticDebugReady = false;
  private highlight!: THREE.Box3Helper;
  private lastFrameTime = 0;
  private resizeObserver: ResizeObserver;
  private disposed = false;
  private raf = 0;
  private playerControls: Controls = DEFAULT_CONTROLS;
  private gamepadArmed = false;
  private gamepadIdentity = '';
  private restartHeld = false;
  private pauseHeld = false;
  private sessionPractice = false;
  private sessionConfig = { ...DEFAULT_MATCH };
  private keys = new Set<string>();
  private flyDragging = false;
  private pointerStart!: THREE.Vector2;
  private raycaster!: THREE.Raycaster;
  private dummy = new THREE.Object3D();
  private debugElapsed = 0;
  private statElapsed = 0;
  private statFrames = 0;
  private animation: { from: THREE.Vector3; targetFrom: THREE.Vector3; to: THREE.Vector3; target: THREE.Vector3; t: number } | null = null;

  constructor(private container: HTMLElement, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', 'Jamesim driving view. WASD move, J and L turn, Shift intake, Q reverse intake, Space auto-align and shoot or pass when stopped, R restart match.');
    container.append(this.renderer.domElement);
    this.scene.background = new THREE.Color('#272e38');
    this.scene.fog = new THREE.Fog('#272e38', 38, 85);
    this.scene.add(new THREE.HemisphereLight(0xe6f0ff, 0x758195, 2.4));
    const sun = this.sun;
    sun.position.set(-7, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 12, bottom: -12, near: 0.5, far: 40 });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ color: '#313945', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.065;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scene.add(this.robotView.group);
    if (import.meta.env.DEV) {
      this.pointerStart = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enabled = false;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.09;
      this.controls.minDistance = 0.25;
      this.controls.maxDistance = 45;
      this.controls.maxPolarAngle = Math.PI * 0.495;
      this.controls.target.set(0, 0.4, 0);
      this.controls.addEventListener('start', this.onControlStart);
      this.camera.position.set(14, 14, 15);
      this.controls.update();
      this.labels = new THREE.Group();
      this.debug = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.8 }));
      this.staticDebug = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.7 }));
      this.highlight = new THREE.Box3Helper(new THREE.Box3(), 0xf4bc42);
      this.grid = new THREE.GridHelper(24, 48, 0x99c0dc, 0x8195a8);
      this.grid.position.y = 0.008;
      this.grid.material.transparent = true;
      this.grid.material.opacity = 0.25;
      this.grid.visible = false;
      this.scene.add(this.grid, this.debug, this.staticDebug, this.highlight, this.labels, this.robotView.contacts!);
      this.debug.visible = false;
      this.debug.renderOrder = 20;
      this.debug.frustumCulled = false;
      this.staticDebug.visible = false;
      this.staticDebug.renderOrder = 19;
      this.staticDebug.frustumCulled = false;
      this.highlight.visible = false;
      this.highlight.renderOrder = 21;
      (this.highlight.material as THREE.LineBasicMaterial).depthTest = false;
      this.labels.visible = false;
      this.probeMesh = new THREE.Mesh(new THREE.SphereGeometry(FUEL_RADIUS, 20, 12), new THREE.MeshStandardMaterial({ color: '#ff7139', emissive: '#431200', roughness: 0.5 }));
      this.probeMesh.visible = false;
      this.probeMesh.castShadow = true;
      this.scene.add(this.probeMesh);
    }
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('pointerdown', this.matchAudio.unlock);
    window.addEventListener('keydown', this.matchAudio.unlock);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  async load() {
    this.callbacks.progress('Loading the official field assembly…');
    const response = await fetch(runtimeAsset('/assets/field-manifest.json'));
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('The prepared field asset is missing. Check the local setup instructions, then try again.');
    }
    this.manifest = await response.json() as FieldManifest;
    const [gltf, collisionResponse] = await Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(runtimeAsset(this.manifest.model)).catch((cause: Error) => { throw new Error(`Field model: ${cause.message}`, { cause }); }), fetch(runtimeAsset(this.manifest.collisions)), this.robotView.load(), this.matchAudio.prepare(), document.fonts.ready,
    ]);
    if (!collisionResponse.ok) throw new Error('Collision geometry could not be loaded.');
    const asset: CollisionAsset = runtimeAsset(this.manifest.collisions).endsWith('.bin')
      ? unpackCollisions(await collisionResponse.arrayBuffer()) : await collisionResponse.json();
    if (this.disposed) return;
    this.callbacks.progress('Preparing collisions and 504 fuel balls…');
    this.sim = await FieldSimulation.create(asset, this.manifest.fuel, true).catch((cause: Error) => { throw new Error(`Physics initialization: ${cause.message}`, { cause }); });
    if (this.disposed) { this.sim.dispose(); return; }
    this.model = gltf.scene;
    this.model.updateMatrixWorld(true);
    this.model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        removeTowerBacking(object);
        object.castShadow = !object.userData.transparent;
        object.receiveShadow = true;
        if (object.userData.kind === 'carpet') {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 128;
          const ctx = canvas.getContext('2d')!;
          const data = ctx.createImageData(128, 128);
          // Repeatable woven carpet grain; no image or network dependency.
          let seed = 12;
          for (let i = 0; i < data.data.length; i += 4) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const v = 200 + (seed % 8);
            data.data.set([v, v + 3, v + 8, 255], i);
          }
          ctx.putImageData(data, 0, 0);
          const texture = new THREE.CanvasTexture(canvas);
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(24, 12);
          texture.colorSpace = THREE.SRGBColorSpace;
          object.material = new THREE.MeshStandardMaterial({ map: texture, color: '#4d535c', roughness: 1 });
          if (!object.geometry.attributes.uv) {
            const pos = object.geometry.attributes.position;
            const uv = new Float32Array(pos.count * 2);
            for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 18; uv[i * 2 + 1] = pos.getZ(i) / 9; }
            object.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          }
        }
        if (object.userData.net) {
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, 64, 64); ctx.fillStyle = '#343b43'; ctx.fillRect(0, 0, 2, 64); ctx.fillRect(0, 0, 64, 2);
          const texture = new THREE.CanvasTexture(canvas);
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          const positions = object.geometry.attributes.position, uv = new Float32Array(positions.count * 2);
          const point = new THREE.Vector3();
          for (let i = 0; i < positions.count; i++) {
            point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
            uv[i * 2] = (point.x + point.z) * 20; uv[i * 2 + 1] = point.y * 20;
          }
          object.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          object.material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 1 });
        }
        const id = object.userData.elementId as string;
        const meshes = this.fieldMeshes.get(id) ?? [];
        meshes.push(object); this.fieldMeshes.set(id, meshes);
      }
    });
    this.model.add(this.hubLights.group); this.scene.add(this.model);
    this.fuelMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(FUEL_RADIUS, 16, 10),
      new THREE.MeshStandardMaterial({ color: '#f6d52b', roughness: 0.94 }), this.sim.fuel.length);
    this.fuelMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.fuelMesh.castShadow = true;
    this.fuelMesh.receiveShadow = true;
    this.scene.add(this.fuelMesh);
    this.syncFuel();
    if (import.meta.env.DEV) this.makeLabels();
    this.updateOptions(this.options);
    this.resize();
    this.setMode(this.playerCamera);
    this.callbacks.progress('Field ready');
    this.sim.setRunning(false);
    if (document.hidden || !document.hasFocus()) this.setRunning(false);
    this.callbacks.ready(this.manifest);
    this.callbacks.stats(this.snapshot());
    this.lastFrameTime = performance.now();
    this.frame();
  }

  private resize = () => {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  presentationActive = true;
  private frame = () => {
    if (this.disposed) return;
    if (!this.presentationActive) { this.lastFrameTime = performance.now(); this.raf = requestAnimationFrame(this.frame); return; }
    const now = performance.now();
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;
    this.readDriveInput();
    const driverWasEnabled = this.sim.match.driverEnabled;
    this.sim.update(delta);
    if (driverWasEnabled !== this.sim.match.driverEnabled) this.clearInput();
    if (this.sim.running) this.syncFuel();
    if (this.sim.robot) this.robotView.update(this.sim.robot, this.sim.running ? delta : 0, this.sim.robotController);
    this.moveCamera(delta);
    if (import.meta.env.DEV && this.mode === 'orbit') this.controls.update();
    if (import.meta.env.DEV && this.labels.visible) {
      const metersPerPixel = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / this.container.clientHeight;
      for (const label of this.labels.children) {
        const width = Math.min(1.55, 160 * metersPerPixel * this.camera.position.distanceTo(label.position));
        label.scale.set(width, width * 80 / 384, 1);
      }
    }
    if (import.meta.env.DEV && this.options.colliders && this.sim.running) {
      this.debugElapsed += delta;
      if (this.debugElapsed > 0.1) { this.updateDebug(); this.debugElapsed = 0; }
    }
    this.hubLights.update(this.sim.match.telemetry);
    this.matchAudio.update(this.sim.match.telemetry, this.sim.running);
    this.renderer.render(this.scene, this.camera);
    this.statElapsed += delta;
    this.statFrames++;
    if (this.statElapsed >= 0.1) {
      this.callbacks.stats(this.snapshot(Math.round(this.statFrames / this.statElapsed)));
      this.statElapsed = 0;
      this.statFrames = 0;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private syncFuel() {
    this.sim.fuelSystem.records.forEach((fuel, i) => {
      const p = this.sim.robotController?.renderPosition(fuel) ?? this.sim.fuelSystem.renderPosition(fuel);
      const q = fuel.owner === this.sim.robotController?.owner ? this.sim.robot!.renderRotation : fuel.body.rotation();
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.quaternion.set(q.x, q.y, q.z, q.w);
      this.dummy.updateMatrix();
      this.fuelMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.fuelMesh.instanceMatrix.needsUpdate = true;
    this.fuelMesh.computeBoundingSphere();
    if (import.meta.env.DEV) {
      this.probeMesh.visible = this.sim.probeVisible;
      const p = this.sim.probe.translation();
      this.probeMesh.position.set(p.x, p.y, p.z);
    }
  }

  updateOptions(options: ViewerOptions) {
    if (!import.meta.env.DEV) return;
    this.options = options;
    this.model.visible = options.visuals;
    if (this.fuelMesh) this.fuelMesh.visible = options.fuel;
    this.debug.visible = options.colliders;
    this.staticDebug.visible = options.colliders;
    this.grid.visible = options.grid;
    this.labels.visible = options.labels;
    if (this.robotView.contacts) this.robotView.contacts.visible = options.colliders;
    if (options.colliders && this.sim) this.updateDebug();
  }

  private updateDebug() {
    if (!import.meta.env.DEV) return;
    if (!this.staticDebugReady) {
      const fixed = this.sim.world.debugRender(QueryFilterFlags.EXCLUDE_DYNAMIC);
      const positions = Array.from(fixed.vertices), colors = Array.from(fixed.colors);
      if (this.sim.hubs.enabled) for (const hub of HUBS) {
        const color = hub.alliance === 'blue' ? [0.3, 0.7, 1, 1] : [1, 0.35, 0.35, 1];
        const line = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => { positions.push(a.x, a.y, a.z, b.x, b.y, b.z); colors.push(...color, ...color); };
        const vertices = mouthVertices(hub, FUEL_RADIUS);
        vertices.forEach((p, i) => line(p, vertices[(i + 1) % 6]));
        for (const outlet of hub.outlets) line(outlet.inside, outlet.position);
      }
      this.staticDebug.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      this.staticDebug.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
      this.staticDebug.geometry.computeBoundingSphere();
      this.staticDebugReady = true;
    }
    const { vertices, colors } = this.sim.world.debugRender(QueryFilterFlags.EXCLUDE_FIXED);
    this.debug.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    this.debug.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    this.debug.geometry.computeBoundingSphere();
  }

  setMode(mode: CameraMode) {
    if (!import.meta.env.DEV && mode === 'orbit') return;
    this.clearInput();
    this.mode = mode;
    if (mode !== 'follow') this.restoreCameraOccluders();
    this.animation = null;
    this.keys.clear();
    this.flyDragging = false;
    if (import.meta.env.DEV) this.controls.enabled = mode === 'orbit';
    this.renderer.domElement.style.cursor = mode === 'fly' ? 'crosshair' : 'grab';
    if (import.meta.env.DEV && mode === 'orbit') {
      const forward = this.camera.getWorldDirection(new THREE.Vector3());
      this.controls.target.copy(this.camera.position).addScaledVector(forward, 4);
      this.controls.update();
    }
    if (mode === 'follow' && this.sim?.robot) { this.select(null); this.followCamera(0, true); }
    if ((mode === 'station' || mode === 'pov') && this.sim?.robot) this.moveCamera(0);
    if (mode === 'fly' && this.sim?.robot && this.camera.position.lengthSq() < .01) {
      this.followCamera(0, true); this.restoreCameraOccluders();
    }
    this.callbacks.camera(null, mode);
  }

  setPreset(preset: CameraPreset, animate = true) {
    if (!import.meta.env.DEV) return;
    if (this.mode !== 'orbit') this.setMode('orbit');
    let position: Vec3, target: Vec3;
    const distance = Math.max(1, 1.4 / this.camera.aspect);
    if (preset === 'overhead') { position = [0, 24 * distance, 0.01]; target = [0, 0, 0]; }
    else if (preset === 'blue') { position = [8.1, 1.85, 2.1]; target = [0, 0.7, 0]; }
    else if (preset === 'red') { position = [-8.1, 1.85, -2.1]; target = [0, 0.7, 0]; }
    else { position = [12.5 * distance, 13 * distance, 14.5 * distance]; target = [0, 0.35, 0]; }
    this.goTo(new THREE.Vector3(...position), new THREE.Vector3(...target), animate);
    this.callbacks.camera(preset, this.mode);
  }

  select(element: FieldElement | null) {
    if (!import.meta.env.DEV) return;
    this.selected = element;
    this.highlight.visible = !!element;
    if (element) {
      this.highlight.box.set(new THREE.Vector3(...element.bounds.min), new THREE.Vector3(...element.bounds.max)).expandByScalar(0.015);
      this.highlight.updateMatrixWorld(true);
    }
    this.callbacks.selection(element);
  }

  focusSelected() {
    if (!import.meta.env.DEV) return;
    if (this.mode !== 'orbit') this.setMode('orbit');
    if (!this.selected) { this.setPreset('overview'); return; }
    const { bounds } = this.selected;
    const box = new THREE.Box3(new THREE.Vector3(...bounds.min), new THREE.Vector3(...bounds.max));
    const target = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, 0.4);
    const offset = this.camera.position.clone().sub(this.controls.target).normalize();
    if (offset.y < 0.3) offset.y = 0.6;
    offset.normalize().multiplyScalar(radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.2);
    this.goTo(target.clone().add(offset), target, true);
    this.callbacks.camera(null, this.mode);
  }

  private goTo(to: THREE.Vector3, target: THREE.Vector3, animate: boolean) {
    if (!import.meta.env.DEV) return;
    if (this.mode !== 'orbit') { this.mode = 'orbit'; this.controls.enabled = true; }
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.animation = { from: this.camera.position.clone(), targetFrom: this.controls.target.clone(), to, target, t: 0 };
    } else { this.camera.position.copy(to); this.controls.target.copy(target); this.controls.update(); }
  }

  private moveCamera(delta: number) {
    if (this.mode === 'follow') { this.followCamera(delta); return; }
    if ((this.mode === 'station' || this.mode === 'pov') && this.sim?.robot) {
      const robot = this.sim.robot, ceiling = robot.definition.hopper.volume?.ceilingY ?? .35;
      const frame = playerCameraFrame(this.mode, robot.body.translation(), robot.telemetry.heading,
        this.sim.robotController!.shooter.alliance, Math.max(.35, ceiling) + .12);
      this.camera.position.set(...frame.position); this.camera.lookAt(...frame.target);
      return;
    }
    if (import.meta.env.DEV && this.animation) {
      this.animation.t = Math.min(this.animation.t + delta / 0.55, 1);
      const { from, targetFrom, to, target, t } = this.animation;
      const eased = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(from, to, eased);
      this.controls.target.lerpVectors(targetFrom, target, eased);
      if (t === 1) this.animation = null;
    }
    if (this.mode !== 'fly' || !this.driveEnabled || !this.sim.running) return;
    const direction = new THREE.Vector3(
      Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
      0, Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')),
    );
    direction.applyQuaternion(this.camera.quaternion);
    direction.y += Number(this.keys.has('KeyE')) - Number(this.keys.has('KeyQ'));
    if (direction.lengthSq()) {
      direction.normalize().multiplyScalar(delta * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 12 : 3));
      this.camera.position.add(direction);
      this.camera.position.y = Math.max(this.camera.position.y, 0.12);
    }
  }

  private followCamera(delta: number, snap = false) {
    const robot = this.sim.robot;
    if (!robot) return;
    const p = robot.body.translation(), heading = this.driveFrame === 'field' ? (this.sim.robotController?.shooter.alliance === 'red' ? 0 : Math.PI) : robot.telemetry.heading;
    const forward = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const target = new THREE.Vector3(p.x, p.y + FOLLOW_FRAME.targetHeight, p.z).addScaledVector(forward, FOLLOW_FRAME.ahead);
    const desired = new THREE.Vector3(p.x, p.y + FOLLOW_FRAME.height, p.z).addScaledVector(forward, -FOLLOW_FRAME.back);
    if (snap) { this.followPosition.copy(desired); this.followTarget.copy(target); }
    else {
      this.followPosition.lerp(desired, 1 - Math.exp(-7 * delta));
      this.followTarget.lerp(target, 1 - Math.exp(-10 * delta));
    }
    // Spectator camera: field contacts must never collapse its distance to the robot.
    stabilizeFollowCamera(this.followPosition, this.followTarget, forward);
    this.camera.position.copy(this.followPosition);
    this.camera.lookAt(this.followTarget);
    if (import.meta.env.DEV) this.controls.target.copy(this.followTarget);
    this.updateCameraOcclusion(delta, snap, forward);
  }

  private updateCameraOcclusion(delta: number, snap: boolean, forward: THREE.Vector3) {
    if (!this.options.visuals) { this.restoreCameraOccluders(); return; }
    const blocked = new Set<string>();
    const p = this.sim.robot!.body.translation();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    // Three cheap BVH queries cover the robot's silhouette without raycasting the visual CAD.
    for (const offset of [-0.28, 0, 0.28]) {
      const point = new THREE.Vector3(p.x, p.y + 0.05, p.z).addScaledVector(right, offset);
      const direction = point.sub(this.camera.position), distance = direction.length();
      direction.normalize();
      this.sim.world.intersectionsWithRay(new Ray(this.camera.position, direction), Math.max(0, distance - 0.12), false, (hit) => {
        const id = this.sim.colliderElements.get(hit.collider.handle);
        if (id) blocked.add(id);
        return true;
      }, QueryFilterFlags.EXCLUDE_DYNAMIC | QueryFilterFlags.EXCLUDE_SENSORS);
    }
    for (const id of blocked) for (const mesh of this.fieldMeshes.get(id) ?? []) {
      if (this.cameraOccluders.has(mesh)) continue;
      const original = mesh.material;
      const faded = (Array.isArray(original) ? original : [original]).map((material) => {
        const clone = material.clone(); clone.transparent = true; clone.depthWrite = false; return clone;
      });
      this.cameraOccluders.set(mesh, { original, faded, opacity: 1 });
    }
    for (const [mesh, state] of this.cameraOccluders) {
      const target = blocked.has(mesh.userData.elementId) ? 0.14 : 1;
      state.opacity = snap ? target : THREE.MathUtils.lerp(state.opacity, target, 1 - Math.exp(-14 * delta));
      if (target === 1 && state.opacity > 0.995) { mesh.material = state.original; state.opacity = 1; continue; }
      const originals = Array.isArray(state.original) ? state.original : [state.original];
      state.faded.forEach((material, i) => { material.opacity = originals[i].opacity * state.opacity; });
      mesh.material = state.faded.length === 1 ? state.faded[0] : state.faded;
    }
  }

  private restoreCameraOccluders() {
    for (const [mesh, state] of this.cameraOccluders) { mesh.material = state.original; state.opacity = 1; }
  }

  private readDriveInput() {
    if (!this.sim.robot) return;
    const pad = this.playerControls.gamepad ? Array.from(navigator.getGamepads?.() ?? []).find(p => p?.connected) : null;
    const identity = pad ? `${pad.index}:${pad.id}` : '';
    if (identity !== this.gamepadIdentity) { this.gamepadArmed = false; this.restartHeld = this.pauseHeld = false; this.gamepadIdentity = identity; }
    const padActions = readActions(new Set(), this.playerControls, pad);
    if (pad && !Object.values(padActions).some(v => Math.abs(v) > 0.01)) this.gamepadArmed = true;
    const a = readActions(this.keys, this.playerControls, this.gamepadArmed ? pad : null);
    if (padActions.restart && this.gamepadArmed && !this.restartHeld) { this.restartHeld = true; this.callbacks.restartRequested(); return; }
    this.restartHeld = !!padActions.restart;
    if (padActions.pause && this.gamepadArmed && !this.pauseHeld) { this.pauseHeld = true; this.callbacks.pauseRequested(); return; }
    this.pauseHeld = !!padActions.pause;
    if (this.mode === 'fly') return;
    if (!this.driveEnabled || !this.sim.running || !this.sim.match.driverEnabled) return;
    if ((a.intake || a.reverse || a.shoot) && this.sim.robotController?.inspectionPose) this.resumeMechanisms();
    if (this.sim.robotController) this.sim.robotController.input = { intake: !!a.intake, reverse: !!a.reverse, shoot: !!a.shoot, toggleIntake: this.gamepadArmed && !!padActions.toggleIntake, switchIntake: this.gamepadArmed && !!padActions.switchIntake, climb: this.gamepadArmed && !!padActions.climb, supply: !!a.supply };
    const sign = this.sim.robotController?.shooter.alliance === 'red' && this.driveFrame === 'field' ? -1 : 1;
    this.sim.robot.input = toRobotInput({ forward: sign * (a.forward - a.backward), strafe: sign * (a.right - a.left), turn: a.turnLeft - a.turnRight, slow: false, brake: false }, this.sim.robot.telemetry.heading, this.driveFrame);
  }

  setRobotPose(pose: RobotPose) { if (!import.meta.env.DEV) return; if (this.sim.match.mode === 'match') return; this.sim?.robotController?.inspect(pose); this.syncFuel(); if (this.sim?.robot) this.robotView.update(this.sim.robot, 0, this.sim.robotController); if (this.options.colliders) this.updateDebug(); }
  resumeMechanisms() { if (!import.meta.env.DEV) return; this.sim?.robotController?.inspect(null); }

  setDriveFrame(frame: DriveFrame) { if (!import.meta.env.DEV) return; this.driveFrame = frame; this.clearInput(); }

  clearInput() { this.gamepadArmed = false; this.flyDragging = false; this.keys.clear(); if (this.sim?.robot) this.sim.robot.input = { ...NEUTRAL_INPUT }; this.sim?.robotController?.clearInput(); }
  setRunning(running: boolean) { this.clearInput(); this.sim?.setRunning(running); }
  respawn(spawn: DriveSpawn = 'practice') {
    if (!import.meta.env.DEV) return;
    if (this.sim.match.mode === 'match') return;
    this.clearInput(); this.sim.robotController?.respawn(spawn); this.syncFuel(); this.setMode('follow');
    if (this.options.colliders) this.updateDebug();
  }
  focusCanvas() { this.renderer.domElement.focus({ preventScroll: true }); }

  dropProbe() {
    if (!import.meta.env.DEV) return;
    if (this.sim.match.mode === 'match') return;
    const center = this.selected?.center ?? [0, 0, 0];
    const top = this.selected?.bounds.max[1] ?? 0;
    this.sim.dropProbe([center[0], top + 1.3, center[2]]);
    this.syncFuel();
    this.updateDebug();
  }

  reset() { if (!import.meta.env.DEV) return; this.matchAudio.reset(); this.clearInput(); this.sim.reset(); this.syncFuel(); this.setMode('follow'); if (this.options.colliders) this.updateDebug(); }
  startMatch(config: MatchConfig) { this.sessionPractice = false; this.matchAudio.reset(true); this.clearInput(); this.sim.startMatch(config); this.sessionConfig = { ...config }; this.syncFuel(); this.setMode(this.playerCamera); }
  startPractice() { this.startSession(this.sessionConfig, true); }
  restartMatch() { this.startSession(this.sessionConfig, this.sessionPractice); }
  startSession(config: MatchConfig, practice = false) {
    this.sessionConfig = { ...config };
    this.startMatch(config); this.sessionPractice = practice;
    if (practice) this.sim.match.enterPractice();
    this.robotView.setDefinition(this.sim.robot!.definition);
    this.robotView.setAlliance(this.sim.robotController!.shooter.alliance);
    this.syncFuel();
  }
  applySettings(settings: Settings) {
    if (this.playerControls !== settings.controls) { this.playerControls = settings.controls; this.clearInput(); }
    if (this.playerCamera !== settings.camera) { this.playerCamera = settings.camera; this.setMode(settings.camera); }
    this.matchAudio.setLevel(settings.volume, settings.muted);
    const preset = GRAPHICS[settings.graphics], shadows = preset.shadowSize > 0;
    const changed = this.renderer.shadowMap.enabled !== shadows;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatio));
    this.renderer.shadowMap.enabled = shadows;
    if (shadows && this.sun.shadow.mapSize.x !== preset.shadowSize) {
      this.sun.shadow.map?.dispose(); this.sun.shadow.map = null;
      this.sun.shadow.mapSize.set(preset.shadowSize, preset.shadowSize);
    }
    if (changed) this.scene.traverse(o => {
      if (o instanceof THREE.Mesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; });
    });
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
  }
  snapshot(fps = 0): ViewerStats {
    return { fps, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      colliders: import.meta.env.DEV ? this.sim.world.colliders.len() : 0,
      awake: import.meta.env.DEV ? this.sim.awakeBodies : 0, physicsMs: this.sim.running ? this.sim.physicsMs : 0,
      running: this.sim.running, humanPlayer: this.sim.humanPlayer.telemetry, robot: this.sim.robot?.telemetry ?? null,
      mechanisms: this.sim.robotController?.telemetry ?? null, hubs: this.sim.hubs.telemetry, match: this.sim.match.telemetry };
  }

  private makeLabels() {
    if (!import.meta.env.DEV) return;
    for (const element of this.manifest.elements.filter((e) => ['hub', 'tower', 'outpost', 'depot', 'bump', 'trench'].includes(e.kind))) {
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = 80;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = element.alliance === 'red' ? '#8e2633' : '#174c88';
      ctx.beginPath(); ctx.roundRect(2, 2, 380, 76, 14); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = '600 28px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(element.name.toUpperCase(), 192, 40);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
      sprite.position.set(element.center[0], element.bounds.max[1] + 0.25, element.center[2]);
      sprite.scale.set(1.55, 0.32, 1); sprite.renderOrder = 30;
      this.labels.add(sprite);
    }
  }

  private onControlStart = () => { this.animation = null; this.callbacks.camera(null, this.mode); };
  private onContextMenu = (e: Event) => e.preventDefault();
  private onPointerDown = (e: PointerEvent) => {
    this.renderer.domElement.focus({ preventScroll: true });
    if (import.meta.env.DEV) this.pointerStart.set(e.clientX, e.clientY);
    if (this.mode === 'fly' && this.driveEnabled && e.button === 2) {
      this.flyDragging = true;
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  };
  private onPointerUp = (e: PointerEvent) => {
    this.flyDragging = false;
    if (this.renderer.domElement.hasPointerCapture(e.pointerId)) this.renderer.domElement.releasePointerCapture(e.pointerId);
    if (!import.meta.env.DEV || e.type === 'pointercancel') return;
    if (e.button !== 0 || this.pointerStart.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) return;
    if (!this.inspectEnabled || this.mode === 'follow') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const hits = this.raycaster.intersectObject(this.model, true);
    const floorDistance = hits.find((hit) => hit.object.userData.kind === 'carpet')?.distance ?? Infinity;
    const hit = hits.find((hit) => !['carpet', 'markings', 'arena'].includes(hit.object.userData.kind) && hit.distance < floorDistance + 0.01);
    if (!hit) { this.select(null); return; }
    const id = hit.object.userData.elementId;
    this.select(this.manifest.elements.find((element) => element.id === id) ?? null);
  };
  private onPointerMove = (e: PointerEvent) => {
    if (this.mode !== 'fly' || !this.flyDragging || !this.driveEnabled || !this.sim?.running) return;
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    euler.y -= e.movementX * 0.003;
    euler.x = THREE.MathUtils.clamp(euler.x - e.movementY * 0.003, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    this.camera.quaternion.setFromEuler(euler);
  };
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if ((e.target as HTMLElement).closest('input, select, textarea, [role="dialog"]') || e.ctrlKey || e.metaKey || e.altKey || !this.driveEnabled) return;
    if (this.mode === 'fly') {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        this.keys.add(e.code); e.preventDefault();
      }
      return;
    }
    if (Object.values(this.playerControls.keys).flat().includes(e.code)) {
      if (e.code === 'Space' && (e.target as HTMLElement).closest('button')) return;

      if (this.playerControls.keys.climb.includes(e.code) && this.sim?.running && this.sim.match.driverEnabled) this.sim.robotController?.requestClimbToggle();
      if (this.playerControls.keys.toggleIntake.includes(e.code) && this.sim?.running && this.sim.match.driverEnabled) this.sim.robotController?.requestIntakeToggle();
      if (this.playerControls.keys.switchIntake.includes(e.code) && this.sim?.running && this.sim.match.driverEnabled) this.sim.robotController?.requestIntakeSwitch();
      this.keys.add(e.code); e.preventDefault();
    }
    if (e.code === 'Escape') { this.keys.clear(); this.flyDragging = false; }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (!e.shiftKey) { this.keys.delete('ShiftLeft'); this.keys.delete('ShiftRight'); }
  };
  private onBlur = () => { this.clearInput(); this.flyDragging = false; this.setRunning(false); this.callbacks.focusLost(); if (this.sim) this.callbacks.stats(this.snapshot()); };
  private onContextLost = (e: Event) => { e.preventDefault(); this.onBlur(); cancelAnimationFrame(this.raf); this.callbacks.error('The graphics context was lost. Close other graphics-heavy tabs, then try again.'); };
  private onVisibility = () => { if (document.hidden) this.onBlur(); };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    if (import.meta.env.DEV) this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerUp);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('pointerdown', this.matchAudio.unlock);
    window.removeEventListener('keydown', this.matchAudio.unlock);
    this.matchAudio.dispose();
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.restoreCameraOccluders();
    this.cameraOccluders.forEach((state) => state.faded.forEach((material) => material.dispose()));
    this.robotView.group.removeFromParent(); this.robotView.contacts?.removeFromParent();
    this.robotView.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
        if ('geometry' in object) object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => { if ('map' in material) (material.map as THREE.Texture | null)?.dispose(); material.dispose(); });
      }
    });
    this.sim?.dispose();
    this.renderer.dispose();
    canvas.remove();
  }
}
