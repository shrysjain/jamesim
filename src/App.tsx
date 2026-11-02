import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FieldViewer, ViewerStats } from './view/FieldViewer';
import type { FieldManifest } from './field/types';
import { SetupScreen } from './components/SetupScreen';
import { MatchScoreboard, MatchResults } from './components/MatchUI';
import { SettingsDialog } from './components/SettingsDialog';
import { Dialog } from './components/Dialog';
import { Icon } from './components/Icon';
import { ACTIONS, ACTION_LABELS, keyLabel } from './controls';
import { ROBOTS } from './robot/RobotDefinition';
import { DEFAULT_MATCH } from './sim/MatchRules';
import type { MatchConfig } from './sim/MatchRules';
import { readSettings, saveSettings } from './settings';

const DebugPanel = import.meta.env.DEV ? lazy(() => import('./components/DebugPanel')) : null;
const initialStats: ViewerStats = { fps: 0, drawCalls: 0, triangles: 0, colliders: 0, awake: 0, physicsMs: 0, running: false, humanPlayer: null, robot: null, mechanisms: null, hubs: null, match: null };
type Modal = 'pause' | 'settings' | 'help' | 'about' | 'rules' | null;
export function App() {
  const viewport = useRef<HTMLDivElement>(null), viewer = useRef<FieldViewer | null>(null);
  const [screen, setScreen] = useState<'setup' | 'game'>('setup'), screenRef = useRef(screen); screenRef.current = screen;
  const [engineWanted, setEngineWanted] = useState(false);
  const [session, setSession] = useState({ config: { ...DEFAULT_MATCH, seed: Math.floor(Math.random() * 0x100000000) }, practice: false });
  const pendingSession = useRef(session);
  const [manifest, setManifest] = useState<FieldManifest | null>(null);
  const [progress, setProgress] = useState('Loading the renderer and physics…');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState(initialStats);
  const [settings, setSettings] = useState(readSettings), settingsRef = useRef(settings); settingsRef.current = settings;
  const [modal, updateModal] = useState<Modal>(null), modalRef = useRef<Modal>(null);
  const [panel, setPanel] = useState(false), [resultsDismissed, setResultsDismissed] = useState(false);
  const match = stats.match, activeRobot = ROBOTS[match?.config.robot ?? session.config.robot ?? '2910-reblitz'];
  const showResults = screen === 'game' && !!match?.complete && !resultsDismissed && !modal && !error;
  const setModal = (next: Modal) => { modalRef.current = next; updateModal(next); };
  const sync = () => { if (viewer.current?.sim) setStats(viewer.current.snapshot()); };
  const focus = () => viewer.current?.focusCanvas();
  const pause = (next: Modal = 'pause') => { viewer.current?.setRunning(false); setModal(next); sync(); };
  const resume = () => { setModal(null); viewer.current?.setRunning(true); sync(); focus(); };
  const togglePause = () => { if (modalRef.current === 'pause') resume(); else if (!modalRef.current) pause(); };
  const closeModal = () => { if (screenRef.current === 'setup') setModal(null); else if (modalRef.current === 'pause') resume(); else setModal('pause'); };
  const restart = () => {
    if (!viewer.current?.sim || error || screenRef.current !== 'game') return;
    setPanel(false); setResultsDismissed(false); setModal(null);
    viewer.current.driveEnabled = true; viewer.current.restartMatch(); sync(); focus();
  };
  const returnToSetup = () => {
    viewer.current?.setRunning(false); setModal(null); setPanel(false); setResultsDismissed(false); setScreen('setup');
  };
  const start = (config: MatchConfig, practice: boolean) => {
    const next = { config, practice }; pendingSession.current = next; setSession(next);
    setResultsDismissed(false); setModal(null); setScreen('game');
    if (viewer.current?.sim) { viewer.current.presentationActive = true; viewer.current.startSession(config, practice); sync(); focus(); }
    else setEngineWanted(true);
  };
  useEffect(() => {
    if (!engineWanted || !viewport.current) return;
    let engine: FieldViewer | undefined, cancelled = false;
    void (async () => {
      const { FieldViewer } = await import('./view/FieldViewer');
      if (cancelled) return;
      engine = new FieldViewer(viewport.current!, {
        progress: message => { if (!cancelled) setProgress(message); },
        ready: field => { if (!cancelled) setManifest(field); },
        selection: () => {}, stats: next => { if (!cancelled) setStats(next); }, camera: () => {},
        focusLost: () => { if (!cancelled && screenRef.current === 'game' && !modalRef.current) setModal('pause'); },
        pauseRequested: () => { if (screenRef.current === 'game') togglePause(); },
        restartRequested: () => { if (!modalRef.current || modalRef.current === 'pause') restart(); },
        error: message => { if (!cancelled) setError(message); },
      });
      viewer.current = engine; engine.applySettings(settingsRef.current);
      await engine.load();
      if (cancelled) return;
      engine.startSession(pendingSession.current.config, pendingSession.current.practice);
      if (document.hidden || !document.hasFocus()) { engine.setRunning(false); setModal('pause'); }
      else engine.focusCanvas();
    })().catch((cause: unknown) => { if (!cancelled) { console.error(cause); setError(cause instanceof Error ? cause.message : 'The game could not be loaded.'); } });
    return () => { cancelled = true; engine?.dispose(); viewer.current = null; };
  }, [engineWanted]);
  useEffect(() => { saveSettings(settings); viewer.current?.applySettings(settings); }, [settings]);
  useEffect(() => {
    if (viewer.current) {
      viewer.current.driveEnabled = screen === 'game' && !modal && !showResults && !error;
      viewer.current.presentationActive = screen === 'game'; viewer.current.clearInput();
    }
  }, [screen, modal, showResults, error]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        if (modalRef.current) closeModal();
        else if (panel) setPanel(false);
        else if (showResults) { setResultsDismissed(true); pause(); }
        else if (screenRef.current === 'game' && manifest) pause();
        return;
      }
      if (target.closest('input, select, textarea, [contenteditable="true"]') || screenRef.current !== 'game' || !manifest) return;
      if ((!modalRef.current || modalRef.current === 'pause') && settingsRef.current.controls.keys.restart.includes(e.code)) { e.preventDefault(); restart(); return; }
      if (error || showResults) return;
      if ((e.code === 'Enter' || settingsRef.current.controls.keys.pause.includes(e.code)) && !target.closest('button') && (!modalRef.current || modalRef.current === 'pause')) { e.preventDefault(); togglePause(); }
      if (modalRef.current) return;
      if (e.code === 'KeyH') { e.preventDefault(); pause('help'); }
      if (import.meta.env.DEV && e.code === 'Backquote') { e.preventDefault(); setPanel(p => !p); focus(); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [manifest, panel, showResults, error, screen]);
  const restartLabel = settings.controls.keys.restart.map(keyLabel).join(' / ');
  return <div className="app">
    <div className={`game-shell ${screen === 'setup' ? 'offscreen' : ''}`} inert={!!modal || showResults}>
      <main className="stage" aria-label="Jamesim driving view"><div ref={viewport} className="viewport" />
        {manifest && match && <div className="score-overlay"><MatchScoreboard match={match} hits={stats.hubs} /></div>}
        {(!manifest || error) && screen === 'game' && <div className="loading-screen" role={error ? 'alert' : 'status'}><Icon name="cube" size={32} /><h1>{error ? 'Unable to open Jamesim' : 'Getting the field ready'}</h1><p>{error ?? progress}</p>{error ? <button className="primary-button" onClick={() => location.reload()}>Try again</button> : <div className="loading-progress" role="progressbar" aria-label="Loading game" aria-valuetext={progress} />}</div>}
      </main>
      {import.meta.env.DEV && panel && DebugPanel && viewer.current && <Suspense fallback={null}><DebugPanel engine={viewer.current} stats={stats} onClose={() => { setPanel(false); focus(); }} onRestart={restart} onSync={sync} /></Suspense>}
    </div>
    {screen === 'setup' && <div inert={!!modal}><SetupScreen controls={settings.controls} active={!modal} config={session.config} practice={session.practice} onStart={start} onSettings={() => setModal('settings')} onRules={() => setModal('rules')} /></div>}
    {modal === 'pause' && <Dialog title="Paused" eyebrow="JAMESIM · REBUILT" onClose={resume} className="pause-menu">
      <p>{activeRobot.name} · {match?.config.alliance ?? 'blue'} alliance</p>
      {activeRobot.climb && <p className="pause-status">{stats.mechanisms?.climb.status}</p>}
      <nav aria-label="Pause menu"><button className="primary-button" onClick={resume}>Resume <kbd>Esc</kbd></button><button onClick={restart}>Restart {session.practice ? 'practice' : 'match'} <kbd>{restartLabel}</kbd></button><button onClick={() => setModal('settings')}>Settings</button><button onClick={() => setModal('help')}>Controls</button><button onClick={returnToSetup}>Back to singleplayer</button></nav>
    </Dialog>}
    {showResults && match && <MatchResults match={match} onRematch={restart} onClose={() => { setResultsDismissed(true); pause(); }} restartLabel={restartLabel} onSetup={returnToSetup} />}
    {modal === 'settings' && <SettingsDialog settings={settings} onChange={setSettings} onClose={closeModal} onAbout={() => setModal('about')} />}
    {modal === 'help' && <Dialog title="Controls" eyebrow="JAMESIM · DRIVER GUIDE" onClose={closeModal}>
      {activeRobot.shooterGeometry.fixedElevation !== undefined && <p>The hood stays fixed. Shoot aims toward the target and adjusts flywheel speed for distance.</p>}
      <p>Drive during AUTO and teleop. Shoot aims at your alliance hub, or passes into your zone. {activeRobot.name} {activeRobot.mechanisms.turret ? 'tracks with its turret' : 'aims with its chassis'}{activeRobot.mechanisms.movingShots ? ' and supports moving shots.' : ' and stops to shoot.'}{activeRobot.mechanisms.simultaneousIntake ? ' Intake can run while firing.' : ''}</p>
      <dl className="controls-list">{ACTIONS.filter(a => a !== 'toggleIntake' || !!(activeRobot.intake.stowTravel || activeRobot.intake.manualRetraction)).filter(a => a !== 'climb' || activeRobot.mechanisms.climb).filter(a => a !== 'supply' || match?.config.humanSupply).map(a => <div key={a}><dt><kbd>{settings.controls.keys[a].map(keyLabel).join(' / ') || 'Unbound'}</kbd></dt><dd>{ACTION_LABELS[a]}</dd></div>)}</dl>
      {activeRobot.mechanisms.climb && <p>Toggle C to raise the hook. {activeRobot.climb?.approachAxis === 'x' ? 'Face your own tower and line up either outer hook with an end of the low rung.' : 'Approach beside your own tower along the low rung.'} Stop with the hooks aligned to engage. Toggle C again to pull up into L1. Toggle once more to lower and release.</p>}
      {activeRobot.hopper.autoLift && <p>Shift raises the juice press for collection. It lowers as cargo empties while shooting, and keeps enough room for held fuel. Collection does not engage the tower; C controls climbing.</p>}
      <p>Escape opens the pause menu. Losing focus pauses and clears held inputs. Resume explicitly.</p><button className="primary-button" onClick={closeModal}>Done</button>
    </Dialog>}
    {modal === 'rules' && <Dialog title="Driver-operated REBUILT" eyebrow="SINGLEPLAYER" onClose={closeModal}>
      <p>Both AUTO and teleop are under your control. AUTO lasts 20 seconds, followed by the assessment gap and 140 seconds of teleop. Hub shifts determine which fuel scores.</p><p>Climb points are assessed at period boundaries. Kepler and Limestone support L1; Re•Blitz has no climber. Bonus targets follow the selected event. Opponents, fouls and win/tie ranking points are outside singleplayer.</p><p>Practice has no clock and both hubs stay active. R restarts your selected session.</p><button className="primary-button" onClick={closeModal}>Done</button>
    </Dialog>}
    {modal === 'about' && <Dialog title="Jamesim" eyebrow="REBUILT 2026" onClose={() => setModal('settings')}>
      <p>A browser FRC simulator inspired by FRSim and MoSimulator. Independently built; not affiliated with FIRST or the teams.</p><div className="credits-list"><p>Field · FIRST</p><p>Robot CAD · Team 2910 Jack in the Bot, Team 1690 Orbit, Team 6328 Mechanical Advantage, Team 1678 Citrus Circuits Team 9496 LYNK and Team 3847 Spectrum</p><p>Match audio · Team 254 Cheesy Arena</p><p>Barlow · Jeremy Tribby, SIL OFL</p><p>React · Three.js · Rapier</p></div><a href="https://github.com/shrysjain/jamesim" target="_blank" rel="noreferrer">Source and asset attribution ↗</a><button className="primary-button" onClick={() => setModal('settings')}>Back to settings</button>
    </Dialog>}
  </div>;
}
