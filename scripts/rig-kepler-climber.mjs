import { Matrix4, Vector3 } from 'three';

/** The pinned body export batches disconnected solids by material/part name.
 * Separate the existing sliding stage, hook plates/liner and lower carriage
 * hardware by connected solid and measured bounds. No replacement geometry. */
export function rigKeplerClimber(doc) {
  if (doc.getRoot().listNodes().some(n => n.getExtras().mechanism === 'climber')) return;
  const buffer = doc.getRoot().listBuffers()[0];
  const stage = doc.createNode('climber').setExtras({ mechanism: 'climber' });
  doc.getRoot().listScenes()[0].addChild(stage);
  let solids = 0, structural = 0;
  for (const node of [...doc.getRoot().listNodes()].filter(n => n.getName().startsWith('body/'))) {
    const matrix = new Matrix4().fromArray(node.getWorldMatrix());
    for (const primitive of [...node.getMesh().listPrimitives()]) {
      const position = primitive.getAttribute('POSITION'), indices = primitive.getIndices().getArray();
      const parent = [], keys = new Map(), points = [];
      const root = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      const merge = (a, b) => { a = root(a); b = root(b); if (a !== b) parent[b] = a; };
      for (let i = 0; i < position.getCount(); i++) {
        const p = new Vector3(...position.getElement(i, [])).applyMatrix4(matrix).toArray();
        points.push(p); parent.push(i);
        const key = p.map(x => Math.round(x * 100000)).join(',');
        if (keys.has(key)) merge(i, keys.get(key)); else keys.set(key, i);
      }
      for (let i = 0; i < indices.length; i += 3) { merge(indices[i], indices[i + 1]); merge(indices[i], indices[i + 2]); }
      const components = new Map();
      for (let i = 0; i < indices.length; i += 3) {
        const r = root(indices[i]); if (!components.has(r)) components.set(r, []);
        components.get(r).push(indices[i], indices[i + 1], indices[i + 2]);
      }
      const moving = [], fixed = [];
      for (const component of components.values()) {
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (const i of component) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], points[i][k]); max[k] = Math.max(max[k], points[i][k]); }
        const centerStage = node.getName() === 'body/Part 36' && min[0] > .24 && max[0] < .294 && min[2] > -.035 && max[2] < -.008 && max[1] - min[1] > .32;
        const hook = ['body/Part 39', 'body/Part 8'].includes(node.getName()) && min[0] > .243 && max[0] < .292 && min[1] > .183 && max[1] > .31 && min[2] > -.077 && max[2] < .034;
        const bottomHardware = min[0] > .230 && max[0] < .306 && min[1] > -.138 && max[1] < -.084 && min[2] > -.041 && max[2] < .001;
        if (centerStage || hook || bottomHardware) { moving.push(...component); solids++; if (centerStage || hook) structural++; }
        else fixed.push(...component);
      }
      if (!moving.length) continue;
      const subset = selected => {
        const unique = [...new Set(selected)], remap = new Map(unique.map((v, i) => [v, i]));
        const output = doc.createPrimitive().setMaterial(primitive.getMaterial());
        for (const semantic of primitive.listSemantics()) {
          const source = primitive.getAttribute(semantic), size = source.getElementSize(), raw = source.getArray();
          const array = new raw.constructor(unique.length * size);
          unique.forEach((v, i) => array.set(raw.subarray(v * size, (v + 1) * size), i * size));
          output.setAttribute(semantic, doc.createAccessor().setType(source.getType()).setNormalized(source.getNormalized()).setArray(array).setBuffer(buffer));
        }
        return output.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(selected.map(i => remap.get(i)))).setBuffer(buffer));
      };
      const mesh = doc.createMesh(`${node.getName()} sliding solids`).addPrimitive(subset(moving));
      stage.addChild(doc.createNode(`${node.getName()} climber`).setMatrix(node.getWorldMatrix()).setMesh(mesh));
      node.getMesh().removePrimitive(primitive);
      if (fixed.length) node.getMesh().addPrimitive(subset(fixed));
      primitive.dispose();
    }
  }
  if (structural !== 4 || solids < 8) throw new Error(`Kepler climber extraction changed: ${structural} structural / ${solids} total solids`);
  console.log(`Rigged existing Kepler climber: ${solids} CAD solids`);
}
