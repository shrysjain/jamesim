import { useEffect, useRef, useState } from 'react';
import { FieldViewer } from './view/FieldViewer';
import type { CameraMode, CameraPreset, ViewerOptions, ViewerStats } from './view/FieldViewer';
import type { FieldElement, FieldManifest } from './field/types';
import { CHASSIS, DEFAULT_TUNING, DRIVE_SPAWNS } from './sim/SwerveChassis';
import type { DriveTuning, DriveSpawn } from './sim/SwerveChassis';
import type { DriveFrame } from './sim/driveInput';
import { COLLECTING_POSE, STARTING_POSE } from './robot/RobotDefinition';
import type { RobotPose } from './robot/RobotDefinition';
import { DEFAULT_MATCH } from './sim/MatchRules';
import { INTAKE } from './sim/RobotSimulation';
import type { MatchConfig } from './sim/MatchRules';
import { MatchScoreboard, MatchResults, SessionDialog } from './components/MatchUI';

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    fit: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /><path d="m8 8-5-5m13 5 5-5M8 16l-5 5m13-5 5 5" /></>,
    orbit: <><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)" /><circle cx="12" cy="12" r="3" /><path d="m17 3 3 1-1 3" /></>,
    fly: <><path d="m3 10 18-7-7 18-3-8-8-3Z" /><path d="m11 13 10-10" /></>,
    cube: <><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" /><path d="m3 7 9 5 9-5M12 12v10" /></>,
    reset: <><path d="M3 10a9 9 0 1 1 2 8M3 3v7h7" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    play: <path d="m8 4 13 8-13 8V4Z" />,
    pause: <><path d="M8 4v16M16 4v16" /></>,
    sound: <><path d="m11 4-6 5H2v6h3l6 5V4Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
    muted: <><path d="m11 4-6 5H2v6h3l6 5V4Z" /><path d="m16 9 6 6m-6 0 6-6" /></>,
    down: <path d="m6 9 6 6 6-6" />,
    expand: <><path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6" /></>,
    target: <><circle cx="12" cy="12" r="7" /><path d="M12 2v5m0 10v5M2 12h5m10 0h5" /></>,
    drop: <><path d="M12 2v12m-4-4 4 4 4-4M4 19h16" /><circle cx="12" cy="19" r="2" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.cube}</svg>;
}

const defaultOptions: ViewerOptions = { colliders: false, visuals: true, fuel: true, grid: false, labels: false };
const initialStats: ViewerStats = { fps: 0, drawCalls: 0, triangles: 0, colliders: 0, awake: 0, physicsMs: 0, running: false, robot: null, mechanisms: null, hubs: null, match: null };
const presets: { id: CameraPreset; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'overhead', label: 'Overhead' },
  { id: 'blue', label: 'Blue station' }, { id: 'red', label: 'Red station' },
];

export function App() {
  const viewport = useRef<HTMLDivElement>(null);
  const viewer = useRef<FieldViewer | null>(null);
  const [manifest, setManifest] = useState<FieldManifest | null>(null);
  const [progress, setProgress] = useState('Preparing the field…');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FieldElement | null>(null);
  const [mode, setMode] = useState<CameraMode>('follow');
  const [options, setOptions] = useState({ ...defaultOptions });
  const [stats, setStats] = useState(initialStats);
  const [help, setHelp] = useState(false);
  const [panel, setPanel] = useState(false);
  const [tuning, setTuning] = useState({ ...DEFAULT_TUNING });
  const [robotPose, setRobotPose] = useState<RobotPose>({ ...STARTING_POSE });
  const [driveFrame, setDriveFrame] = useState<DriveFrame>('field');
  const [session, setSession] = useState(false);
  const [matchConfig, setMatchConfig] = useState<MatchConfig>({ ...DEFAULT_MATCH });
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const match = stats.match;
  const isMatch = match?.mode === 'match';
  const showResults = !!match?.complete && !resultsDismissed && !session && !help;

  useEffect(() => {
    if (!viewport.current) return;
    let engine: FieldViewer;
    try {
      engine = new FieldViewer(viewport.current, {
        progress: setProgress, ready: setManifest, selection: setSelected,
        stats: setStats, camera: (_preset, cameraMode) => setMode(cameraMode),
      });
      viewer.current = engine;
      engine.load().catch((cause: unknown) => {
        console.error(cause); setError(cause instanceof Error ? cause.message : 'The field could not be loaded.');
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'WebGL 2 could not be initialized.'); }
    return () => { engine?.dispose(); viewer.current = null; };
  }, []);

  useEffect(() => { viewer.current?.updateOptions(options); }, [options]);
  useEffect(() => { viewer.current?.sim?.robot?.setTuning(tuning); }, [tuning]);
  useEffect(() => { viewer.current?.setDriveFrame(driveFrame); }, [driveFrame]);
  useEffect(() => { viewer.current?.setSoundEnabled(soundEnabled); }, [soundEnabled]);
  useEffect(() => {
    if (viewer.current) { viewer.current.driveEnabled = !help && !session && !showResults; viewer.current.clearInput(); }
  }, [help, session, showResults]);
  useEffect(() => { if (viewer.current) viewer.current.inspectEnabled = panel; }, [panel]);

  const focusCanvas = () => viewer.current?.focusCanvas();
  const cameraMode = (next: CameraMode) => { viewer.current?.setMode(next); setMode(next); focusCanvas(); };
  const running = (next: boolean) => { viewer.current?.setRunning(next); setStats((s) => ({ ...s, running: viewer.current?.sim?.running ?? false })); focusCanvas(); };
  const pause = () => running(!(viewer.current?.sim?.running ?? false));
  const respawn = (spawn: DriveSpawn = 'practice') => { viewer.current?.respawn(spawn); running(true); };
  const togglePanel = () => {
    if (panel) { viewer.current?.resumeMechanisms(); setOptions({ ...defaultOptions }); cameraMode('follow'); }
    setPanel(!panel); focusCanvas();
  };
  const openHelp = () => { running(false); setHelp(true); };
  const closeHelp = () => { setHelp(false); focusCanvas(); };
  const syncSession = () => {
    const sim = viewer.current?.sim; if (!sim) return;
    setStats(s => ({ ...s, running: sim.running, match: sim.match.telemetry, hubs: sim.hubs.telemetry, mechanisms: sim.robotController?.telemetry ?? null }));
  };
  const openSession = () => { running(false); setHelp(false); setSession(true); };
  const startPractice = () => { viewer.current?.startPractice(); setSession(false); setResultsDismissed(false); syncSession(); focusCanvas(); };
  const startMatch = () => { viewer.current?.startMatch({ ...matchConfig, seed: Math.floor(Math.random() * 0x100000000) }); setSession(false); setResultsDismissed(false); syncSession(); focusCanvas(); };
  const restart = () => { if (viewer.current?.sim.match.mode === 'match') { viewer.current.restartMatch(); setResultsDismissed(false); syncSession(); focusCanvas(); } else respawn(); };
  const endMatch = () => { viewer.current?.sim.match.endEarly(); running(true); syncSession(); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.code === 'Escape') { if (session) setSession(false); else if (help) closeHelp(); else if (showResults) setResultsDismissed(true); else running(false); return; }
      if (help || session || showResults) return;
      if (e.key === '?' || e.code === 'KeyH') { e.preventDefault(); openHelp(); }
      if (e.code === 'Backquote') { e.preventDefault(); togglePanel(); }
      if (e.code === 'Enter' && !(e.target as HTMLElement).closest('button')) { e.preventDefault(); pause(); }
      if (!manifest) return;
      if (e.code === 'KeyR' && mode !== 'fly') { e.preventDefault(); restart(); }
      if (e.code === 'KeyV') cameraMode('follow');
      if (panel) {
        if (/^Digit[1-4]$/.test(e.code)) viewer.current?.setPreset(presets[Number(e.code.slice(-1)) - 1].id);
        if (e.code === 'KeyC') setOptions((o) => ({ ...o, colliders: !o.colliders }));
        if (e.code === 'KeyG') setOptions((o) => ({ ...o, grid: !o.grid }));
        if (e.code === 'KeyN') setOptions((o) => ({ ...o, labels: !o.labels }));
        if (e.code === 'KeyF') viewer.current?.focusSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [help, panel, mode, manifest, session, showResults]);

  const robot = stats.robot;
  const mechanisms = stats.mechanisms;
  const shooter = mechanisms?.shooter;
  const hubs = stats.hubs;
  const displayedPose = mechanisms && !mechanisms.preview ? { intake: mechanisms.intake, hopper: mechanisms.hopper, hood: mechanisms.hood } : robotPose;
  const applyPose = (next: RobotPose) => { setRobotPose(next); viewer.current?.setRobotPose(next); };
  const changePose = (key: keyof RobotPose, value: number) => applyPose({ ...displayedPose, [key]: value });

  const changeTuning = (key: keyof DriveTuning, value: number) => setTuning((t) => ({ ...t, [key]: value }));
  const toggle = (key: keyof ViewerOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  return <div className={`app ${panel ? 'with-debug' : ''}`}>
    <div className="game-shell" inert={help || session || showResults}>
      <main className="stage" aria-label="Jamesim REBUILT practice">
        <div ref={viewport} className="viewport" />
        {manifest && <>
          {mode !== 'follow' && <div className="camera-notice"><span>{mode === 'fly' ? 'Free camera · driving disabled' : 'Inspection camera'}</span><button onClick={() => cameraMode('follow')}>Follow robot <kbd>V</kbd></button></div>}
          <div className="drive-readout" aria-label="Robot telemetry">
            <div className="robot-label"><span />2910 RE•BLITZ</div>
            <div className="speed"><strong>{(robot?.speed ?? 0).toFixed(1)}</strong><span>m/s</span></div>
            <div className="drive-state">{stats.running ? (isMatch && !match.driverEnabled ? match.phase : robot && robot.grounded === 0 ? 'Airborne' : driveFrame === 'field' ? 'Field-relative drive' : 'Robot-relative drive') : 'Paused'}<span>{(mechanisms?.mass ?? CHASSIS.mass).toFixed(1)} kg</span></div>
            <div className={`fuel-readout ${mechanisms?.mode === 'Full' ? 'full' : ''}`} aria-label={`${mechanisms?.count ?? 0} of ${mechanisms?.capacity ?? INTAKE.capacity} fuel carried. ${mechanisms?.mode ?? 'Stowed'}`}><i /><strong>{mechanisms?.count ?? 0}<small> / {mechanisms?.capacity ?? INTAKE.capacity}</small></strong><span>FUEL<b>{mechanisms?.mode ?? 'Stowed'}</b></span></div>
            {shooter && (shooter.active || shooter.rpm > 50) && <div className="shooter-readout" aria-label={`Shooter: ${shooter.target ?? 'Coasting'}, ${shooter.mode}, ${Math.round(shooter.rpm)} RPM`}><span>{shooter.target ?? 'Shooter'}</span><strong>{shooter.active ? shooter.mode : 'Coasting'}</strong><small>{Math.round(shooter.rpm).toLocaleString()} rpm</small></div>}
          </div>
          <div className="drive-hints">{mode === 'fly' ? <><span><kbd>WASD</kbd> Fly</span><span><kbd>Q</kbd><kbd>E</kbd> Elevation</span><span>Right-drag to look</span></> : <><span><kbd>WASD</kbd> Move</span><span><kbd>J</kbd><kbd>L</kbd> Turn</span><span><kbd>Shift</kbd> Intake</span><span><kbd>Space</kbd> Aim + shoot</span><span><kbd>Q</kbd> Reverse</span></>}</div>
          {isMatch && stats.running && !match.driverEnabled && !match.complete && <div className="match-notice">Processing final fuel · outputs disabled</div>}
          {!stats.running && robot && !help && !session && !panel && !match?.complete && <div className="pause-shade"><section className="pause-card"><span className="eyebrow">{isMatch ? 'MATCH PAUSED' : 'PRACTICE PAUSED'}</span><h1>Ready when you are.</h1><p>Your robot, fuel, and {isMatch ? 'match clock' : 'practice'} stay in place.</p><button className="primary-button" onClick={() => running(true)}><Icon name="play" size={16} />Resume session <kbd>↵</kbd></button>{isMatch && <button className="end-match" onClick={endMatch}>End match and assess fuel</button>}</section></div>}
        </>}
        {(!manifest || error) && <div className="loading-screen" role={error ? 'alert' : 'status'}><div className="loading-orbit"><Icon name="cube" size={28} /></div><h1>{error ? 'Unable to open the field' : 'Setting up practice'}</h1><p>{error ?? progress}</p>{error && <button className="primary-button" onClick={() => window.location.reload()}>Try again</button>}<span>Jamesim · REBUILT 2026</span></div>}
      </main>
      <header className="play-header">
        <div className="identity"><strong>Jamesim</strong><i /><button className="practice-tag mode-choice" aria-label="Choose game mode" disabled={!manifest} onClick={openSession}><b />{isMatch ? 'Timed match' : 'Practice'} <Icon name="down" size={12} /></button></div>
        {manifest && (isMatch ? <MatchScoreboard match={match} /> : <div className="practice-counter" aria-label={`Practice hits: blue ${hubs?.blue.hits ?? 0}, red ${hubs?.red.hits ?? 0}`}><span>PRACTICE HITS</span><div><b className="blue-hit"><small>BLUE</small>{hubs?.blue.hits ?? 0}</b><i /><b className="red-hit">{hubs?.red.hits ?? 0}<small>RED</small></b></div></div>)}
        <div className="play-actions">
          <button aria-label={soundEnabled ? 'Mute match sounds' : 'Enable match sounds'} aria-pressed={soundEnabled} title="Match sounds" onClick={() => { setSoundEnabled(!soundEnabled); focusCanvas(); }}><Icon name={soundEnabled ? 'sound' : 'muted'} /></button>
          <button aria-label={stats.running ? 'Pause session' : 'Resume session'} title="Pause / resume (Enter)" disabled={!manifest || match?.complete} onClick={pause}><Icon name={stats.running ? 'pause' : 'play'} /></button>
          <button aria-label={isMatch ? 'Restart match' : 'Respawn robot'} title={isMatch ? 'Restart match (R)' : 'Respawn robot (R)'} disabled={!manifest} onClick={restart}><Icon name="reset" /></button>
          {match?.complete && <button aria-label="View match results" onClick={() => setResultsDismissed(false)}><Icon name="target" /></button>}
          <button aria-label="Driving controls" title="Controls (H)" onClick={openHelp}><Icon name="info" /></button>
          <button className={`debug-toggle ${panel ? 'active' : ''}`} aria-label={panel ? 'Close debug panel' : 'Open debug panel'} aria-expanded={panel} title="Debug panel (`)" onClick={togglePanel}><Icon name="cube" /><span>Debug</span><kbd>`</kbd></button>
        </div>
      </header>
      {panel && <aside className="debug-panel" aria-label="Drive testing and debugging">
        <div className="panel-header"><div><span className="eyebrow">DEVELOPMENT</span><h2>Drive testing</h2></div><button aria-label="Close drive testing" onClick={togglePanel}><Icon name="close" /></button></div>
        <div className="panel-scroll">
          <section className="panel-section"><h3>Session rules</h3><p className="section-note">{isMatch ? `${match.phase} · solo fuel match. AUTO and teleop are both driver-operated.` : 'Free practice has no clock or active-hub scoring restrictions.'}</p><div className="button-grid"><button onClick={openSession}>Choose session</button><button disabled={!isMatch || match.complete || match.phase === 'Final scoring'} onClick={endMatch}>End match</button></div>
            {isMatch && <><div className="telemetry-grid"><div><span>Auto fuel, Blue / Red</span><strong>{match.blue.auto}<small> / {match.red.auto}</small></strong></div><div><span>Teleop fuel, Blue / Red</span><strong>{match.blue.teleop}<small> / {match.red.teleop}</small></strong></div><div><span>Inactive, Blue / Red</span><strong>{match.blue.inactive}<small> / {match.red.inactive}</small></strong></div><div><span>Shift 1 inactive</span><strong>{match.firstInactive ?? 'Pending'}</strong></div></div><p className="section-note">{match.selectionReason ?? 'Auto settles before hub order is selected.'} · seed {match.config.seed}. Sensor processing is modeled separately from entry and outlet release. Tower/Traversal, penalties, opponents, and win/tie RP are not assessed.</p></>}
          </section>
          <section className="panel-section"><h3>Drivetrain</h3><div className="segmented" aria-label="Drive frame">{(['field', 'robot'] as const).map((frame) => <button key={frame} className={driveFrame === frame ? 'selected' : ''} aria-pressed={driveFrame === frame} onClick={() => { setDriveFrame(frame); focusCanvas(); }}>{frame === 'field' ? 'Field-relative' : 'Robot-relative'}</button>)}</div><div className="telemetry-grid"><div><span>Speed</span><strong>{(robot?.speed ?? 0).toFixed(2)} <small>m/s</small></strong></div><div><span>Turn rate</span><strong>{((robot?.turnRate ?? 0) * 180 / Math.PI).toFixed(0)} <small>°/s</small></strong></div><div><span>Wheel contact</span><strong>{robot?.grounded ?? 0}<small> / 4</small></strong></div><div><span>Tilt</span><strong>{(robot?.tilt ?? 0).toFixed(1)}<small> °</small></strong></div></div>
            {([
              ['maxSpeed', 'Top speed', 1, 5.5, 0.1, 'm/s'], ['acceleration', 'Wheel acceleration', 2, 12, 0.5, 'm/s²'], ['grip', 'Tire grip', 0.5, 1.6, 0.05, 'μ'],
            ] as const).map(([key, label, min, max, step, unit]) => <label className="tuning-control" key={key}><span>{label}<output>{tuning[key].toFixed(key === 'grip' ? 2 : 1)} {unit}</output></span><input type="range" disabled={isMatch} aria-label={label} min={min} max={max} step={step} value={tuning[key]} onChange={(e) => changeTuning(key, Number(e.target.value))} /></label>)}
            <div className="spec-note">{CHASSIS.mass} kg · {CHASSIS.length} × {CHASSIS.width} m bumpers<br />4 force-limited modules · 120 Hz physics</div><button className="text-button" disabled={isMatch} onClick={() => setTuning({ ...DEFAULT_TUNING })}>Restore driving defaults</button>
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
          <section className="panel-section"><h3>Simulation</h3><div className="button-grid"><button onClick={pause} disabled={!manifest}>{stats.running ? 'Pause' : 'Resume'}</button><button disabled={!manifest || isMatch} onClick={() => { viewer.current?.reset(); setStats((s) => ({ ...s, running: false })); focusCanvas(); }}>Reset world</button></div><button className="secondary-button" disabled={!manifest || isMatch} onClick={() => { viewer.current?.dropProbe(); focusCanvas(); }}>Drop orange test ball</button></section>
          <details className="diagnostics"><summary>Scene diagnostics</summary><dl>{[
            ['Frame rate', `${stats.fps} FPS`], ['Draw calls', stats.drawCalls], ['Triangles', stats.triangles.toLocaleString()], ['Colliders', stats.colliders], ['Awake bodies', stats.awake], ['Physics / frame', `${stats.physicsMs.toFixed(2)} ms`], ['Position X / Z', `${robot?.x.toFixed(2) ?? '—'} / ${robot?.z.toFixed(2) ?? '—'} m`], ['Fuel', `${mechanisms?.loose ?? 0} loose + ${mechanisms?.airborne ?? 0} flying + ${mechanisms?.count ?? 0} held + ${hubs?.inTransit ?? 0} in hubs = ${manifest?.fuel.length ?? 0}`], ['Hub processed', `${hubs?.blue.processed ?? 0} blue / ${hubs?.red.processed ?? 0} red`],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>
        </div><div className="panel-footer">Jamesim · practice and solo fuel matches</div>
      </aside>}
    </div>
    {session && <SessionDialog config={matchConfig} onConfig={setMatchConfig} onMatch={startMatch} onPractice={startPractice} onClose={() => { setSession(false); focusCanvas(); }} />}
    {showResults && match && <MatchResults match={match} onRematch={restart} onPractice={startPractice} onSetup={openSession} onClose={() => { setResultsDismissed(true); focusCanvas(); }} />}
    {help && <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeHelp(); }}><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="modal-close" aria-label="Close controls" onClick={closeHelp} autoFocus><Icon name="close" /></button><span className="eyebrow">JAMESIM · REBUILT PRACTICE</span><h2 id="help-title">Take the wheel.</h2><p>WASD moves across the field. J/L turns the robot independently. The intake faces the neutral zone at spawn. Hold Shift while driving into fuel. Both deploy when the session starts. The hopper stays out. Hold Space to compress the intake while shooting; release Space and it pops back out. Stop moving to fire.</p><dl className="controls-list"><div><dt><kbd>W</kbd><kbd>S</kbd></dt><dd>Forward / reverse</dd></div><div><dt><kbd>A</kbd><kbd>D</kbd></dt><dd>Strafe left / right</dd></div><div><dt><kbd>J</kbd><kbd>L</kbd></dt><dd>Turn left / right</dd></div><div><dt><kbd>Shift</kbd></dt><dd>Hold to run intake rollers</dd></div><div><dt><kbd>Space</kbd></dt><dd>Hold to auto-align and shoot / pass</dd></div><div><dt><kbd>Q</kbd></dt><dd>Hold to reverse and eject</dd></div><div><dt><kbd>R</kbd><kbd>V</kbd></dt><dd>Respawn or restart match / follow camera</dd></div><div><dt><kbd>Enter</kbd><kbd>Esc</kbd></dt><dd>Pause or resume / pause</dd></div><div><dt><kbd>`</kbd><kbd>H</kbd></dt><dd>Debug panel / controls</dd></div></dl><p className="source-note">Arrow keys also translate. Losing focus pauses practice and clears held inputs. Free flight uses the movement keys for the camera; return to Follow to drive.</p><p className="source-note">Team 2910 Re•Blitz CAD on FIRST’s official field. Geometry is fitted to the robot; mass and tire response are provisional. Fuel is tracked individually through intake, storage, and reverse. Hold Space to turn toward the blue hub and shoot. Outside the blue zone, Space aims a pass into it. Release Space to stop feeding. In timed matches, AUTO and teleop are both driver-operated; the phase controls timing and scoring. R restarts the match.</p><a href="https://www.firstinspires.org/resources/library/frc/playing-field" target="_blank" rel="noreferrer">Official field resources ↗</a><button className="primary-button" onClick={() => { closeHelp(); running(true); }}>Start driving</button></section></div>}
  </div>;
}
