import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { RobotDefinition } from '../robot/RobotDefinition';
import type { Alliance } from '../field/targets';
import { RobotView } from '../view/RobotView';
export default function RobotPreview({ robot, alliance }: { robot: RobotDefinition; alliance: Alliance }) {
  const host = useRef<HTMLDivElement>(null), preview = useRef<{ view: RobotView; draw: () => void } | null>(null);
  const selected = useRef({ robot, alliance }); selected.current = { robot, alliance };
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setError(true); return; }
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35,1,.02,25), view = new RobotView();
    let disposed = false;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.current.append(renderer.domElement); renderer.domElement.setAttribute('aria-label','Robot inspection preview');
    scene.add(new THREE.HemisphereLight(0xd8eaff,0x31323d,2.4));
    const sun = new THREE.DirectionalLight(0xffeed1,3); sun.position.set(2,5,3); scene.add(sun);
    const rim = new THREE.DirectionalLight(0xa2bfff,2); rim.position.set(-3,1,-2); scene.add(rim); scene.add(view.group);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.75,.755,80), new THREE.MeshBasicMaterial({color:0x586071, side:THREE.DoubleSide})); ring.rotation.x = -Math.PI/2; ring.position.y = -.003; scene.add(ring);
    camera.position.set(-1.5,1.15,1.7); camera.zoom=1.2; camera.updateProjectionMatrix();
    const controls = new OrbitControls(camera,renderer.domElement); controls.target.set(-.05,.23,0); controls.enablePan = false; controls.minDistance=1.6; controls.maxDistance=4; controls.maxPolarAngle=Math.PI*.48; controls.update();
    const draw = () => { if (!disposed) renderer.render(scene,camera); };
    const resize = () => { if (!host.current) return; const {clientWidth:w,clientHeight:h}=host.current; if(!w||!h)return; renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();draw(); };
    controls.addEventListener('change',draw); const observer = new ResizeObserver(resize); observer.observe(host.current); resize();
    void view.load().then(() => { if(disposed)return; view.preview(selected.current.robot,selected.current.alliance); preview.current={view,draw};draw(); }).catch(() => {if(!disposed)setError(true);});
    return () => { disposed=true;preview.current=null;observer.disconnect();controls.dispose();view.dispose();ring.geometry.dispose();(ring.material as THREE.Material).dispose();renderer.dispose();renderer.domElement.remove(); };
  },[]);
  useEffect(() => { if(preview.current){preview.current.view.preview(robot,alliance);preview.current.draw();} },[robot,alliance]);
  return <div ref={host} className="preview-canvas">{error && <p>3D preview unavailable. You can still choose a robot below.</p>}</div>;
}
