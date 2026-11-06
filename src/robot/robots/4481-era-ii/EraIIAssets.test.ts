import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {NodeIO,type Node} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4,Vector3} from 'three';
import {MeshoptDecoder} from 'meshoptimizer';
import {ERA_II as D} from './definition';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
let nodes:Map<string,Node>;
beforeAll(async()=>{await MeshoptDecoder.ready;const doc=await io.readBinary(readFileSync(`public${D.model}`));nodes=new Map(doc.getRoot().listNodes().filter(n=>n.getExtras().mechanism).map(n=>[n.getExtras().mechanism as string,n]));});
describe('4481 articulated original CAD',()=>{
 it('retracts the complete CAD hood below trench height and restores the exported extended pose',()=>{
  const turret=nodes.get('turret')!,hood=nodes.get('turret-hood')!;
  const height=()=>{let top=-Infinity;turret.traverse(n=>{const matrix=new Matrix4().fromArray(n.getWorldMatrix());for(const p of n.getMesh()?.listPrimitives()??[]){const a=p.getAttribute('POSITION')!;for(let i=0;i<a.getCount();i++)top=Math.max(top,new Vector3(...a.getElement(i,[])).applyMatrix4(matrix).y+.223);}});return top;};
  try {
   expect(height()).toBeLessThan(.56515);
   const angle=-26*Math.PI/180;hood.setRotation([0,0,Math.sin(angle/2),Math.cos(angle/2)]);
   expect(height()).toBeGreaterThan(.59);expect(height()).toBeLessThan(.60);
  }finally{hood.setRotation([0,0,0,1]);}
 });
 it('keeps the hood and complete flywheel under the real offset bearing',()=>{
  const turret=nodes.get('turret')!,hood=nodes.get('turret-hood')!,drum=nodes.get('shooter-drum')!;
  expect(turret.getWorldTranslation()).toEqual(D.shooterGeometry.turretPivot);
  expect(hood.getParentNode()).toBe(turret);expect(drum.getParentNode()).toBe(turret);
  for(let k=0;k<3;k++)expect(drum.getWorldTranslation()[k]).toBeCloseTo(D.shooterGeometry.pivot[k],5);
  expect(drum.listChildren().length).toBeGreaterThan(0);expect(hood.listChildren().length).toBeGreaterThan(0);
  for(let k=0;k<3;k++)expect(nodes.get('indexer-disk')!.getWorldTranslation()[k]).toBeCloseTo(D.hopper.indexer!.center[k],8);
 });
 it('keeps all four actual wheel/fork roots fixed to measured module locations with normalized axles',()=>{
  for(const m of D.modules)for(const suffix of ['wheel','fork']){
   const n=nodes.get(`${m.name}-${suffix}`)!;expect(n.getWorldTranslation()).toEqual([m.x,.0508-.223,m.z]);
   expect(n.getRotation()).toEqual([0,0,0,1]);expect(n.listChildren().length).toBeGreaterThan(0);
   if(suffix==='wheel'){
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];n.traverse(child=>{for(const p of child.getMesh()?.listPrimitives()??[]){const a=p.getAttribute('POSITION')!,l=a.getMinNormalized([]),h=a.getMaxNormalized([]),matrix=new Matrix4().fromArray(child.getWorldMatrix()),origin=new Vector3(...n.getWorldTranslation());for(let i=0;i<8;i++){const q=new Vector3(...l.map((x,k)=>i&(1<<k)?h[k]:x)).applyMatrix4(matrix).sub(origin).toArray();for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],q[k]);hi[k]=Math.max(hi[k],q[k]);}}}});
    expect(hi[2]-lo[2]).toBeLessThan(.07);expect(hi[1]-lo[1]).toBeCloseTo(.1016,2);expect(hi[0]-lo[0]).toBeCloseTo(.1016,2);
   }
  }
 });
});
