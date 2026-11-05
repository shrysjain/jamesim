import * as THREE from 'three';
import type { RobotDefinition, RobotPose } from '../robot/types';
import { retainingNetPanels } from '../robot/retainingNet';

/** Open-weave visual fabric; containment uses the matching local cargo envelope. */
export class RetainingNetView {
  readonly group = new THREE.Group();
  private panels: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  private material: THREE.MeshStandardMaterial;
  private definition: RobotDefinition | null = null;
  private poseKey = '';
  constructor() {
    const data = new Uint8Array(32 * 32 * 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4; data.set([80, 85, 90, x < 2 || y < 2 ? 255 : 0], i);
    }
    const map = new THREE.DataTexture(data, 32, 32); map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace; map.generateMipmaps = true; map.minFilter = THREE.LinearMipmapLinearFilter; map.needsUpdate = true;
    this.material = new THREE.MeshStandardMaterial({ map, alphaTest: .25, side: THREE.DoubleSide, roughness: 1 });
  }
  update(definition: RobotDefinition, pose: RobotPose) {
    const key = `${pose.intake}:${pose.opposedIntake ?? 0}:${pose.hopper}:${pose.climber ?? 0}`;
    if (this.definition === definition && key === this.poseKey) return;
    this.definition = definition; this.poseKey = key;
    const panels = retainingNetPanels(definition, pose); this.group.visible = panels.length > 0;
    panels.forEach((corners, i) => {
      let mesh = this.panels[i];
      if (!mesh) {
        const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3))
          .setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(8), 2)).setIndex([0, 1, 2, 0, 2, 3]);
        mesh = new THREE.Mesh(geometry, this.material); mesh.name = `retaining-net-${i}`;
        this.panels.push(mesh); this.group.add(mesh);
      }
      mesh.visible = true;
      const position = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv');
      const width = Math.hypot(...corners[1].map((v, k) => v - corners[0][k])) * 20;
      const height = Math.hypot(...corners[3].map((v, k) => v - corners[0][k])) * 20;
      corners.forEach((p, k) => position.setXYZ(k, ...p));
      [[0, 0], [width, 0], [width, height], [0, height]].forEach((p, k) => uv.setXY(k, p[0], p[1]));
      position.needsUpdate = uv.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
    });
    for (let i = panels.length; i < this.panels.length; i++) this.panels[i].visible = false;
  }
  dispose() { this.panels.forEach(p => p.geometry.dispose()); this.material.map?.dispose(); this.material.dispose(); }
}
