import { BoxGeometry } from 'three';

/** Replace the source's embossed foam with the same flat four-rail wrap used by Kepler.
 * Dimensions retain Prismarine's existing bumper/collision envelope, in meters. */
export function replacePrismarineBumpers(doc) {
  const sourceNames = new Set(['bumper', '8592-number']);
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const primitive of mesh.listPrimitives()) {
      if (sourceNames.has(primitive.getMaterial()?.getName())) {
        mesh.removePrimitive(primitive); primitive.dispose();
      }
    }
    if (!mesh.listPrimitives().length) {
      node.setMesh(null); mesh.dispose();
      if (!node.listChildren().length && !node.getExtras().mechanism) node.dispose();
    }
  }
  const chassis = doc.getRoot().listNodes().find(n => n.getExtras().mechanism === 'chassis');
  if (!chassis) throw new Error('Prismarine chassis assembly missing');
  const buffer = doc.getRoot().listBuffers()[0] ?? doc.createBuffer();
  const material = doc.createMaterial('bumper').setBaseColorFactor([.025,.13,.52,1])
    .setMetallicFactor(0).setRoughnessFactor(.95).setDoubleSided(true);
  const length = .7792, width = .8871, height = .123, thickness = .0762, y = -.1273;
  const attribute = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  for (const sign of [-1, 1]) {
    for (const [name, size, center] of [
      ['end', [thickness,height,width], [sign*(length-thickness)/2,y,0]],
      ['side', [length-2*thickness,height,thickness], [0,y,sign*(width-thickness)/2]],
    ]) {
      const geometry = new BoxGeometry(...size), positions = geometry.getAttribute('position').array.slice();
      for (let i=0;i<positions.length;i++) positions[i] += center[i%3];
      const primitive = doc.createPrimitive().setMaterial(material)
        .setAttribute('POSITION', attribute('VEC3', positions))
        .setAttribute('NORMAL', attribute('VEC3', geometry.getAttribute('normal').array.slice()))
        .setIndices(attribute('SCALAR', new Uint16Array(geometry.index.array)));
      chassis.addChild(doc.createNode(`plain bumper ${name} ${sign}`).setMesh(doc.createMesh().addPrimitive(primitive)));
      geometry.dispose();
    }
  }
}
