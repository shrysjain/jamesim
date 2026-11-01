import { useEffect, useRef } from 'react';
import type { PointerEvent, RefObject } from 'react';
import { readActions } from '../controls';
import type { Controls } from '../controls';
import { driveStart } from '../sim/SessionConfig';
import type { Alliance } from '../field/targets';
import type { RobotDefinition } from '../robot/RobotDefinition';
import type { StartPosition } from '../sim/SessionConfig';
const u = (x: number) => (8.27 - x) / 16.54 * 1000;
const v = (z: number) => (4.05 - z) / 8.1 * 490;
export function FieldMap({ alliance, robot, position, onChange, controls, active, focusRef }: { alliance: Alliance; robot: RobotDefinition; position: StartPosition; onChange: (start: StartPosition) => void; controls: Controls; active: boolean; focusRef: RefObject<SVGSVGElement | null> }) {
  const latest = useRef({ position, onChange, controls, alliance }); latest.current = { position, onChange, controls, alliance };
  useEffect(() => {
    if (!active) return;
    focusRef.current?.focus({ preventScroll: true });
    const keys = new Set<string>(); let frame = 0, before = performance.now();
    const editable = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('input,select,textarea,[contenteditable="true"],[role="dialog"]');
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || editable(e.target)) return;
      const c = latest.current.controls;
      if (['forward','backward','left','right','turnLeft','turnRight'].some(a => c.keys[a as keyof typeof c.keys].includes(e.code))) { keys.add(e.code); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const clear = () => keys.clear();
    const tick = (now: number) => {
      const dt = Math.min(.04, (now-before)/1000); before=now;
      if (editable(document.activeElement)) keys.clear();
      if (keys.size) {
        const { position: p, controls: c, alliance: a, onChange: change }=latest.current, actions=readActions(keys,c);
        const next=driveStart(p,{forward:actions.forward-actions.backward,strafe:actions.right-actions.left,turn:actions.turnLeft-actions.turnRight},a,dt);
        latest.current.position=next;change(next);
      }
      frame=requestAnimationFrame(tick);
    };
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);window.addEventListener('pointerdown',clear);frame=requestAnimationFrame(tick);
    return () => {cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);window.removeEventListener('pointerdown',clear);};
  },[active,focusRef]);
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const matrix = e.currentTarget.getScreenCTM(); if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    onChange({ ...position, x: 8.27 - point.x / 1000 * 16.54, z: 4.05 - point.y / 490 * 8.1 });
  };
  return <svg ref={focusRef} className="field-map" viewBox="-2 -2 1004 494" role="application" aria-label={`Starting position map. ${alliance} alliance. WASD drives; J and L rotate. Arrow points toward the intake. Drag to place.`} tabIndex={0}
    onPointerDown={e => { e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
    onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e); }}
    onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
  >
    <rect width="1000" height="490" fill="#171b24" stroke="#637082" strokeWidth="2" />
    <path d="M0 0H221V490H0Z" fill="#397ef0" opacity={alliance === 'blue' ? '.16' : '.05'} />
    <path d="M779 0H1000V490H779Z" fill="#ef5260" opacity={alliance === 'red' ? '.16' : '.05'} />
    <path d="M500 0V490" stroke="#454c59" strokeDasharray="5 8" />
    {(['blue', 'red'] as const).map(a => { const x = a === 'blue' ? 220 : 780, sign = a === 'blue' ? 1 : -1, color = a === 'blue' ? '#6198ff' : '#fb7280'; return <g key={a} stroke={color} fill={color} fillOpacity=".12" strokeWidth="1.4">
      <path d={`M${x} 0V490`} /><rect x={x-21} y="213" width="42" height="64" /><rect x={x-24} y="78" width="48" height="120" /><rect x={x-24} y="292" width="48" height="120" /><rect x={x-34} y="33" width="68" height="16" /><rect x={x-34} y="441" width="68" height="16" />
      <rect x={a === 'blue' ? 0 : 965} y="210" width="35" height="70" /><path d={`M${a === 'blue' ? 45 : 955} 233h${sign*24}v24h${-sign*24}`} /><text x={a === 'blue' ? 64 : 935} y="26" stroke="none" fill={color} fillOpacity="1" textAnchor="middle" fontSize="13">{a.toUpperCase()}</text>
    </g>; })}
    <rect x={u(6.9)} y={v(3.3)} width={u(5.45)-u(6.9)} height={v(-3.3)-v(3.3)} fill="#95b6ee" opacity={alliance === 'blue' ? '.08' : '0'} />
    <rect x={u(-5.45)} y={v(3.3)} width={u(-6.9)-u(-5.45)} height={v(-3.3)-v(3.3)} fill="#f795a0" opacity={alliance === 'red' ? '.08' : '0'} />
    <g transform={`translate(${u(position.x)},${v(position.z)}) rotate(${-position.yaw*180/Math.PI})`}>
      <rect x="-26" y="-26" width="52" height="52" fill="#e9e7dd" fillOpacity=".16" stroke="#f7dfaa" strokeWidth="2.5" />
      <path d="M39 0L28 -8V8Z" fill="#f7dfaa" />
      <title>{robot.name} · intake points along the arrow</title>
    </g>
  </svg>;
}
