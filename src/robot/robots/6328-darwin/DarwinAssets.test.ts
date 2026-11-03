import {beforeAll,describe,expect,it} from 'vitest';
import {NodeIO} from '@gltf-transform/core';
import type {Document,Node} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Vector3} from 'three';
import {readFileSync} from 'node:fs';
import {DARWIN} from './definition';
let doc:Document;
beforeAll(async()=>{await MeshoptDecoder.ready;doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).read(`public${DARWIN.model}`);});
const assembly=(id:string)=>doc.getRoot().listNodes().find(n=>n.getExtras().mechanism===id)!;
function bounds(root:Node){
 const inv=new Matrix4().fromArray(root.getWorldMatrix()).invert(),min=[Infinity,Infinity,Infinity],max=min.map(()=>-Infinity);
 const visit=(node:Node)=>{const m=inv.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));for(const p of node.getMesh()?.listPrimitives()??[]){const a=p.getAttribute('POSITION')!;for(let i=0;i<a.getCount();i++){const v=new Vector3().fromArray(a.getElement(i,[])).applyMatrix4(m);for(let k=0;k<3;k++){min[k]=Math.min(min[k],v.getComponent(k));max[k]=Math.max(max[k],v.getComponent(k));}}}node.listChildren().forEach(visit);};visit(root);return{min,max,size:max.map((v,k)=>v-min[k])};
}
describe('Darwin official CAD contract',()=>{
 it('retains all five exported assemblies, including the fixed-height roof',()=>{
  for(const id of ['chassis','intake','hopper','hood','roof'])expect(bounds(assembly(id)).size.every(v=>Number.isFinite(v)&&v>0)).toBe(true);
  expect(assembly('roof').getParentNode()).toBe(assembly('chassis'));
  expect(assembly('intake-roller-0').getParentNode()).toBe(assembly('intake'));
  expect(assembly('shooter-drum').getParentNode()).toBe(assembly('chassis'));
  expect(DARWIN.mechanisms.climb).toBe(false);
 });
 it('normalizes both MK5i/MK5n wheel families to the common +Z axle convention',()=>{
  for(const m of DARWIN.modules){const wheel=assembly(`${m.name}-wheel`),fork=assembly(`${m.name}-fork`);
   expect(wheel.getTranslation()[0]).toBeCloseTo(m.x,5);expect(wheel.getTranslation()[2]).toBeCloseTo(m.z,5);expect(fork.getTranslation()).toEqual(wheel.getTranslation());
   const size=bounds(wheel).size;expect(size[0]).toBeCloseTo(.1016,2);expect(size[1]).toBeCloseTo(.1016,2);expect(size[2]).toBeGreaterThan(.057);expect(size[2]).toBeLessThan(.064);
  }
 });
 it('pins official geometry and the exact requested Onshape document without claiming cleared CAD rights',()=>{
  const source=JSON.parse(readFileSync('assets/robots/6328-darwin/sources.json','utf8'));
  expect(source.onshape).toContain('/2da573df9d139d7a1e0f08a8/w/5266e52966df9f56fcb472f0/e/15a6a42133f059b818ad5264');
  expect(source.files.map((f:{file:string})=>f.file)).toEqual(['model.glb','model_0.glb','model_1.glb','model_2.glb','model_3.glb','config.json']);
  expect(source.files.every((f:{sha256:string})=>/^[0-9a-f]{64}$/.test(f.sha256))).toBe(true);expect(source.redistribution.status).toBe('pending');
 });
});
