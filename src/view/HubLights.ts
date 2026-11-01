import * as THREE from 'three';
import { HUBS, mouthVertices } from '../field/hubs';
import type { Alliance } from '../field/targets';
import type { MatchTelemetry } from '../sim/MatchRules';

/** Lightweight lip lights, independent of the field collision mesh. */
export class HubLights {
  readonly group = new THREE.Group();
  private strips: { alliance: Alliance; index: number; material: THREE.MeshBasicMaterial }[] = [];
  constructor() {
    const geometry = new THREE.BoxGeometry(1, 0.025, 0.025);
    for (const hub of HUBS) {
      const points = mouthVertices(hub, -0.012);
      points.forEach((a, index) => {
        const b = points[(index + 1) % points.length];
        const material = new THREE.MeshBasicMaterial({ color: hub.alliance === 'blue' ? '#3988ff' : '#ff4658', toneMapped: false });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set((a.x + b.x) / 2, a.y + 0.014, (a.z + b.z) / 2);
        mesh.scale.x = Math.hypot(b.x - a.x, b.z - a.z); mesh.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
        this.group.add(mesh); this.strips.push({ alliance: hub.alliance, index, material });
      });
    }
  }
  update(match: MatchTelemetry) {
    const disabled = ['Auto scoring', 'Final scoring', 'Complete'].includes(match.phase);
    for (const strip of this.strips) {
      const state = match.lights[strip.alliance];
      const chase = state.chase && (strip.index + Math.floor(match.elapsed * 8)) % 6 < 2;
      strip.material.color.set(disabled ? '#a16aff' : chase ? '#ffffff' : strip.alliance === 'blue' ? '#3988ff' : '#ff4658');
      const brightness = disabled ? 0.4 : !state.active ? 0.08 : state.warning ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(match.elapsed * Math.PI * 6)) : 1;
      strip.material.color.multiplyScalar(brightness);
    }
  }
}
