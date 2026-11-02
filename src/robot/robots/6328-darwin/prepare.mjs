/** Offline preparation of all five official Darwin exports. Run from repo root.
 * node src/robot/robots/6328-darwin/prepare.mjs [--download]
 * No original CAD or network work occurs in the browser. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, simplify, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { Matrix4, Matrix3, Vector3 } from 'three';
const id='6328-darwin',dir=`assets/source/robots/${id}`,sources=JSON.parse(await readFile(`assets/robots/${id}/sources.json`,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(dir,{recursive:true});
if(process.argv.includes('--download')) for(const f of sources.files){
  const response=await fetch(f.url);if(!response.ok)throw Error(`Download ${f.file}: ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());if(hash(bytes)!==f.sha256)throw Error(`Source integrity: ${f.file}`);await writeFile(`${dir}/${f.file}`,bytes);
}
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('6328 Mechanical Advantage · Darwin');
const groups=new Map(),batches=new Map(),materials=new Map(),rollerCenters=[],report={inputs:{},kept:{},removed:{}};
// Native CAD is Y up, intake +Z. Normalize to intake −X, shooter +X.
const frame=new Matrix4().makeRotationY(-Math.PI/2).setPosition(0,-.223,0);
const pivot=[0,.1855,.317],drum=[0,.48607,-.26392],travel=.30847875377311085,fold=128.408204*Math.PI/180;
const down=new Matrix4().makeTranslation(...pivot).multiply(new Matrix4().makeRotationX(fold)).multiply(new Matrix4().makeTranslation(...pivot.map(v=>-v)));
const point=p=>new Vector3(...p).applyMatrix4(frame).toArray();
function group(name,position=[0,0,0],parent){const n=doc.createNode(name).setTranslation(position).setExtras({mechanism:name});(parent?groups.get(parent):scene).addChild(n);groups.set(name,n);return n;}
group('chassis');group('intake',point(pivot));group('hopper');group('hood',point(drum));group('roof',[0,0,0],'chassis');
function mat(source,name,bumper=false){
  let rgba=[...(source?.getBaseColorFactor()??[.5,.53,.56,1])];
  const glass=/Dynamic Wall|Front Wall$|Vertical Wall$|Roof$|Back Wall$|Ramp Plate$/.test(name)||rgba[3]<.99;
  if(glass)rgba[3]=.22;
  // Merge nearly identical CAD paints before batching, retaining the actual geometry.
  rgba=rgba.map((v,k)=>k===3?v:Math.round(v*20)/20);
  const key=bumper?'bumper':JSON.stringify([rgba,glass]);
  if(!materials.has(key)){const m=doc.createMaterial(bumper?'bumper':`CAD ${key}`).setBaseColorFactor(bumper?[.03,.15,.55,1]:rgba).setMetallicFactor(glass||bumper?0:.35).setRoughnessFactor(glass?.25:bumper?.95:.65).setDoubleSided(true);if(glass)m.setAlphaMode('BLEND');materials.set(key,m);}
  return materials.get(key);
}
function worldBounds(node){let min=[Infinity,Infinity,Infinity],max=min.map(()=>-Infinity);const matrix=new Matrix4().fromArray(node.getWorldMatrix());for(const p of node.getMesh()?.listPrimitives()??[]){const a=p.getAttribute('POSITION');for(let i=0;i<a.getCount();i++){const v=new Vector3(...a.getElement(i,[])).applyMatrix4(matrix);for(let k=0;k<3;k++){min[k]=Math.min(min[k],v.getComponent(k));max[k]=Math.max(max[k],v.getComponent(k));}}}return{min,max,center:min.map((v,k)=>(v+max[k])/2),size:max.map((v,k)=>v-min[k])};}
function append(node,parent,transform,bumper=false){
  const matrix=transform.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix())),nm=new Matrix3().getNormalMatrix(matrix),origin=new Vector3(...groups.get(parent).getWorldTranslation());
  for(const primitive of node.getMesh().listPrimitives()){
    const material=mat(primitive.getMaterial(),node.getName(),bumper),key=`${parent}/${material.getName()}`;
    if(!batches.has(key))batches.set(key,{parent,material,p:[],n:[],indices:[]});const b=batches.get(key);
    const a=primitive.getAttribute('POSITION'),normal=primitive.getAttribute('NORMAL'),base=b.p.length/3;
    for(let i=0;i<a.getCount();i++){b.p.push(...new Vector3(...a.getElement(i,[])).applyMatrix4(matrix).sub(origin).toArray());b.n.push(...new Vector3(...normal.getElement(i,[])).applyMatrix3(nm).normalize().toArray());}
    for(const i of primitive.getIndices()?.getArray()??Array.from({length:a.getCount()},(_,i)=>i))b.indices.push(base+i);
  }
}
function ancestors(n){const out=[];for(let p=n.getParentNode();p;p=p.getParentNode())out.push(p);return out;}
function axle(name,parent,center,transform=frame){if(!groups.has(name)){const p=new Vector3(...center).applyMatrix4(transform).sub(new Vector3(...groups.get(parent).getWorldTranslation()));group(name,p.toArray(),parent);}return name;}
const fastener=/screw|washer|\bnut\b|\bbolt\b|\brivet\b|BHCS|SHCS|FHCS|spacer|bearing|bushing|standoff|^9\d{4}|Housing Template|Simplified MPM|^id\d+$|cable|wire|Zip Tie/i;
for(const file of ['model.glb','model_0.glb','model_1.glb','model_2.glb','model_3.glb']){
  const bytes=await readFile(`${dir}/${file}`);if(hash(bytes)!==sources.files.find(f=>f.file===file).sha256)throw Error(`Source integrity: ${file}`);report.inputs[file]=hash(bytes);
  const source=await io.readBinary(bytes);let kept=0,removed=0;
  for(const node of source.getRoot().listNodes())if(node.getMesh()){
    const name=node.getName(),parents=ancestors(node),b=worldBounds(node);
    if(fastener.test(name)||/^Part [12]$/.test(name)&&parents.some(n=>/BASIC Roller|LIVE Axle/.test(n.getName()))&&Math.max(...b.size)<.06){removed++;continue;}
    let parent='chassis',transform=frame;
    const module=parents.find(n=>/^SDS MK5[ni] </.test(n.getName()));
    if(file==='model.glb'&&module){
      const wheelNode=module.listChildren().find(n=>n.getName()==='SDS MK5 Molded Wheel');if(!wheelNode)throw Error('Missing official module wheel');
      const center=point(worldBounds(wheelNode).center),x=Math.sign(center[0])*.282575,z=Math.sign(center[2])*.269875;
      const prefix=`module-${x>0?'front':'rear'}-${z<0?'left':'right'}`;
      if(!groups.has(`${prefix}-wheel`)){group(`${prefix}-wheel`,[x,.05086-.223,z]);group(`${prefix}-fork`,[x,.05086-.223,z]);}
      if(name==='SDS MK5 Molded Wheel'||name==='SDS MK5 Turret Assembly'){
        parent=`${prefix}-${name.includes('Wheel')?'wheel':'fork'}`;
        const a=wheelNode.getMesh().listPrimitives()[0].getAttribute('POSITION'),lo=a.getMin([]),hi=a.getMax([]),sizes=hi.map((v,k)=>v-lo[k]),short=sizes.indexOf(Math.min(...sizes));
        const axis=new Vector3().setComponent(short,1).transformDirection(frame.clone().multiply(new Matrix4().fromArray(wheelNode.getWorldMatrix()))),angle=Math.atan2(axis.x,axis.z);
        transform=new Matrix4().makeTranslation(...center).multiply(new Matrix4().makeRotationY(-angle)).multiply(new Matrix4().makeTranslation(...center.map(v=>-v))).multiply(frame);
      }else if(!/L Plate|Top Assembly/.test(name)){removed++;continue;}
    }else if(file==='model_0.glb')parent='hood';
    else if(file==='model_1.glb'){
      parent='intake';transform=frame.clone().multiply(down);
      if(parents.some(n=>/^2300 Roller/.test(n.getName()))&&!/Deadaxle/.test(name))parent=axle('intake-roller-0','intake',[0,.43077,.16522],transform);
    }else if(file==='model_2.glb'){parent='hopper';transform=frame.clone().multiply(new Matrix4().makeTranslation(0,0,travel));}
    else if(file==='model_3.glb')parent='roof';
    else if(/3105 Drum|3126 Drum Cap|3130 Drum Center Shaft/.test(name))parent=axle('shooter-drum','chassis',drum);
    else if(/3042\s+Inertia Wheel$/.test(name))parent=axle('shooter-flywheel','chassis',[-.31405,.29717,-.21926]);
    else if(b.size[0]>.4&&Math.max(b.size[1],b.size[2])<.09&&(parents.some(n=>/BASIC Roller|LIVE Axle/.test(n.getName()))||/Launcher Back Roller/.test(name))){
      let i=rollerCenters.findIndex(p=>Math.hypot(p[1]-b.center[1],p[2]-b.center[2])<.003);if(i<0){i=rollerCenters.length;rollerCenters.push([0,b.center[1],b.center[2]]);}parent=axle(`feeder-roller-${i}`,'chassis',rollerCenters[i]);
    }
    const bumper=file==='model.glb'&&name==='Part 5'&&b.size[0]>.8&&b.size[2]>.8;
    append(node,parent,transform,bumper);kept++;
  }
  report.kept[file]=kept;report.removed[file]=removed;
}
for(const name of ['shooter-drum','shooter-flywheel','intake-roller-0'])if(!groups.has(name))throw Error(`Missing moving geometry ${name}`);
const a=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
for(const[key,b]of batches)groups.get(b.parent).addChild(doc.createNode(key).setMesh(doc.createMesh(key).addPrimitive(doc.createPrimitive().setAttribute('POSITION',a('VEC3',new Float32Array(b.p))).setAttribute('NORMAL',a('VEC3',new Float32Array(b.n))).setIndices(a('SCALAR',new Uint32Array(b.indices))).setMaterial(b.material))));
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.30,error:.002,lockBorder:true}),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
let triangles=0,primitives=0;for(const n of doc.getRoot().listNodes())for(const p of n.getMesh()?.listPrimitives()??[]){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;primitives++;}
const bytes=await io.writeBinary(doc);if(bytes.length>6*1024*1024||triangles>650000||primitives>160)throw Error(`Robot budget: ${bytes.length} bytes, ${triangles} triangles, ${primitives} primitives`);
await mkdir(`public/assets/robots/${id}`,{recursive:true});await writeFile(`public/assets/robots/${id}/robot.glb`,bytes);
Object.assign(report,{bytes:bytes.length,triangles,primitives,sha256:hash(bytes),feederAxles:rollerCenters});await writeFile(`${dir}/preparation-report.json`,JSON.stringify(report,null,2)+'\n');
await writeFile(`assets/robots/${id}/runtime.json`,JSON.stringify({schemaVersion:1,robotId:id,group:{name:'Team 6328 Darwin CAD',source:sources.onshape,redistribution:{status:'pending',evidence:[]},files:[{path:`public/assets/robots/${id}/robot.glb`,bytes:bytes.length,sha256:hash(bytes)}]}},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
