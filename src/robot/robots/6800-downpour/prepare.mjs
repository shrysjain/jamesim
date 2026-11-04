/** Offline preparation of the contributor's exact Downpour Onshape export.
 * Run from the repository root with Node26. Source and reports remain ignored. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { Matrix4, Matrix3, Vector3, Box3, BoxGeometry } from 'three';
const sourcePath='assets/source/robots/6800-downpour/VR26A-0000 Main.glb';
const output='public/assets/robots/6800-downpour/robot.glb';
const expected='02d163b47e2c0a828ba832370d32d65d3dd61f065f283ba011ad4e754adbcc46';
const source=await readFile(sourcePath);
if(createHash('sha256').update(source).digest('hex')!==expected)throw Error('Downpour source hash differs from verified contributor export.');
await Promise.all([MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const original=await io.readBinary(source);
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('6800 Valor Downpour');
// Native +Z is intake, Y up, X across. CarpetY0; body reference .223m above carpet.
const frame=new Matrix4().set(0,0,-1,0, 0,1,0,-.223, 1,0,0,0, 0,0,0,1);
const point=v=>new Vector3(...v).applyMatrix4(frame).toArray();
const intakePivot=point([0,.19131,.3032]),hoodPivot=point([0,.47449,-.26035]);
// Exported last hood roller gives a53.1deg tangent. Author a78deg neutral pose;
// gameplay uses an estimated40..78deg subset of the documented80deg total travel.
const hoodCorrection=(78-53.1)*Math.PI/180;
const parts=[],groups=new Map();let removed=0,removedFuel=0;
const hardware=/screw|\bSHCS\b|\bBHCS\b|washer|\bnut\b|rivet|bearing|spacer|standoff|retaining|shaft collar|chain|\bgear\b|pulley|origin cube|tensioner|snapring|snap ring|heat.set|insert|WCP-1741|SplineXS Shaft/i;
function group(id,pivot=[0,0,0],parent=null){
 if(!groups.has(id))groups.set(id,{id,pivot,parent,batches:new Map(),node:doc.createNode(id).setTranslation(pivot).setExtras({mechanism:id})});
 return groups.get(id);
}
group('chassis');group('intake',intakePivot);group('hopper');group('hood',hoodPivot);
const axisY=new Vector3(0,1,0),axisZ=new Vector3(0,0,1);
function add(g,style,vertices,normals,indices,color,basis=0,correction=0){
 let b=g.batches.get(style);if(!b){b={positions:[],normals:[],colors:[],indices:[]};g.batches.set(style,b);}
 const base=b.positions.length/3,origin=new Vector3(...g.pivot);
 for(let i=0;i<vertices.length;i++){
  const p=vertices[i].clone().sub(origin),n=normals[i].clone();
  if(correction){p.applyAxisAngle(axisZ,correction);n.applyAxisAngle(axisZ,correction);}
  if(basis){p.applyAxisAngle(axisY,-basis);n.applyAxisAngle(axisY,-basis);}
  b.positions.push(...p.toArray());b.normals.push(...n.toArray());b.colors.push(...color.map(x=>Math.round(Math.max(0,Math.min(1,x))*255)));
 }
 for(const i of indices)b.indices.push(base+i);
}
function visit(node,path=[]){
 const name=node.getName()||'',ancestors=path.map(n=>n.getName()),mesh=node.getMesh();
 if(mesh){
  if(/fuel|game.?piece|origin cube/i.test(name)){removedFuel+=/fuel|game.?piece/i.test(name)?1:0;removed++;return;}
  const module=name==='Simplified Swerve X2',inIntake=ancestors.some(n=>/^VR26A-5000M Intake/.test(n));
  // Exposed drive pulleys are recognizable hardware, not removable fasteners.
  // Their belt loops and original support plates must remain assembled together.
  const intakeDrive=inIntake&&/^(26t Custom HTD|18t Custom HTD|3DP, Pulley Hub)/.test(name);
  if(hardware.test(name)&&!module&&!/Shooter Hood Gear/.test(name)&&!intakeDrive){removed++;return;}
  const world=new Matrix4().fromArray(node.getWorldMatrix()),transform=frame.clone().multiply(world),normalMatrix=new Matrix3().getNormalMatrix(transform);
  const bounds=new Box3();for(const p of mesh.listPrimitives()){const a=p.getAttribute('POSITION');if(a){const lo=a.getMin([]),hi=a.getMax([]);for(let k=0;k<8;k++)bounds.expandByPoint(new Vector3(...lo.map((v,i)=>k&(1<<i)?hi[i]:v)).applyMatrix4(world));}}
  const c=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3());
  let g=group('chassis'),correction=0;
  if(ancestors.some(n=>/^VR26A-7200F Horizontal/.test(n)))g=group('hopper');
  if(inIntake){
   // Gearboxes, mounts and their low motor remain bolted to the chassis.
   if(c.z>.345||['Side Plate','Left Guard','Right  Guard','Motor Guard','Motor Plate','Churro','Ramp','Inner Vertical Hopper Pin','Outer Vertical Hopper Pin'].includes(name))g=group('intake',intakePivot);
   if(name==='1" Roller'||name==='Wood dowel')g=group(c.y>.2?'intake-crash-bar':'intake-lower-bar',point([0,c.y,c.z]),'intake');
   if(name==='Roller 2'||/^3DP, Pulley Hub/.test(name))g=group('intake-roller-main',point([0,.21824,.59221]),'intake');
   if(/^26t Custom HTD/.test(name))g=group('intake-roller-drive',point([0,.2911,.567]),'intake');
   if(intakeDrive&&g.id==='chassis')g=group('intake-pivot-drive');
   if(['Left Mount','Right Mount','Left Aluminum Plate','Right Aluminum Plate','Pivot Motor Plate','Pivot Small Motor Plate','Chassis Plate'].includes(name))g=group('intake-fixed-mounts');
  }
  if(ancestors.some(n=>/^VR26A-4100E Hotdog Bed/.test(n)) && (size.x>.20&&size.y<.08 || /Thrifty Squish Wheel|Solid Urethane Wheel/.test(name))){
   g=group(`feeder-roller-floor-${c.y.toFixed(4)}-${c.z.toFixed(4)}`,point([0,c.y,c.z]));
  }
  if(ancestors.some(n=>/^VR26A-2000E Shooter/.test(n))){
   if(['Hood Plate','Hood Backing','Hood Reverser Plate','Shooter Hood Gear','Hood Encoder Geat (32 teeth)'].includes(name)){g=group('hood',hoodPivot);correction=hoodCorrection;}
   if(name==='Back Roller'||name==='Milled Roller Hub'||name==="3DP, Basic Hub, 1.25''OD"){
    const upper=c.y>.58;g=group(`hood-roller-${upper?2:1}`,point([0,upper?.60024:.55767,upper?-.09334:-.06855]),'hood');correction=hoodCorrection;
   }
   if((name==='Part 1'||name==='Part 2')&&size.x>.5&&size.y>.04&&size.y<.065){g=group(`feeder-roller-tower-${c.y.toFixed(4)}`,point([0,c.y,c.z]));}
   if(name==='Flywheel')g=group('shooter-drum',hoodPivot);
  }
  const bumper=/^(Small|Large) Bumper$/.test(name),glass=/Horizontal Side Plate|Main Hopper Plate|Back Plate/.test(name)&&ancestors.some(n=>/^VR26A-7/.test(n));
  const protectedCad=g.id==='shooter-drum'||inIntake&&(intakeDrive||['Roller 2','1\" Roller','Wood dowel','Left Mount','Right Mount','Left Aluminum Plate','Right Aluminum Plate','Pivot Motor Plate','Pivot Small Motor Plate','Chassis Plate','Motor Plate'].includes(name))||g.parent==='hood'&&(name==='Back Roller'||name==='Milled Roller Hub'||name==="3DP, Basic Hub, 1.25''OD");
  const style=bumper?'bumper':glass?'glass':protectedCad?(name==='Roller 2'||name==='Back Roller'?'roller-surface':'attached-hardware'):'paint';
  let moduleSpec=null;
  if(module){
   const wheelNative=new Vector3(Math.sign(c.x)*.2794,.0508,Math.sign(c.z)*.2794),pivot=wheelNative.clone().applyMatrix4(frame).toArray();
   const id=`module-${pivot[0]>0?'front':'rear'}-${pivot[2]>0?'right':'left'}`;
   // X2 neutral CAD has45deg steering. Axle (nativeX+Z) transforms to(-X+Z).
   // Occurrence rotation can reverse it; orientation of a cylindrical axle is unsigned.
   const nativeAxle=new Vector3(Math.SQRT1_2,0,Math.SQRT1_2).transformDirection(world);
   const sourceAxle=nativeAxle.clone().transformDirection(frame),basis=Math.atan2(sourceAxle.x,sourceAxle.z);
   moduleSpec={wheelNative,nativeAxle,pivot,id,basis};group(`${id}-wheel`,pivot);group(`${id}-fork`,pivot);
  }
  const part={name,node:node.getName(),path:ancestors.join('/'),group:g.id,min:bounds.min.toArray(),max:bounds.max.toArray(),center:c.toArray(),size:size.toArray()};parts.push(part);
  if(bumper){
   // Preserve each source pad's measured envelope while removing embossed CAD
   // numbers. The shared renderer supplies the only visible team labels.
   const geometry=new BoxGeometry(size.z,size.y,size.x),a=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
   const center=new Vector3(...point(c.toArray())),vertices=[],normals=[];
   for(let i=0;i<a.count;i++){vertices.push(new Vector3(a.getX(i),a.getY(i),a.getZ(i)).add(center));normals.push(new Vector3(n.getX(i),n.getY(i),n.getZ(i)));}
   add(g,'bumper',vertices,normals,Array.from(geometry.index.array),[1,1,1,1]);geometry.dispose();
   part.approximation='Plain padding box at the source foam envelope; original wood and mounts retained.';
  }else for(const primitive of mesh.listPrimitives()){
   if(primitive.getMode()!==4)continue;
   const a=primitive.getAttribute('POSITION'),na=primitive.getAttribute('NORMAL'),ix=primitive.getIndices(),vertices=[],normals=[];
   for(let i=0;i<a.getCount();i++){
    vertices.push(new Vector3(...a.getElement(i,[])).applyMatrix4(transform));
    normals.push(na?new Vector3(...na.getElement(i,[])).applyMatrix3(normalMatrix).normalize():new Vector3(0,1,0));
   }
   const indices=Array.from(ix?.getArray()??Array.from({length:a.getCount()},(_,i)=>i));
   const color=bumper?[1,1,1,1]:(primitive.getMaterial()?.getBaseColorFactor()??[.6,.62,.64,1]);
   if(moduleSpec){
    const {wheelNative,nativeAxle,pivot,id,basis}=moduleSpec,buckets={chassis:[],wheel:[],fork:[]};
    for(let i=0;i<indices.length;i+=3){
     const native=indices.slice(i,i+3).map(k=>vertices[k].clone().applyMatrix4(frame.clone().invert())),center=native.reduce((s,v)=>s.add(v),new Vector3()).multiplyScalar(1/3);
     const deltas=native.map(v=>v.clone().sub(wheelNative)),onWheel=deltas.every(v=>Math.abs(v.dot(nativeAxle))<.029&&v.clone().addScaledVector(nativeAxle,-v.dot(nativeAxle)).length()<.052);
     const fork=center.y<.101&&Math.abs(center.x-wheelNative.x)<.079&&Math.abs(center.z-wheelNative.z)<.079;
     buckets[onWheel?'wheel':fork?'fork':'chassis'].push(...indices.slice(i,i+3));
    }
    for(const [kind,selected] of Object.entries(buckets))if(selected.length){
     const used=[...new Set(selected)],map=new Map(used.map((v,i)=>[v,i]));
     add(kind==='chassis'?group('chassis'):group(`${id}-${kind}`,pivot),style,used.map(i=>vertices[i]),used.map(i=>normals[i]),selected.map(i=>map.get(i)),color,kind==='chassis'?0:basis);
    }
   }else add(g,style,vertices,normals,indices,color,0,correction);
  }
 }
 for(const child of node.listChildren())visit(child,[...path,node]);
}
visit(original.getRoot().getDefaultScene().listChildren()[0]);
// Hood roller origins must rotate with the corrected hood neutral frame.
for(const g of groups.values()){
 if(g.parent==='hood'){
  const before=new Vector3(...g.pivot),after=before.clone().sub(new Vector3(...hoodPivot)).applyAxisAngle(axisZ,hoodCorrection).add(new Vector3(...hoodPivot));
  // add() rotated vertices about each local roller origin, so only move its root here.
  g.pivot=after.toArray();
 }
 for(const [style,b] of g.batches){
  const mat=doc.createMaterial(style).setDoubleSided(true).setRoughnessFactor(style==='bumper'?.95:.62).setMetallicFactor(!['bumper','glass'].includes(style)?.22:0);
  if(style==='bumper')mat.setBaseColorFactor([.025,.13,.52,1]);
  if(style==='glass')mat.setAlphaMode('BLEND').setBaseColorFactor([.65,.78,.85,.24]);
  const acc=(type,arr,normalized=false)=>doc.createAccessor().setType(type).setArray(arr).setNormalized(normalized).setBuffer(buffer);
  const p=doc.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(b.positions))).setAttribute('NORMAL',acc('VEC3',new Float32Array(b.normals))).setIndices(acc('SCALAR',new Uint32Array(b.indices))).setMaterial(mat);
  if(!['bumper','glass'].includes(style))p.setAttribute('COLOR_0',acc('VEC4',new Uint8Array(b.colors),true));
  g.node.addChild(doc.createNode(g.id+'-'+style).setExtras({preservedCad:['roller-surface','attached-hardware'].includes(style)}).setMesh(doc.createMesh(g.id+'-'+style).addPrimitive(p)));
 }
 if(g.parent){const parent=groups.get(g.parent);g.node.setTranslation(g.pivot.map((v,i)=>v-parent.pivot[i]));parent.node.addChild(g.node);}else scene.addChild(g.node);
}
await doc.transform(weld());
let beforeTriangles=0;
for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){
 const a=p.getAttribute('POSITION'),idx=p.getIndices();beforeTriangles+=idx.getCount()/3;
 if(idx.getCount()<120||/roller-surface|attached-hardware/.test(m.getName()))continue;
 const vertices=a.getArray();
 for(let i=0;i<vertices.length;i++)vertices[i]=Math.round(vertices[i]*100000)/100000;
 const remap=MeshoptSimplifier.generatePositionRemap(vertices,3),welded=new Uint32Array(Array.from(idx.getArray(),i=>remap[i]));
 const [reduced]=MeshoptSimplifier.simplify(welded,vertices,3,Math.floor(welded.length*(m.getName().includes('-wheel-')?.65:m.getName().includes('-fork-')?.32:.22)/3)*3,.002,['ErrorAbsolute','Prune','Permissive']);idx.setArray(reduced); console.log('simplify',m.getName(),welded.length/3,'→',reduced.length/3);
}
await doc.transform(weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
const glb=await io.writeBinary(doc);await mkdir('public/assets/robots/6800-downpour',{recursive:true});await writeFile(output,glb);
const triangles=doc.getRoot().listMeshes().reduce((t,m)=>t+m.listPrimitives().reduce((t,p)=>t+p.getIndices().getCount()/3,0),0),primitives=doc.getRoot().listMeshes().reduce((t,m)=>t+m.listPrimitives().length,0);
const report={sourcePath,sourceBytes:source.length,sourceSha256:expected,output,bytes:glb.length,sha256:createHash('sha256').update(glb).digest('hex'),triangles,primitives,beforeTriangles,kept:parts.length,removed,removedFuel,frame:frame.toArray(),intakePivot,hoodPivot,hoodCorrection,parts};
await writeFile('assets/source/robots/6800-downpour/preparation-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,parts:undefined},null,2));
if(glb.length>6*1024*1024||triangles>650000||primitives>160)throw Error('Prepared model exceeds robot budget.');
const manifestPath='assets/robots/6800-downpour/runtime.json',manifest=JSON.parse(await readFile(manifestPath,'utf8'));
manifest.group.files=[{path:output,bytes:glb.length,sha256:report.sha256}];
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
