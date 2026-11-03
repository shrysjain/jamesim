import { BufferAttribute, Matrix4, Vector3 } from 'three';

/** The two lower carriage brackets were batched as fixed actuation hardware.
 * Split only those measured solids out of the chassis, retaining their collecting-pose transforms. */
export function rigPrismarineIntakeBrackets(doc) {
  const root = doc.getRoot(), intake = root.listNodes().find(n => n.getExtras().mechanism === 'intake');
  if (!intake) throw new Error('Prismarine intake assembly missing');
  if (root.listNodes().some(n => n.getExtras().mechanism === 'intake-brackets')) return;
  const buffer = root.listBuffers()[0], group = doc.createNode('intake-brackets').setExtras({ mechanism: 'intake-brackets' });
  const localFrame = new Matrix4().fromArray(intake.getWorldMatrix()).invert();
  let triangles = 0;
  const sides = new Set();
  for (const node of root.listNodes()) {
    if (node.getParentNode()?.getExtras().mechanism !== 'chassis') continue;
    const mesh = node.getMesh();
    for (const primitive of mesh?.listPrimitives() ?? []) {
      if (primitive.getMaterial()?.getName() !== '8592-teal') continue;
      const a = primitive.getAttribute('POSITION'), attr = new BufferAttribute(a.getArray(), 3, a.getNormalized());
      const world = new Matrix4().fromArray(node.getWorldMatrix()), positions = [];
      for (let i=0;i<a.getCount();i++) positions.push(new Vector3().fromBufferAttribute(attr,i).applyMatrix4(world));
      const indices = primitive.getIndices().getArray(), keep = [], move = [];
      for (let i=0;i<indices.length;i+=3) {
        const tri = Array.from(indices.slice(i,i+3));
        const bracket = tri.every(i => {
          const p=positions[i];
          return p.x > -.57 && p.x < -.49 && p.y > -.03 && p.y < .075 && Math.abs(p.z) > .25 && Math.abs(p.z) < .28;
        });
        (bracket ? move : keep).push(...tri);
        if (bracket) sides.add(Math.sign(positions[tri[0]].z));
      }
      if (!move.length) continue;
      const index = values => doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(values)).setBuffer(buffer);
      const moving = primitive.clone().setIndices(index(move));
      group.addChild(doc.createNode('original lower carriage brackets')
        .setMatrix(localFrame.clone().multiply(world).toArray()).setMesh(doc.createMesh().addPrimitive(moving)));
      primitive.setIndices(index(keep));
      triangles += move.length/3;
    }
  }
  if (triangles !== 388 || sides.size !== 2) throw new Error(`Unexpected Prismarine bracket geometry: ${triangles} triangles on ${sides.size} sides`);
  intake.addChild(group);
}
