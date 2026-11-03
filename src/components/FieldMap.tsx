import { useEffect, useRef } from 'react';
import type { PointerEvent, RefObject } from 'react';
import { readActions } from '../controls';
import type { Controls } from '../controls';
import { driveStart } from '../sim/SessionConfig';
import type { Alliance } from '../field/targets';
import type { RobotDefinition } from '../robot/RobotDefinition';
import type { StartPosition } from '../sim/SessionConfig';
import { ALLIANCE_LINE, FIELD_HALF_LENGTH, FIELD_HALF_WIDTH } from '../field/targets';
import { fieldFootprints, START_LINE_WIDTH } from '../field/layout';
const SCALE = 1000 / (2 * FIELD_HALF_LENGTH), HEIGHT = 2 * FIELD_HALF_WIDTH * SCALE;
const u = (x: number) => (FIELD_HALF_LENGTH - x) * SCALE;
const v = (z: number) => (FIELD_HALF_WIDTH - z) * SCALE;
export function FieldMap({ alliance, robot, position, valid, onChange, controls, active, focusRef }: { alliance: Alliance; robot: RobotDefinition; position: StartPosition; valid: boolean; onChange: (start: StartPosition) => void; controls: Controls; active: boolean; focusRef: RefObject<SVGSVGElement | null> }) {
  const latest = useRef({ position, onChange, controls, alliance, robot }); latest.current = { position, onChange, controls, alliance, robot };
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
        const { position: p, controls: c, alliance: a, robot: r, onChange: change }=latest.current, actions=readActions(keys,c);
        const next=driveStart(p,{forward:actions.forward-actions.backward,strafe:actions.right-actions.left,turn:actions.turnLeft-actions.turnRight},a,dt,r);
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
    onChange({ ...position, x: FIELD_HALF_LENGTH - point.x / SCALE, z: FIELD_HALF_WIDTH - point.y / SCALE });
  };
  const halfMarker = Math.max(robot.length, robot.width) * SCALE / 2, markerColor = valid ? '#f7dfaa' : '#ff818c';
  return <svg ref={focusRef} className="field-map" viewBox={`-2 -2 1004 ${HEIGHT+4}`} role="application" aria-label={`Starting position map. ${alliance} alliance. Bumpers must overlap the colored starting line without touching a bump. Dashed trenches are overhead. WASD drives; J and L rotate. Arrow points toward the intake. Drag to place.`} tabIndex={0}
    onPointerDown={e => { e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
    onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e); }}
    onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
  >
    <rect width="1000" height={HEIGHT} fill="#171b24" stroke="#637082" strokeWidth="2" />
    <rect width={u(ALLIANCE_LINE)} height={HEIGHT} fill="#397ef0" opacity={alliance === 'blue' ? '.16' : '.05'} />
    <rect x={u(-ALLIANCE_LINE)} width={1000-u(-ALLIANCE_LINE)} height={HEIGHT} fill="#ef5260" opacity={alliance === 'red' ? '.16' : '.05'} />
    <path d={`M500 0V${HEIGHT}`} stroke="#454c59" strokeDasharray="5 8" />
    {(['blue', 'red'] as const).map(a => {
      const sign = a === 'blue' ? 1 : -1, color = a === 'blue' ? '#6198ff' : '#fb7280';
      const tapeX = a === 'blue' ? ALLIANCE_LINE + START_LINE_WIDTH : -ALLIANCE_LINE;
      return <g key={a} stroke={color} fill={color} fillOpacity=".12" strokeWidth="1.4">
        {fieldFootprints(a).map((f,i) => {
          const x = u(f.maxX), y = v(f.maxZ), w = (f.maxX-f.minX)*SCALE, h = (f.maxZ-f.minZ)*SCALE;
          return <g key={i}>
            <rect x={x} y={y} width={w} height={h} strokeDasharray={f.kind === 'trench' ? '5 4' : undefined} fillOpacity={f.kind === 'trench' ? '.035' : '.12'} />
            {f.kind === 'bump' && <path d={`M${x+w/2} ${y}V${y+h}`} opacity=".6" />}
            <text x={x+w/2} y={y+h/2} stroke="none" fillOpacity="1" textAnchor="middle" dominantBaseline="middle" fontSize={f.kind === 'depot' ? '8' : '10'}>{f.kind.toUpperCase()}</text>
            <title>{a} {f.kind}{f.kind === 'trench' ? ' · overhead arm, 22.25 inch clearance' : ''}</title>
          </g>;
        })}
        <rect x={u(tapeX)} width={START_LINE_WIDTH*SCALE} height={HEIGHT} fillOpacity="1" stroke="none"><title>{a} robot starting line</title></rect>
        <text x={u(sign*6.25)} y="24" stroke="none" fillOpacity="1" textAnchor="middle" fontSize="13">{a.toUpperCase()}</text>
      </g>;
    })}
    <g transform={`translate(${u(position.x)},${v(position.z)}) rotate(${-position.yaw*180/Math.PI})`}>
      <rect x={-halfMarker} y={-halfMarker} width={halfMarker*2} height={halfMarker*2} fill={markerColor} fillOpacity=".16" stroke={markerColor} strokeWidth="2.5" />
      <path d={`M${halfMarker+13} 0L${halfMarker+2} -8V8Z`} fill={markerColor} />
      <title>{robot.name} · intake points along the arrow</title>
    </g>
  </svg>;
}
