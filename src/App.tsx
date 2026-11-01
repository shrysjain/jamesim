import { ControlsHint } from './components/ControlsHint';
import { SessionDialog } from './components/SessionDialog';
import { ACTIONS, ACTION_LABELS, keyLabel } from './controls';
import { ROBOTS } from './robot/RobotDefinition';
import { DEFAULT_MATCH } from './sim/MatchRules';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FieldViewer, ViewerStats } from './view/FieldViewer';
import type { FieldManifest } from './field/types';
import { MatchScoreboard, MatchResults } from './components/MatchUI';
import { Icon } from './components/Icon';
import { Dialog } from './components/Dialog';
import { SettingsDialog } from './components/SettingsDialog';
import { readSettings, saveSettings } from './settings';

const DebugPanel = import.meta.env.DEV ? lazy(() => import('./components/DebugPanel')) : null;
const initialStats: ViewerStats = { fps: 0, drawCalls: 0, triangles: 0, colliders: 0, awake: 0, physicsMs: 0, running: false, humanPlayer: null, robot: null, mechanisms: null, hubs: null, match: null };
type Modal = 'settings' | 'help' | 'about' | 'session' | 'referee' | null;

export function App() {
  const viewport = useRef<HTMLDivElement>(null), viewer = useRef<FieldViewer | null>(null);
  const [manifest, setManifest] = useState<FieldManifest | null>(null);
  const [progress, setProgress] = useState('Loading the renderer and physics…');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState(initialStats);
  const [settings, setSettings] = useState(readSettings);
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const [modal, setModal] = useState<Modal>(null), modalRef = useRef<Modal>(null);
  const resumeAfterModal = useRef(false);
  const [panel, setPanel] = useState(false);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const [cameraMode, setCameraMode] = useState('follow');
  const [unsupported] = useState(() => matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);
  const match = stats.match;
  const showResults = !!match?.complete && !resultsDismissed && !modal && !error;
  const blocked = !!modal || showResults || !!error;
  const activeRobot = ROBOTS[match?.config.robot ?? '2910-reblitz'];
  const sessionName = match?.mode === 'practice' ? 'practice' : 'match';
  const restartLabel = settings.controls.keys.restart.map(keyLabel).join(' / ');

  useEffect(() => {
    if (!viewport.current || unsupported) return;
    let engine: FieldViewer | undefined, cancelled = false;
    void (async () => {
      const { FieldViewer } = await import('./view/FieldViewer');
      if (cancelled) return;
      engine = new FieldViewer(viewport.current!, {
        progress: message => { if (!cancelled) setProgress(message); },
        ready: field => { if (!cancelled) setManifest(field); },
        selection: () => {}, stats: next => { if (!cancelled) setStats(next); },
        camera: (_preset, mode) => setCameraMode(mode),
        focusLost: () => { resumeAfterModal.current = false; },
        error: message => { if (!cancelled) setError(message); },
      });
      viewer.current = engine;
      engine.applySettings(settingsRef.current);
      await engine.load();
    })().catch((cause: unknown) => {
      if (!cancelled) { console.error(cause); setError(cause instanceof Error ? cause.message : 'The game could not be loaded.'); }
    });
    return () => { cancelled = true; engine?.dispose(); viewer.current = null; };
  }, [unsupported]);
  useEffect(() => { saveSettings(settings); viewer.current?.applySettings(settings); }, [settings]);
  useEffect(() => { if (viewer.current) { viewer.current.driveEnabled = !modal && !error; viewer.current.clearInput(); } }, [modal, error]);

  const focus = () => viewer.current?.focusCanvas();
  const sync = () => { const engine = viewer.current; if (engine?.sim) setStats(engine.snapshot()); };
  const setRunning = (running: boolean) => { viewer.current?.setRunning(running); sync(); focus(); };
  const togglePause = () => setRunning(!viewer.current?.sim?.running);
  const openModal = (next: Modal) => {
    if (!modalRef.current) resumeAfterModal.current = viewer.current?.sim?.running ?? false;
    viewer.current?.setRunning(false); if (viewer.current) viewer.current.driveEnabled = false;
    modalRef.current = next; setModal(next); sync();
  };
  const closeModal = () => {
    modalRef.current = null; setModal(null);
    if (viewer.current) viewer.current.driveEnabled = !error;
    const resume = resumeAfterModal.current && !document.hidden && document.hasFocus();
    resumeAfterModal.current = false;
    if (resume) viewer.current?.setRunning(true);
    sync(); focus();
  };
  const restart = () => {
    if (!viewer.current?.sim || error) return;
    setPanel(false); setResultsDismissed(false);
    modalRef.current = null; setModal(null); resumeAfterModal.current = false;
    viewer.current.driveEnabled = true; viewer.current.restartMatch(); sync(); focus();
  };
  const togglePanel = () => { setPanel(p => !p); focus(); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        if (modalRef.current) closeModal();
        else if (panel) setPanel(false);
        else if (showResults) { setResultsDismissed(true); focus(); }
        else setRunning(false);
        return;
      }
      if (target.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (modalRef.current) return;
      // Results are a valid restart context; handle R before other modal locks.
      if (settingsRef.current.controls.keys.restart.includes(e.code) && manifest) { e.preventDefault(); restart(); return; }
      if (showResults || error || !manifest) return;
      if (e.code === 'KeyH' || (e.key === '?' && !Object.values(settingsRef.current.controls.keys).some(keys => keys.includes('Slash')))) { e.preventDefault(); openModal('help'); }
      if ((e.code === 'Enter' || settingsRef.current.controls.keys.pause.includes(e.code)) && !target.closest('button') && manifest) { e.preventDefault(); togglePause(); }
      if (import.meta.env.DEV && e.code === 'Backquote' && manifest) { e.preventDefault(); togglePanel(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [manifest, showResults, panel, error]);

  const fuel = stats.mechanisms, shooter = fuel?.shooter;
  const fuelStatus = fuel?.mode ?? 'Holding';
  return <div className={`app ${panel ? 'with-debug' : ''}`}>
    <div className="game-shell" inert={!!modal || showResults}>
      <main className="stage" aria-label="Jamesim solo fuel match">
        <div ref={viewport} className="viewport" />
        {manifest && <>
          <div className="player-hud">
            <div className="inventory-hud" aria-label="Robot fuel and status">
              <div className="robot-label"><span />{activeRobot.name}</div>
              <div className={`fuel-readout ${fuelStatus === 'Full' ? 'full' : ''}`} aria-label={`${fuel?.count ?? 0} of ${fuel?.capacity ?? 55} fuel. ${fuelStatus}`}><i /><strong>{fuel?.count ?? 0}<small> / {fuel?.capacity ?? 55}</small></strong><span>FUEL<b>{fuelStatus}</b></span></div>
              {activeRobot.intake.stowTravel && <div className="shooter-readout" aria-label="Intake extension"><span>Intake</span><strong>{fuel?.intakeStatus ?? 'Retracted'}</strong></div>}
              {activeRobot.mechanisms.climb && <div className="shooter-readout" aria-label="Climber status"><span>Climber</span><strong>{fuel?.climb.status ?? 'Approach your own tower'}</strong></div>}
              {match?.config.humanSupply && <div className="shooter-readout" aria-label="Outpost supply"><span>Outpost · {match.config.alliance ?? 'blue'}</span><strong>{stats.humanPlayer?.[match.config.alliance ?? 'blue'] ?? 0} fuel{stats.humanPlayer?.blocked ? ' · outlet blocked' : ''}</strong></div>}
              {shooter?.active && <div className="shooter-readout" aria-label={`Shooter: ${shooter.mode}`}><span>{shooter.target ?? 'Shooter'}</span><strong>{shooter.mode}</strong></div>}
            </div>
            <ControlsHint controls={settings.controls} expanded={settings.showHints} robot={activeRobot} humanSupply={!!match?.config.humanSupply} onExpand={() => { setSettings(s => ({ ...s, showHints: !s.showHints })); focus(); }} />
          </div>
          {fuel?.climb.attached && <div className="match-notice">Tower attached · level {fuel.climb.level} · release climb to hold, lower to descend</div>}
          {import.meta.env.DEV && cameraMode !== 'follow' && <div className="camera-notice"><span>Inspection camera</span><button onClick={() => { viewer.current?.setMode('follow'); focus(); }}>Follow robot</button></div>}
          {match?.mode === 'match' && stats.running && !match.driverEnabled && !match.complete && <div className="match-notice">Processing final fuel · driving resumes with the next period</div>}
          {!stats.running && !blocked && !panel && !match?.complete && <div className="pause-shade"><section className="pause-card"><span className="eyebrow">{sessionName.toUpperCase()} PAUSED</span><h1>Ready when you are.</h1><p>Your robot, fuel and session stay in place.</p><button className="primary-button" onClick={() => setRunning(true)}><Icon name="play" size={16} />Resume {sessionName} <kbd>↵</kbd></button><button className="end-match" onClick={restart}>Restart {sessionName} <kbd>{settings.controls.keys.restart.map(keyLabel).join(' / ')}</kbd></button></section></div>}
        </>}
        {(!manifest || error || unsupported) && <div className="loading-screen" role={error ? 'alert' : 'status'}>
          <div className="loading-orbit"><Icon name="cube" size={28} /></div>
          <h1>{unsupported ? 'Bring your keyboard.' : error ? 'Unable to open Jamesim' : 'Getting the field ready'}</h1>
          <p>{unsupported ? 'Jamesim v1 needs a desktop browser and keyboard. Open this page on a computer to play.' : error ?? progress}</p>
          {!error && !unsupported && <div className="loading-progress" role="progressbar" aria-label="Loading game" aria-valuetext={progress} />}
          {error && <button className="primary-button" onClick={() => location.reload()}>Try again</button>}
          <span>Jamesim · REBUILT 2026</span>
        </div>}
      </main>
      {!error && !unsupported && <header className="play-header">
        <div className="identity"><strong>Jamesim</strong><i /><span className="practice-tag"><b />{match?.mode === 'practice' ? 'Free practice' : 'Solo match'}</span></div>
        {manifest && match?.mode === 'match' && <MatchScoreboard match={match} />}
        <div className="play-actions">
          <button aria-label={settings.muted ? 'Enable match sounds' : 'Mute match sounds'} aria-pressed={!settings.muted} title="Match sounds" onClick={() => { setSettings(s => ({ ...s, muted: !s.muted })); focus(); }}><Icon name={settings.muted ? 'muted' : 'sound'} /></button>
          <button aria-label={`${stats.running ? 'Pause' : 'Resume'} ${sessionName}`} title="Pause / resume (Enter)" disabled={!manifest || match?.complete} onClick={togglePause}><Icon name={stats.running ? 'pause' : 'play'} /></button>
          <button aria-label={`Restart ${sessionName}`} title={`Restart ${sessionName} (${restartLabel})`} disabled={!manifest} onClick={restart}><Icon name="reset" /></button>
          {match?.complete && <button aria-label="View match results" onClick={() => setResultsDismissed(false)}><Icon name="target" /></button>}
          <button aria-label="Driving controls" title="Controls (H)" disabled={!manifest} onClick={() => openModal('help')}><Icon name="info" /></button>
          <button disabled={!manifest} onClick={() => openModal('session')}>Session</button>
          <button disabled={!manifest || match?.mode !== 'match' || !match.driverEnabled} onClick={() => openModal('referee')}>Assess foul</button>
          <button aria-label="Settings" title="Settings" disabled={!manifest} onClick={() => openModal('settings')}><Icon name="settings" /></button>
          {import.meta.env.DEV && <button className="debug-toggle" aria-label={panel ? 'Close debug panel' : 'Open debug panel'} aria-expanded={panel} disabled={!manifest} onClick={togglePanel}><Icon name="cube" /><span>Debug</span><kbd>`</kbd></button>}
        </div>
      </header>}
      {import.meta.env.DEV && panel && DebugPanel && viewer.current && <Suspense fallback={null}><DebugPanel engine={viewer.current} stats={stats} onClose={togglePanel} onRestart={restart} onSync={sync} /></Suspense>}
    </div>
    {showResults && match && <MatchResults match={match} onRematch={restart} onClose={() => { setResultsDismissed(true); focus(); }} restartLabel={settings.controls.keys.restart.map(keyLabel).join(' / ')} />}
    {modal === 'session' && <SessionDialog config={match?.config ?? DEFAULT_MATCH} mode={match?.mode ?? 'match'} onClose={closeModal} onStart={(config, practice) => { viewer.current?.startSession(config, practice); resumeAfterModal.current = false; setResultsDismissed(false); closeModal(); }} />}
    {modal === 'referee' && <Dialog title="Assess a foul" eyebrow="MANUAL REFEREE ASSESSMENT" onClose={closeModal}>
      <p role="status">Penalty points awarded: Blue {match?.blue.penalties ?? 0} · Red {match?.red.penalties ?? 0}</p>
      <p>Intent and human conduct require referee judgment. Add a minor (5) or major (15) foul to the offending alliance; points go to its opponent.</p>
      {(['blue', 'red'] as const).map(alliance => <div className="setting-row" key={alliance}><span>{alliance} committed</span>{[false, true].map(major => <button key={String(major)} onClick={() => { viewer.current?.sim.match.recordPenalty(alliance, major); sync(); }}>{major ? 'Major · 15' : 'Minor · 5'}</button>)}</div>)}
      <button className="primary-button" onClick={closeModal}>Done</button>
    </Dialog>}
    {modal === 'settings' && <SettingsDialog settings={settings} onChange={setSettings} onClose={closeModal} onAbout={() => openModal('about')} />}
    {modal === 'help' && <Dialog title="Take the wheel." eyebrow="JAMESIM · CONTROLS" onClose={closeModal}>
      <p>You drive during AUTO and teleop. Use your mapped intake and shoot actions to collect fuel and aim at your alliance hub, or pass back into your zone. Re•Blitz must stop to fire; High Tide uses turret aiming; Toggle intake extension retracts or extends its sliding intake when cargo space permits. Intake/reverse commands extend it, and shooting compresses it as fuel empties. The Tower trainer can attach near its own tower: hold Climb to rise, release to hold, and hold Lower to descend. Enable outpost stock in Session, then hold Supply to release it.</p>
      <dl className="controls-list">{[...ACTIONS.filter(a => !(a === 'toggleIntake' && !activeRobot.intake.stowTravel) && !(['climb', 'lower'].includes(a) && !activeRobot.mechanisms.climb) && !(a === 'supply' && !match?.config.humanSupply)).map(a => [settings.controls.keys[a].map(keyLabel).join(' / ') || 'Unbound', ACTION_LABELS[a]]), ['Enter', 'Pause / resume'], ['Esc', 'Pause / close a dialog'], ['H', 'Driving controls']].map(([key, label]) => <div key={`${label}-${key}`}><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>)}</dl>
      <p>Losing focus pauses the match and clears held inputs. {activeRobot.intake.stowTravel ? 'The sliding hopper follows the intake. Retraction stops when the remaining cargo needs more space.' : 'The hopper stays deployed; the intake compresses while shooting and extends again when you release Shoot.'}</p>
      <button className="primary-button" onClick={closeModal}>Got it</button>
    </Dialog>}
    {modal === 'about' && <Dialog title="Jamesim" eyebrow="REBUILT · SOLO FUEL MATCH" onClose={closeModal}>
      <p>A browser simulator for driving Team 2910 Re•Blitz on the 2026 REBUILT field. Both match periods are driver-operated. This v1 models fuel scoring; optional robot selection, tower climbing and solo score assessment are available. Opponent interactions remain outside the solo simulation.</p>
      <div className="credits-list"><p>Field geometry · <a href="https://www.firstinspires.org/resources/library/frc/playing-field" target="_blank" rel="noreferrer">FIRST</a></p><p>Robot CAD · <a href="https://www.chiefdelphi.com/t/2910-cad-and-tech-binder-release-2026/521705" target="_blank" rel="noreferrer">Team 2910 Jack in the Bot</a></p><p>Match audio · <a href="https://github.com/Team254/cheesy-arena" target="_blank" rel="noreferrer">Team 254 Cheesy Arena</a></p><p>Barlow fonts · Jeremy Tribby, SIL Open Font License</p><p>Built with React, Three.js and Rapier.</p></div>
      <p className="source-note">An independent fan project, inspired by FRSim and MoSimulator. Not affiliated with or endorsed by FIRST or the teams. Robot behavior is tuned for gameplay.</p>
      <a href="https://github.com/shrysjain/jamesim" target="_blank" rel="noreferrer">Source and asset attribution ↗</a>
      <button className="primary-button" onClick={() => openModal('settings')}>Back to settings</button>
    </Dialog>}
  </div>;
}
