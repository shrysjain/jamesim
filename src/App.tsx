import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FieldViewer, ViewerStats } from './view/FieldViewer';
import type { FieldManifest } from './field/types';
import { MatchScoreboard, MatchResults } from './components/MatchUI';
import { Icon } from './components/Icon';
import { Dialog } from './components/Dialog';
import { SettingsDialog } from './components/SettingsDialog';
import { readSettings, saveSettings } from './settings';

const DebugPanel = import.meta.env.DEV ? lazy(() => import('./components/DebugPanel')) : null;
const initialStats: ViewerStats = { fps: 0, drawCalls: 0, triangles: 0, colliders: 0, awake: 0, physicsMs: 0, running: false, robot: null, mechanisms: null, hubs: null, match: null };
type Modal = 'settings' | 'help' | 'about' | null;

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
  useEffect(() => { if (viewer.current) { viewer.current.driveEnabled = !blocked; viewer.current.clearInput(); } }, [blocked]);

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
    if (viewer.current) viewer.current.driveEnabled = viewer.current.sim?.match.phase !== 'Complete';
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
      if (e.code === 'KeyR' && manifest) { e.preventDefault(); restart(); return; }
      if (showResults || error || !manifest) return;
      if (e.code === 'KeyH' || e.key === '?') { e.preventDefault(); openModal('help'); }
      if (e.code === 'Enter' && !target.closest('button') && manifest) { e.preventDefault(); togglePause(); }
      if (import.meta.env.DEV && e.code === 'Backquote' && manifest) { e.preventDefault(); togglePanel(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [manifest, showResults, panel, error]);

  const fuel = stats.mechanisms, shooter = fuel?.shooter;
  const fuelStatus = shooter?.active && fuel && fuel.intake < 0.98 && fuel.count > 0 ? 'Compressing' : fuel?.mode ?? 'Holding';
  return <div className={`app ${panel ? 'with-debug' : ''}`}>
    <div className="game-shell" inert={!!modal || showResults}>
      <main className="stage" aria-label="Jamesim solo fuel match">
        <div ref={viewport} className="viewport" />
        {manifest && <>
          <div className="inventory-hud" aria-label="Robot fuel and status">
            <div className="robot-label"><span />2910 RE•BLITZ</div>
            <div className={`fuel-readout ${fuelStatus === 'Full' ? 'full' : ''}`} aria-label={`${fuel?.count ?? 0} of ${fuel?.capacity ?? 55} fuel. ${fuelStatus}`}><i /><strong>{fuel?.count ?? 0}<small> / {fuel?.capacity ?? 55}</small></strong><span>FUEL<b>{fuelStatus}</b></span></div>
            {shooter?.active && <div className="shooter-readout" aria-label={`Shooter: ${shooter.mode}`}><span>{shooter.target ?? 'Shooter'}</span><strong>{shooter.mode}</strong></div>}
          </div>
          {settings.showHints && <div className="drive-hints"><span><kbd>WASD</kbd> Move</span><span><kbd>J</kbd><kbd>L</kbd> Turn</span><span><kbd>Shift</kbd> Intake</span><span><kbd>Space</kbd> Aim + shoot</span><span><kbd>Q</kbd> Reverse</span><span><kbd>R</kbd> Restart</span></div>}
          {import.meta.env.DEV && cameraMode !== 'follow' && <div className="camera-notice"><span>Inspection camera</span><button onClick={() => { viewer.current?.setMode('follow'); focus(); }}>Follow robot</button></div>}
          {match?.mode === 'match' && stats.running && !match.driverEnabled && !match.complete && <div className="match-notice">Processing final fuel · driving resumes with the next period</div>}
          {!stats.running && !blocked && !panel && !match?.complete && <div className="pause-shade"><section className="pause-card"><span className="eyebrow">MATCH PAUSED</span><h1>Ready when you are.</h1><p>Your robot, fuel and match clock stay in place.</p><button className="primary-button" onClick={() => setRunning(true)}><Icon name="play" size={16} />Resume match <kbd>↵</kbd></button><button className="end-match" onClick={restart}>Restart match <kbd>R</kbd></button></section></div>}
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
        <div className="identity"><strong>Jamesim</strong><i /><span className="practice-tag"><b />Solo fuel match</span></div>
        {manifest && match?.mode === 'match' && <MatchScoreboard match={match} />}
        <div className="play-actions">
          <button aria-label={settings.muted ? 'Enable match sounds' : 'Mute match sounds'} aria-pressed={!settings.muted} title="Match sounds" onClick={() => { setSettings(s => ({ ...s, muted: !s.muted })); focus(); }}><Icon name={settings.muted ? 'muted' : 'sound'} /></button>
          <button aria-label={stats.running ? 'Pause match' : 'Resume match'} title="Pause / resume (Enter)" disabled={!manifest || match?.complete} onClick={togglePause}><Icon name={stats.running ? 'pause' : 'play'} /></button>
          <button aria-label="Restart match" title="Restart match (R)" disabled={!manifest} onClick={restart}><Icon name="reset" /></button>
          {match?.complete && <button aria-label="View match results" onClick={() => setResultsDismissed(false)}><Icon name="target" /></button>}
          <button aria-label="Driving controls" title="Controls (H)" disabled={!manifest} onClick={() => openModal('help')}><Icon name="info" /></button>
          <button aria-label="Settings" title="Settings" disabled={!manifest} onClick={() => openModal('settings')}><Icon name="settings" /></button>
          {import.meta.env.DEV && <button className="debug-toggle" aria-label={panel ? 'Close debug panel' : 'Open debug panel'} aria-expanded={panel} disabled={!manifest} onClick={togglePanel}><Icon name="cube" /><span>Debug</span><kbd>`</kbd></button>}
        </div>
      </header>}
      {import.meta.env.DEV && panel && DebugPanel && viewer.current && <Suspense fallback={null}><DebugPanel engine={viewer.current} stats={stats} onClose={togglePanel} onRestart={restart} onSync={sync} /></Suspense>}
    </div>
    {showResults && match && <MatchResults match={match} onRematch={restart} onClose={() => { setResultsDismissed(true); focus(); }} />}
    {modal === 'settings' && <SettingsDialog settings={settings} onChange={setSettings} onClose={closeModal} onAbout={() => openModal('about')} />}
    {modal === 'help' && <Dialog title="Take the wheel." eyebrow="JAMESIM · CONTROLS" onClose={closeModal}>
      <p>You drive during AUTO and teleop. Hold Shift to collect fuel. Hold Space to turn toward the blue hub and shoot; outside your alliance zone, it aims a pass back into it. Settle to a stop before firing.</p>
      <dl className="controls-list">{[['WASD', 'Move across the field'], ['J / L', 'Turn left / right'], ['Shift', 'Hold to intake'], ['Space', 'Hold to align and shoot / pass'], ['Q', 'Hold to reverse and eject'], ['R', 'Restart the timed match'], ['Enter', 'Pause / resume'], ['Esc', 'Pause / close a dialog'], ['H', 'Driving controls']].map(([key, label]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>)}</dl>
      <p>Losing focus pauses the match and clears held inputs. The hopper stays deployed; the intake compresses while shooting and extends again when you release Space.</p>
      <button className="primary-button" onClick={closeModal}>Got it</button>
    </Dialog>}
    {modal === 'about' && <Dialog title="Jamesim" eyebrow="REBUILT · SOLO FUEL MATCH" onClose={closeModal}>
      <p>A browser simulator for driving Team 2910 Re•Blitz on the 2026 REBUILT field. Both match periods are driver-operated. This v1 models fuel scoring; climbing, penalties and opponents are outside its scope.</p>
      <div className="credits-list"><p>Field geometry · <a href="https://www.firstinspires.org/resources/library/frc/playing-field" target="_blank" rel="noreferrer">FIRST</a></p><p>Robot CAD · <a href="https://www.chiefdelphi.com/t/2910-cad-and-tech-binder-release-2026/521705" target="_blank" rel="noreferrer">Team 2910 Jack in the Bot</a></p><p>Match audio · <a href="https://github.com/Team254/cheesy-arena" target="_blank" rel="noreferrer">Team 254 Cheesy Arena</a></p><p>Barlow fonts · Jeremy Tribby, SIL Open Font License</p><p>Built with React, Three.js and Rapier.</p></div>
      <p className="source-note">An independent fan project, inspired by FRSim and MoSimulator. Not affiliated with or endorsed by FIRST or the teams. Robot behavior is tuned for gameplay.</p>
      <a href="https://github.com/shrysjain/jamesim" target="_blank" rel="noreferrer">Source and asset attribution ↗</a>
      <button className="primary-button" onClick={() => openModal('settings')}>Back to settings</button>
    </Dialog>}
  </div>;
}
