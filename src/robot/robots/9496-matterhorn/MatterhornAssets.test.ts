import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import type {Document,Node} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Matrix4,Vector3} from 'three';
import {MATTERHORN as D} from './definition';
let doc:Document;
beforeAll(async()=>{await MeshoptDecoder.ready;doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}).read(`public${D.model}`);});
const node=(name:string)=>doc.getRoot().listNodes().find(n=>n.getExtras().mechanism===name)!;
function bounds(root:Node){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],inv=new Matrix4().fromArray(root.getWorldMatrix()).invert();root.traverse(n=>{const m=inv.clone().multiply(new Matrix4().fromArray(n.getWorldMatrix()));for(const p of n.getMesh()?.listPrimitives()??[]){const a=p.getAttribute('POSITION')!;for(let i=0;i<a.getCount();i++){const v=new Vector3().fromArray(a.getElement(i,[])).applyMatrix4(m).toArray();for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],v[k]);hi[k]=Math.max(hi[k],v[k]);}}}});return{lo,hi,size:hi.map((x,k)=>x-lo[k])};}
describe('Matterhorn owner-supplied CAD',()=>{
 it('records the exact upload and prepared runtime integrity without shipping the original',()=>{
  const source=JSON.parse(readFileSync('assets/robots/9496-matterhorn/sources.json','utf8'));
  expect(source.onshape).toContain('768d7890bafac55a2a891aae');expect(source.files[0]).toMatchObject({bytes:214524968,sha256:'e004d5b5288c78d4373953f311d5d2c47f766d346536f182c3b1494c6851a552'});
  const record=JSON.parse(readFileSync('assets/robots/9496-matterhorn/runtime.json','utf8')),bytes=readFileSync(`public${D.model}`);
  expect(record.group.files[0].sha256).toBe(createHash('sha256').update(bytes).digest('hex'));expect(record.group.redistribution.status).toBe('pending');
 });
 it('keeps actual MK5n wheel/fork mounts and normalizes the source 45-degree axle frames',()=>{
  for(const m of D.modules){const w=node(m.name+'-wheel'),f=node(m.name+'-fork');expect(w).toBeTruthy();expect(f).toBeTruthy();expect(w.getTranslation()).toEqual(f.getTranslation());
   expect(w.getTranslation()[0]).toBeCloseTo(m.x,6);expect(w.getTranslation()[2]).toBeCloseTo(m.z,6);const b=bounds(w);
   expect(b.size[0]).toBeCloseTo(.1016,2);expect(b.size[1]).toBeCloseTo(.1016,2);expect(b.size[2]).toBeGreaterThan(.05);expect(b.size[2]).toBeLessThan(.07);
  }
 });
 it('retains the real drum, flywheels, feeder rollers and moving hopper instead of procedural substitutes',()=>{
  expect(node('intake')).toBeTruthy();expect(node('hopper')).toBeTruthy();expect(bounds(node('hopper')).size[0]).toBeGreaterThan(.4);
  const drum=node('shooter-drum');expect(drum.getTranslation()[0]).toBeCloseTo(.127,5);expect(drum.getTranslation()[1]).toBeCloseTo(.231025,5);expect(bounds(drum).size[2]).toBeGreaterThan(.5);
  for(const id of ['intake-roller-0','intake-roller-1','feeder-roller-0','feeder-roller-1','feeder-roller-2'])expect(node(id)).toBeTruthy();
  expect(D.visual.poseNodes.hood).toBeUndefined();expect(doc.getRoot().listNodes().some(n=>n.getExtras().mechanism==='climber')).toBe(false);
 });
});
