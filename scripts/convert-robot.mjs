/** Offline only. Export source remains intact; mechanism frames survive batching. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { Matrix4, Matrix3, Vector3, Box3, BufferGeometry, BufferAttribute } from 'three';
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const input='assets/source/robots/2910-reblitz/2910-reblitz-collecting.glb', output='public/assets/robots/2910-reblitz';
const source=await readFile(input), io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const original=await io.readBinary(source);
// Simplify shared part meshes before expanding occurrences, avoiding millions of duplicated fasteners.
await original.transform(weld());
for (const mesh of original.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
 if (primitive.getMode() !== 4) continue;
 const position = primitive.getAttribute('POSITION'), indices = primitive.getIndices();
 if (!indices || indices.getCount() < 120) continue;
 const vertices = position.getArray(), remap = MeshoptSimplifier.generatePositionRemap(vertices, 3);
 const welded = new Uint32Array(Array.from(indices.getArray(), i => remap[i]));
 const [reduced] = MeshoptSimplifier.simplify(welded, vertices, 3, Math.floor(welded.length * 0.08 / 3) * 3, 0.0012, ['ErrorAbsolute', 'Prune']);
 indices.setArray(reduced);
 // Smooth normals on the geometric weld; Onshape exports split face vertices.
 const geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(vertices,3)).setIndex(new BufferAttribute(reduced,1));
 geometry.computeVertexNormals(); primitive.getAttribute('NORMAL')?.setArray(geometry.getAttribute('normal').array); geometry.dispose();
}
const doc=new Document(), buffer=doc.createBuffer(), scene=doc.createScene('2910 Re•Blitz');
const offset=0.21665; // source carpet z=-0.00635; runtime body reference is 0.223 m above carpet.
const frame=new Matrix4().set(0,1,0,0, 0,0,1,-offset, 1,0,0,0, 0,0,0,1);
const pos=v=>new Vector3(...v).applyMatrix4(frame).toArray();
const intakePivot=pos([0,-0.27305,0.1698625]), hoodPivot=pos([0,0.282575,0.4699]);
const groups=new Map(), parts=[], measurements=new Map();
const hardware=/screw|\bbolt\b|washer|\bnut\b|rivet|bearing|spacer|standoff|retaining|shaft collar|chain|\bgear\b|pulley|origin cube|tensioner/i;
let removed=0, kept=0, excludedFuel=0;
function group(name,pivot=[0,0,0],basis=0,parent=null){
 if(!groups.has(name))groups.set(name,{name,pivot,basis,parent,batches:new Map(),node:doc.createNode(name).setTranslation(pivot).setExtras({mechanism:name})});
 return groups.get(name);
}
function visit(node,path=[]){
 const name=node.getName(), ancestors=path.map(n=>n.getName()), mesh=node.getMesh();
 if(mesh){
  if (/^Fuel$/i.test(name)) { excludedFuel++; return; }
  const transform=frame.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix())), normal=new Matrix3().getNormalMatrix(transform);
  const bounds=new Box3();
  const isBumper=ancestors.some(n=>/^Bumper Assembly/.test(n)) && /^22-02-04$/.test(name);
  if(hardware.test(name) && name!=='Brass Flywheel with 10T Pulley'){removed++;return;}
  let g=group('chassis');
  if(ancestors.some(n=>/^62 - R2 Hopper/.test(n)))g=group('hopper');
  if(ancestors.some(n=>/^Pivoting Intake/.test(n)))g=group('intake',intakePivot);
  if(ancestors.some(n=>/^32-17 Hood Assembly/.test(n)))g=group('hood',hoodPivot);
  // Retain roller frames now; mechanism logic will drive them in gates 2/3.
  if (ancestors.some(n=>/^2" Roller Assembly/.test(n))) g=group('intake-roller-main',pos([0,-0.6103186,0.160655]),0,'intake');
  if (/^42-02-0[23]$/.test(name)) {
   const upper=transform.elements[12]>-0.46;
   g=group(`intake-roller-${upper?'upper':'lower'}`,upper?[-0.447675,-0.11412646,0]:[-0.48314881,-0.17474,0],0,'intake');
  }
  const hoodRoller=ancestors.find(n=>/^32-06 Hood Roller Assembly/.test(n));
  if(hoodRoller){const first=hoodRoller.includes('<1>');g=group(`hood-roller-${first?1:2}`,pos(first?[0,0.08436,0.50843]:[0,0.08085,0.4607]),0,'hood');}
  const feed=path.find(n=>/^32-03 Single Sprocket Hub Roller Assembly/.test(n.getName()));
  if(feed){
   let silicone=null;feed.traverse(n=>{if(n.getName()==='Silicone')silicone=n;});
   if(silicone){const attr=silicone.getMesh().listPrimitives()[0].getAttribute('POSITION'),c=attr.getMin([]).map((v,i)=>(v+attr.getMax([])[i])/2);
    const v=new Vector3(...c).applyMatrix4(frame.clone().multiply(new Matrix4().fromArray(silicone.getWorldMatrix())));v.z=0;
    g=group(`feeder-roller-${feed.getName().match(/<(\d+)>/)[1]}`,v.toArray());}
  }
  if(name==='Main Drum DKL Grip Tape')g=group('shooter-drum',hoodPivot);
  if(name==='Brass Flywheel with 10T Pulley')g=group('shooter-flywheel',pos([-0.33099375,0.26511249,0.37266022]));
  const wheel=/^SDS MK5 Molded Wheel$/.test(name), fork=/^SDS MK5 Turret Assembly$/.test(name);
  if(wheel||fork){
   const module=path.find(n=>/^SDS MK5n </.test(n.getName()));
   const wheelNode=module.listChildren().flatMap(n=>[n,...n.listChildren()]).find(n=>n.getName()==='SDS MK5 Molded Wheel');
   const wm=frame.clone().multiply(new Matrix4().fromArray(wheelNode.getWorldMatrix()));
   const wa=wheelNode.getMesh().listPrimitives()[0].getAttribute('POSITION');
   const center=wa.getMin([]).map((v,i)=>(v+wa.getMax([])[i])/2), pivot=new Vector3(...center).applyMatrix4(wm).toArray();
   // Wheel's smallest local axis is its axle. Remove exported steering orientation.
   const extent=wa.getMax([]).map((v,i)=>v-wa.getMin([])[i]);const axis=extent.indexOf(Math.min(...extent));
   const axle=new Vector3().setComponent(axis,1).transformDirection(wm), basis=Math.atan2(axle.x,axle.z);
   const id=`module-${pivot[0]>0?'front':'rear'}-${pivot[2]>0?'right':'left'}`;
   group(id,pivot,basis);g=group(`${id}-${wheel?'wheel':'fork'}`,pivot,basis);
  }
  const glass=/^61-01-0[124]$/.test(name), style=isBumper?'bumper':glass?'glass':'metal';
  for(const p of mesh.listPrimitives()){
   if(p.getMode()!==4)continue;
   const a=p.getAttribute('POSITION'),n=p.getAttribute('NORMAL'),idx=p.getIndices();
   const material=p.getMaterial(),color=material?.getBaseColorFactor()??[0.6,0.62,0.64,1];
   const key=style;let batch=g.batches.get(key);
   if(!batch){batch={positions:[],normals:[],colors:[],indices:[]};g.batches.set(key,batch);}
   const base=batch.positions.length/3;
   for(let i=0;i<a.getCount();i++){
    const world=new Vector3().fromArray(a.getElement(i,[])).applyMatrix4(transform);bounds.expandByPoint(world);
    const v=world.clone().sub(new Vector3(...g.pivot)).applyAxisAngle(new Vector3(0,1,0),-g.basis);
    batch.positions.push(...v.toArray());
    const nn=n?new Vector3().fromArray(n.getElement(i,[])).applyMatrix3(normal).normalize():new Vector3(0,1,0);
    nn.applyAxisAngle(new Vector3(0,1,0),-g.basis);batch.normals.push(...nn.toArray());
    const c=isBumper?[0.025,0.13,0.52,1]:color;batch.colors.push(...c.map(x=>Math.round(x*255)));
   }
   for(let i=0;i<(idx?.getCount()??a.getCount());i++)batch.indices.push(base+(idx?idx.getScalar(i):i));
  }
  const size=bounds.getSize(new Vector3()).toArray(),center=bounds.getCenter(new Vector3()).toArray();
  const part={name,path:ancestors.join('/'),group:g.name,min:bounds.min.toArray(),max:bounds.max.toArray(),center,size,triangles:mesh.listPrimitives().filter(p=>p.getMode()===4).reduce((s,p)=>s+(p.getIndices()?.getCount()??0)/3,0)};parts.push(part);kept++;
  if(!measurements.has(g.name))measurements.set(g.name,new Box3());measurements.get(g.name).union(bounds);
 }
 for(const child of node.listChildren())visit(child,[...path,node]);
}
visit(original.getRoot().getDefaultScene().listChildren()[0]);
for(const g of groups.values()){
 if(g.name.match(/^module-(front|rear)-(left|right)$/))continue;
 for(const [style,b] of g.batches){
  const mat=doc.createMaterial(style).setDoubleSided(true).setRoughnessFactor(style==='bumper'?0.95:0.6).setMetallicFactor(style==='metal'?0.3:0);
  if(style==='glass')mat.setAlphaMode('BLEND').setBaseColorFactor([0.65,0.78,0.85,0.22]).setMetallicFactor(0);
  const access=(type,arr,normalized=false)=>doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer).setNormalized(normalized);
  const primitive=doc.createPrimitive().setAttribute('POSITION',access('VEC3',new Float32Array(b.positions))).setAttribute('NORMAL',access('VEC3',new Float32Array(b.normals)))
   .setIndices(access('SCALAR',new Uint32Array(b.indices))).setMaterial(mat);
  if(style!=='glass')primitive.setAttribute('COLOR_0',access('VEC4',new Uint8Array(b.colors),true));
  const node=doc.createNode(`${g.name}-${style}`).setMesh(doc.createMesh().addPrimitive(primitive));g.node.addChild(node);
 }
 if(g.parent){const parent=groups.get(g.parent);g.node.setTranslation(g.pivot.map((v,i)=>v-parent.pivot[i]));parent.node.addChild(g.node);}else scene.addChild(g.node);
}
await doc.transform(weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
await mkdir(output,{recursive:true});const glb=await io.writeBinary(doc);await writeFile(`${output}/robot.glb`,glb);
const bounds=Object.fromEntries([...measurements].map(([key,b])=>[key,{min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new Vector3()).toArray()}]));
const report={source:input,sourceSha256:createHash('sha256').update(source).digest('hex'),sourceBytes:source.length,modelBytes:glb.length,triangles:doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((t,p)=>t+p.getIndices().getCount()/3,0),0),removed,kept,excludedFuel,sourceToRobot:frame.toArray(),bounds,intakePivot,hoodPivot,parts};
await writeFile(`${output}/asset-report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,parts:undefined},null,2));
