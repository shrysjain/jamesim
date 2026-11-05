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
  it('uses one regular outer cylinder on each main roller and retains its narrower end shafts',()=>{
    for(const id of ['intake-roller-0','shooter-drum']){
      const root=assembly(id),inv=new Matrix4().fromArray(root.getWorldMatrix()).invert();
      let shells=0,shaftVertices=0;const shellZ=[Infinity,-Infinity],shaftZ=[Infinity,-Infinity];
      root.traverse(node=>{
        const matrix=inv.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
        for(const p of node.getMesh()?.listPrimitives()??[]){
          const pos=p.getAttribute('POSITION')!,idx=p.getIndices()!.getArray()!;
          const vertices=Array.from({length:pos.getCount()},(_,i)=>new Vector3(...pos.getElement(i,[])).applyMatrix4(matrix));
          const cx=(Math.min(...vertices.map(v=>v.x))+Math.max(...vertices.map(v=>v.x)))/2;
          const cy=(Math.min(...vertices.map(v=>v.y))+Math.max(...vertices.map(v=>v.y)))/2;
          const radii=vertices.map(v=>Math.hypot(v.x-cx,v.y-cy)),radius=Math.max(...radii);
          if(radius<.02){for(const v of vertices){shaftVertices++;shaftZ[0]=Math.min(shaftZ[0],v.z);shaftZ[1]=Math.max(shaftZ[1],v.z);}continue;}
          let longFaces=0;
          for(let i=0;i<idx.length;i+=3){const z=[vertices[idx[i]].z,vertices[idx[i+1]].z,vertices[idx[i+2]].z];if(Math.max(...z)-Math.min(...z)>.45)longFaces++;}
          if(!longFaces)continue;
          shells++;expect(longFaces,id).toBe(96);
          const outer=radii.filter(r=>r>.02);
          expect(Math.max(...outer)-Math.min(...outer),id).toBeLessThan(.0002);
          for(const v of vertices){shellZ[0]=Math.min(shellZ[0],v.z);shellZ[1]=Math.max(shellZ[1],v.z);}
        }
      });
      expect(shells,id).toBe(1);expect(shaftVertices,id).toBeGreaterThan(20);
      expect(shaftZ[0],id).toBeLessThan(shellZ[0]-.015);expect(shaftZ[1],id).toBeGreaterThan(shellZ[1]+.015);
      const bounds=localBounds(root);
      expect(bounds.max[0]-bounds.min[0],id).toBeCloseTo(id==='shooter-drum'?.0921:.0508,3);
      expect(bounds.max[2]-bounds.min[2],id).toBeCloseTo(id==='shooter-drum'?.6631:.6604,3);
    }
  });
  it('uses one long cylindrical surface per intake bar and hood roller, keeping short end hardware',()=>{
    for(const id of ['intake-roller-1','intake-roller-2','hood-roller-0','hood-roller-1','hood-roller-2']){
      const root=assembly(id),inv=new Matrix4().fromArray(root.getWorldMatrix()).invert();let shells=0;
      root.traverse(node=>{
        const matrix=inv.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
        for(const p of node.getMesh()?.listPrimitives()??[]){
          const pos=p.getAttribute('POSITION')!,idx=p.getIndices()!.getArray()!;
          const z=Array.from({length:pos.getCount()},(_,i)=>new Vector3().fromArray(pos.getElement(i,[])).applyMatrix4(matrix).z);
          let longFaces=0;for(let i=0;i<idx.length;i+=3){const a=[z[idx[i]],z[idx[i+1]],z[idx[i+2]]];if(Math.max(...a)-Math.min(...a)>.45)longFaces++;}
          if(longFaces){expect(longFaces).toBe(96);shells++;}
        }
      });
      expect(shells,id).toBe(1);
    }
  });
  it('keeps thin intake rollers free of coincident faces that flicker while spinning',()=>{
    for(const id of ['intake-roller-1','intake-roller-2']){
      const root=assembly(id), inv=new Matrix4().fromArray(root.getWorldMatrix()).invert(),faces=new Set<string>();let triangles=0,duplicates=0;
      root.traverse(node=>{
        const matrix=inv.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
        for(const p of node.getMesh()?.listPrimitives()??[]){
          const pos=p.getAttribute('POSITION')!,idx=p.getIndices()!.getArray()!;
          const vertices=Array.from({length:pos.getCount()},(_,i)=>new Vector3().fromArray(pos.getElement(i,[])).applyMatrix4(matrix).toArray().map(v=>Math.round(v*1e5)).join(','));
          for(let i=0;i<idx.length;i+=3){const key=[vertices[idx[i]],vertices[idx[i+1]],vertices[idx[i+2]]].sort().join('|');triangles++;if(faces.has(key))duplicates++;faces.add(key);}
        }
      });
      // Rebuilt shaft shells replace four overlapping CAD solids per bar.
      // Keep the original short end hardware, with one smooth outer cylinder.
      expect(triangles).toBeGreaterThan(190);expect(triangles).toBeLessThan(600);
      expect(duplicates).toBeLessThan(triangles*.01);
      const bounds=localBounds(root);
      expect(bounds.max[0]-bounds.min[0]).toBeCloseTo(.01825,4);
      expect(bounds.max[1]-bounds.min[1]).toBeCloseTo(.01825,4);
      expect(bounds.max[2]-bounds.min[2]).toBeCloseTo(.66091,4);
    }
  });
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
