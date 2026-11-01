import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import type { Document, Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Vector3 } from 'three';
import { LIMESTONE } from './definition';
let doc: Document;
beforeAll(async()=>{
  await MeshoptDecoder.ready;
  doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).read(`public${LIMESTONE.model}`);
});
const assembly=(name: string)=>doc.getRoot().listNodes().find(n=>n.getExtras().mechanism===name)!;
function localBounds(root: Node){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const inverse=new Matrix4().fromArray(root.getWorldMatrix()).invert();
  const visit=(node: Node)=>{
    const matrix=inverse.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
    // Include Meshopt's quantization scales before measuring the assembly frame.
    for(const p of node.getMesh()?.listPrimitives()??[]){const a=p.getAttribute('POSITION')!;for(let i=0;i<a.getCount();i++){const v=new Vector3(...a.getElement(i,[])).applyMatrix4(matrix).toArray();for(let k=0;k<3;k++){min[k]=Math.min(min[k],v[k]);max[k]=Math.max(max[k],v[k]);}}}
    for(const child of node.listChildren())visit(child);
  };visit(root);return {min,max};
}
describe('Limestone CAD articulation',()=>{
  it('normalizes every actual MK5n wheel axle to +Z at the declared suspension mounts',()=>{
    for(const m of LIMESTONE.modules){
      const wheel=assembly(`${m.name}-wheel`),fork=assembly(`${m.name}-fork`);
      expect(wheel.getTranslation()[0]).toBeCloseTo(m.x,5);expect(wheel.getTranslation()[2]).toBeCloseTo(m.z,5);
      expect(fork.getTranslation()).toEqual(wheel.getTranslation());
      const {min,max}=localBounds(wheel),extent=max.map((v,k)=>v-min[k]);
      expect(extent[0]).toBeCloseTo(.1016,2);expect(extent[1]).toBeCloseTo(.1016,2);
      // The molded MK5n tread/hub is ~60 mm wide in the official export.
      expect(extent[2]).toBeGreaterThan(.057);expect(extent[2]).toBeLessThan(.064);
    }
  });
  it('keeps all three hood rollers on the moving hood and the fixed kicker off the slapdown arm',()=>{
    const hood=assembly('hood');
    for(let i=0;i<3;i++)expect(assembly(`hood-roller-${i}`).getParentNode()).toBe(hood);
    expect(assembly('intake-roller-0').getParentNode()).toBe(assembly('intake'));
    expect(assembly('intake-roller-kicker').getParentNode()).toBe(assembly('chassis'));
    expect(assembly('shooter-drum').getParentNode()).toBe(assembly('chassis'));
    expect(localBounds(assembly('climber')).max[1]).toBeGreaterThan(.31);
  });
});
