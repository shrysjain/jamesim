import { useEffect, useState } from 'react';
import type { FieldViewer, ViewerStats, ViewerOptions, CameraMode, CameraPreset } from '../view/FieldViewer';
import { CHASSIS, DEFAULT_TUNING, DRIVE_SPAWNS } from '../sim/SwerveChassis';
import type { DriveTuning, DriveSpawn } from '../sim/SwerveChassis';
import type { DriveFrame } from '../sim/driveInput';
import { COLLECTING_POSE, STARTING_POSE } from '../robot/RobotDefinition';
import type { RobotPose } from '../robot/RobotDefinition';
import { Icon } from './Icon';
import './debug.css';

const defaultOptions: ViewerOptions = { colliders: false, visuals: true, fuel: true, grid: false, labels: false };
const presets: { id: CameraPreset; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'overhead', label: 'Overhead' },
  { id: 'blue', label: 'Blue station' }, { id: 'red', label: 'Red station' },
];
export default function DebugPanel({ engine, stats, onClose, onRestart, onSync }: {
  engine: FieldViewer; stats: ViewerStats; onClose: () => void; onRestart: () => void; onSync: () => void;
}) {
  const viewer = { current: engine }, manifest = engine.manifest, selected = engine.selected, mode = engine.mode;
  const match = stats.match, isMatch = match?.mode === 'match';
  const robot = stats.robot, mechanisms = stats.mechanisms, shooter = mechanisms?.shooter, hubs = stats.hubs;
  const [options, setOptions] = useState({ ...defaultOptions });
  const chassis = engine.sim.robot?.definition ?? CHASSIS;
  const [tuning, setTuning] = useState(() => ({ ...(engine.sim.robot?.tuning ?? DEFAULT_TUNING) }));
  const [driveFrame, setDriveFrame] = useState<DriveFrame>('field');
  const [robotPose, setRobotPose] = useState<RobotPose>({ ...STARTING_POSE });
  const displayedPose = mechanisms && !mechanisms.preview ? { intake: mechanisms.intake, hopper: mechanisms.hopper, hood: mechanisms.hood } : robotPose;
  const focusCanvas = () => engine.focusCanvas();
  const cameraMode = (next: CameraMode) => { engine.setMode(next); onSync(); focusCanvas(); };
  const applyPose = (next: RobotPose) => { setRobotPose(next); engine.setRobotPose(next); };
  const changePose = (key: keyof RobotPose, value: number) => applyPose({ ...displayedPose, [key]: value });
  const changeTuning = (key: keyof DriveTuning, value: number) => setTuning(t => ({ ...t, [key]: value }));
  const toggle = (key: keyof ViewerOptions) => setOptions(o => ({ ...o, [key]: !o[key] }));
  const togglePanel = onClose;
  const openSession = () => { if (isMatch) engine.startPractice(); else onRestart(); onSync(); focusCanvas(); };
  const endMatch = () => { engine.sim.match.endEarly(); engine.setRunning(true); onSync(); };
  const pause = () => { engine.setRunning(!engine.sim.running); onSync(); focusCanvas(); };
  const respawn = (spawn: DriveSpawn) => { engine.respawn(spawn); engine.setRunning(true); onSync(); focusCanvas(); };
  const setStats = (_: unknown) => onSync();
  useEffect(() => { engine.updateOptions(options); }, [engine, options]);
  useEffect(() => { engine.sim.robot?.setTuning(tuning); }, [engine, tuning]);
  useEffect(() => { engine.setDriveFrame(driveFrame); }, [engine, driveFrame]);
  useEffect(() => {
    engine.inspectEnabled = true;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea, button') || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^Digit[1-4]$/.test(e.code)) engine.setPreset(presets[Number(e.code.slice(-1)) - 1].id);
      if (e.code === 'F6') toggle('colliders');
      if (e.code === 'KeyG') toggle('grid');
      if (e.code === 'KeyN') toggle('labels');
      if (e.code === 'KeyF') engine.focusSelected();
      if (e.code === 'F7') engine.setMode('follow');
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key); engine.inspectEnabled = false;
      engine.resumeMechanisms(); engine.updateOptions(defaultOptions); engine.setMode('follow');
      engine.setDriveFrame('field'); engine.sim.robot?.setTuning({ ...DEFAULT_TUNING, ...engine.sim.robot?.definition.drive });
    };
  }, [engine]);
  return <aside className="debug-panel" aria-label="Drive testing and debugging">
        <div className="panel-header"><div><span className="eyebrow">DEVELOPMENT</span><h2>Drive testing</h2></div><button aria-label="Close drive testing" onClick={togglePanel}><Icon name="close" /></button></div>
        <div className="panel-scroll">
          <section className="panel-section"><h3>Session rules</h3><p className="section-note">{isMatch ? `${match.phase} · solo fuel match. AUTO and teleop are both driver-operated.` : 'Free practice has no clock or active-hub scoring restrictions.'}</p><div className="button-grid"><button onClick={openSession}>{isMatch ? 'Free practice' : 'Timed match'}</button><button disabled={!isMatch || match.complete || match.phase === 'Final scoring'} onClick={endMatch}>End match</button></div>
            {isMatch && <><div className="telemetry-grid"><div><span>Auto fuel, Blue / Red</span><strong>{match.blue.auto}<small> / {match.red.auto}</small></strong></div><div><span>Teleop fuel, Blue / Red</span><strong>{match.blue.teleop}<small> / {match.red.teleop}</small></strong></div><div><span>Inactive, Blue / Red</span><strong>{match.blue.inactive}<small> / {match.red.inactive}</small></strong></div><div><span>Shift 1 inactive</span><strong>{match.firstInactive ?? 'Pending'}</strong></div></div><p className="section-note">{match.selectionReason ?? 'Auto settles before hub order is selected.'} · seed {match.config.seed}. Sensor processing is modeled separately from entry and outlet release. Tower/Traversal, penalties, opponents, and win/tie RP are not assessed.</p></>}
          </section>
          <section className="panel-section"><h3>Drivetrain</h3><div className="segmented" aria-label="Drive frame">{(['field', 'robot'] as const).map((frame) => <button key={frame} className={driveFrame === frame ? 'selected' : ''} aria-pressed={driveFrame === frame} onClick={() => { setDriveFrame(frame); focusCanvas(); }}>{frame === 'field' ? 'Field-relative' : 'Robot-relative'}</button>)}</div><div className="telemetry-grid"><div><span>Speed</span><strong>{(robot?.speed ?? 0).toFixed(2)} <small>m/s</small></strong></div><div><span>Turn rate</span><strong>{((robot?.turnRate ?? 0) * 180 / Math.PI).toFixed(0)} <small>°/s</small></strong></div><div><span>Wheel contact</span><strong>{robot?.grounded ?? 0}<small> / 4</small></strong></div><div><span>Tilt</span><strong>{(robot?.tilt ?? 0).toFixed(1)}<small> °</small></strong></div></div>
            {([
              ['maxSpeed', 'Top speed', 1, 5.5, 0.1, 'm/s'], ['acceleration', 'Wheel acceleration', 2, 12, 0.5, 'm/s²'], ['grip', 'Tire grip', 0.5, 1.6, 0.05, 'μ'],
            ] as const).map(([key, label, min, max, step, unit]) => <label className="tuning-control" key={key}><span>{label}<output>{tuning[key].toFixed(key === 'grip' ? 2 : 1)} {unit}</output></span><input type="range" disabled={isMatch} aria-label={label} min={min} max={max} step={step} value={tuning[key]} onChange={(e) => changeTuning(key, Number(e.target.value))} /></label>)}
            <div className="spec-note">{chassis.mass} kg · {chassis.length} × {chassis.width} m bumpers<br />4 force-limited modules · 120 Hz physics</div><button className="text-button" disabled={isMatch} onClick={() => setTuning({ ...DEFAULT_TUNING, ...engine.sim.robot?.definition.drive })}>Restore driving defaults</button>
          </section>
          <section className="panel-section"><h3>Robot assembly</h3><p className="section-note">Both assemblies deploy at the start. The hopper stays out; Space compresses only the intake. Shift runs intake rollers; Q reverses. Intake is at −X; the shooter is at +X.</p><div className="button-grid"><button disabled={isMatch} onClick={() => applyPose({ intake: 0, hopper: 0, hood: 0 })}>Starting pose</button><button disabled={isMatch} onClick={() => applyPose({ ...COLLECTING_POSE })}>Collecting pose</button></div>
            {([['intake', 'Intake deployment'], ['hopper', 'Hopper deployment'], ['hood', 'Hood position']] as const).map(([key, label]) => <label className="tuning-control" key={key}><span>{label}<output>{Math.round(displayedPose[key] * 100)}%</output></span><input type="range" disabled={isMatch} aria-label={label} min={0} max={1} step={0.01} value={displayedPose[key]} onChange={e => changePose(key, Number(e.target.value))} /></label>)}
            <p className="section-note">Pose preview suspends mechanisms. Press Shift/Q/Space, Resume mechanisms, or close Debug to return to driving. Capacity is 55 fuel in a managed packing layout.</p>
            {mechanisms?.preview && <button className="secondary-button" onClick={() => { viewer.current?.resumeMechanisms(); focusCanvas(); }}>Resume mechanisms</button>}
            <div className="telemetry-grid"><div><span>Stored / transferring</span><strong>{mechanisms?.stored ?? 0}<small> / {mechanisms?.transferring ?? 0}</small></strong></div><div><span>Loose / total fuel</span><strong>{mechanisms?.loose ?? 0}<small> / {manifest?.fuel.length ?? 0}</small></strong></div></div>
          </section>
          <section className="panel-section"><h3>Shooter bench</h3><p className="section-note">Hold Space to align the chassis and shoot at the blue hub, or pass to the nearest reachable point inside the blue zone. WASD remains available. Q overrides shooting. Launches and confirmed hub entries are counted separately.</p>
            <div className="telemetry-grid"><div><span>Target / readiness</span><strong>{shooter?.target ?? '—'}<small> · {shooter?.mode ?? 'Idle'}</small></strong></div><div><span>Flywheel / requested</span><strong>{Math.round(shooter?.rpm ?? 0)}<small> / {Math.round(shooter?.targetRpm ?? 0)} rpm</small></strong></div><div><span>Exit elevation / aim error</span><strong>{(shooter?.elevation ?? 75).toFixed(1)}°<small> / {(shooter?.yawError ?? 0).toFixed(1)}°</small></strong></div><div><span>Launches / in flight</span><strong>{shooter?.shots ?? 0}<small> / {mechanisms?.airborne ?? 0}</small></strong></div></div>
            <div className="shooter-lanes" aria-label="Four shooter feed lanes">{(shooter?.lanes ?? [0, 0, 0, 0]).map((progress, i) => <div key={i} className={progress > 0 ? 'occupied' : ''}><span>Lane {i + 1}</span><meter min={0} max={1} value={progress} aria-label={`Lane ${i + 1} feed progress`} /></div>)}</div>
            <p className="section-note">37° hood travel and four lanes follow team references. Exit-angle mapping, flywheel response, and fuel drag are initial simulator fits. Release timing and small shot variation are seeded. Stop moving to fire.</p>
          </section>
          <section className="panel-section"><h3>Hub practice loop</h3><p className="section-note">Downward entries through the hexagonal mouths count as practice hits. The same balls return through four neutral-facing outlets. Blocked outlets retain their queued fuel. These counters do not apply active/inactive hub or match rules.</p>
            <div className="telemetry-grid">{(['blue', 'red'] as const).map(alliance => <div key={alliance}><span>{alliance === 'blue' ? 'Blue' : 'Red'} hits / returned</span><strong>{hubs?.[alliance].hits ?? 0}<small> / {hubs?.[alliance].returned ?? 0}</small></strong></div>)}<div><span>In hub transit</span><strong>{hubs?.inTransit ?? 0}</strong></div><div><span>Blocked outlets</span><strong>{(hubs?.blue.blocked ?? 0) + (hubs?.red.blocked ?? 0)}<small> / 8</small></strong></div></div>
            <p className="section-note">In practice, R retains hits and balls. In timed matches, R restarts the entire match. Collider view outlines each entry gate and outlet path.</p>
          </section>
          <section className="panel-section"><h3>Test locations</h3><div className="button-grid">{Object.entries(DRIVE_SPAWNS).map(([id, spawn]) => <button key={id} disabled={!manifest || isMatch} onClick={() => respawn(id as DriveSpawn)}>{spawn.label}</button>)}</div><p className="section-note">Repositions the robot; fuel stays where it is. Use Reset world for a fresh setup.</p></section>
          <section className="panel-section"><h3>Camera</h3><div className="segmented">{(['follow', 'orbit', 'fly'] as const).map((m) => <button key={m} aria-pressed={mode === m} className={mode === m ? 'selected' : ''} onClick={() => cameraMode(m)}>{m === 'follow' ? 'Follow' : m === 'orbit' ? 'Orbit' : 'Free flight'}</button>)}</div><div className="button-grid">{presets.map((p, i) => <button key={p.id} disabled={!manifest} onClick={() => { viewer.current?.setPreset(p.id); focusCanvas(); }}>{p.label}<kbd>{i + 1}</kbd></button>)}</div><p className="section-note">Orbit: drag / right-drag / scroll. Free flight: WASD, Q/E, right-drag. <kbd>V</kbd> returns to your robot.</p></section>
          <section className="panel-section"><h3>Inspection layers</h3>{([
            ['visuals', 'Field model', null], ['fuel', 'Fuel', null], ['colliders', 'Colliders + tire forces', 'C'], ['grid', 'Measurement grid', 'G'], ['labels', 'Element labels', 'N'],
          ] as const).map(([key, label, shortcut]) => <label className="toggle-row" key={key}><span>{label}{shortcut && <kbd>{shortcut}</kbd>}</span><input type="checkbox" checked={options[key]} onChange={() => toggle(key)} /></label>)}
            <select aria-label="Field element" value={selected?.id ?? ''} onChange={(e) => viewer.current?.select(manifest?.elements.find((element) => element.id === e.target.value) ?? null)}><option value="">Full field</option>{manifest?.elements.filter((e) => e.kind !== 'carpet' && e.kind !== 'markings').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            {selected && <p className="spec-note">X / Y / Z bounds: {selected.bounds.max.map((v, i) => (v - selected.bounds.min[i]).toFixed(2)).join(' / ')} m</p>}
            <button className="secondary-button" disabled={!manifest} onClick={() => { viewer.current?.focusSelected(); focusCanvas(); }}>Focus {selected ? 'element' : 'field'} <kbd>F</kbd></button>
          </section>
          <section className="panel-section"><h3>Simulation</h3><div className="button-grid"><button onClick={pause} disabled={!manifest}>{stats.running ? 'Pause' : 'Resume'}</button><button disabled={!manifest || isMatch} onClick={() => { viewer.current?.reset(); setStats(null); focusCanvas(); }}>Reset world</button></div><button className="secondary-button" disabled={!manifest || isMatch} onClick={() => { viewer.current?.dropProbe(); focusCanvas(); }}>Drop orange test ball</button></section>
          <details className="diagnostics"><summary>Scene diagnostics</summary><dl>{[
            ['Frame rate', `${stats.fps} FPS`], ['Draw calls', stats.drawCalls], ['Triangles', stats.triangles.toLocaleString()], ['Colliders', stats.colliders], ['Awake bodies', stats.awake], ['Physics / frame', `${stats.physicsMs.toFixed(2)} ms`], ['Position X / Z', `${robot?.x.toFixed(2) ?? '—'} / ${robot?.z.toFixed(2) ?? '—'} m`], ['Fuel', `${mechanisms?.loose ?? 0} loose + ${mechanisms?.airborne ?? 0} flying + ${mechanisms?.count ?? 0} held + ${hubs?.inTransit ?? 0} in hubs = ${manifest?.fuel.length ?? 0}`], ['Hub processed', `${hubs?.blue.processed ?? 0} blue / ${hubs?.red.processed ?? 0} red`],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>
        </div><div className="panel-footer">Jamesim · practice and solo fuel matches</div>
      </aside>;
}
