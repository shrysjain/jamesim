import type { Controls } from '../controls';
import { lazy, Suspense, useState, useRef } from 'react';
import { ROBOTS } from '../robot/RobotDefinition';
import type { RobotId } from '../robot/RobotDefinition';
import { EVENT_PROFILES } from '../sim/MatchRules';
import type { MatchConfig } from '../sim/MatchRules';
import { defaultStart, normalizeStart } from '../sim/SessionConfig';
import { FieldMap } from './FieldMap';
import { RobotStats } from './RobotStats';
import { RobotBrowser } from './RobotBrowser';
import { robotIdentity } from './robotStatData';
const RobotPreview = lazy(() => import('./RobotPreview'));

export function SetupScreen({ config, practice: initialPractice, onStart, onSettings, onRules, controls, active }: {
  controls: Controls; active: boolean; config: MatchConfig; practice: boolean; onStart: (config: MatchConfig, practice: boolean) => void; onSettings: () => void; onRules: () => void;
}) {
  const [draft, setDraft] = useState<MatchConfig>({ ...config, alliance: config.alliance ?? 'blue', robot: config.robot ?? '2910-reblitz' });
  const [practice, setPractice] = useState(initialPractice);
  const [browsing, setBrowsing] = useState(false);
  const changeButton = useRef<HTMLButtonElement>(null);
  const restoreChangeFocus = useRef(false);
  const mapFocus = useRef<SVGSVGElement>(null);
  const focusMap = () => requestAnimationFrame(() => {
    const map = mapFocus.current;
    if (restoreChangeFocus.current && changeButton.current) { changeButton.current.focus({ preventScroll: true }); restoreChangeFocus.current = false; }
    else if (map && !map.closest('[inert]')) map.focus({ preventScroll: true });
  });
  const robot = ROBOTS[draft.robot ?? '2910-reblitz'], alliance = draft.alliance ?? 'blue';
  const position = draft.start ?? defaultStart(alliance, draft.spawn);
  const chooseAlliance = (next: 'blue' | 'red') => setDraft({ ...draft, alliance: next, start: next === alliance ? position : { x: -position.x, z: -position.z, yaw: position.yaw + Math.PI } });
  const identity = robotIdentity(robot);
  if (browsing) return <RobotBrowser selected={robot.id as RobotId} alliance={alliance} onChoose={id => { setDraft({ ...draft, robot: id }); setBrowsing(false); focusMap(); }} onClose={() => { restoreChangeFocus.current = true; setBrowsing(false); focusMap(); }} />;
  return <main className="setup-screen" onPointerUp={e => { if (!(e.target as Element).closest('input,select,textarea,a,button,canvas')) focusMap(); }} onBlur={e => { if (!(e.relatedTarget instanceof Element) || !e.relatedTarget.closest('input,select,textarea,button,a,[tabindex]')) focusMap(); }}>
    <header className="setup-header"><a className="wordmark" href="./" aria-label="Jamesim home">Jamesim<span>REBUILT / 2026</span></a><button className="quiet-button" onClick={onSettings}>Settings</button></header>
    <div className="setup-title"><span className="eyebrow">TAKE THE FIELD</span><h1>Singleplayer</h1></div>
    <div className="setup-grid">
      <section className="robot-selection" aria-label="Robot and alliance">
        <div className="section-heading"><h2>Robot</h2><button ref={changeButton} className="change-robot" onClick={() => setBrowsing(true)}>Change robot →</button></div>
        <div className={`robot-choice alliance-${alliance}`}><span className="team-number">{robot.teamNumber}</span><div className="robot-choice-identity"><strong>{identity.team}</strong>{identity.machine && <span>{identity.machine}</span>}<small>{robot.summary}</small></div></div>
        <RobotStats robot={robot} compact />
        <div className="robot-preview"><Suspense fallback={<p>Loading robot…</p>}><RobotPreview robot={robot} alliance={alliance} /></Suspense><span>Drag to inspect</span></div>
        <fieldset className="alliance-choice"><legend>Alliance</legend>{(['blue', 'red'] as const).map(a => <button key={a} className={a} aria-pressed={alliance === a} onClick={() => chooseAlliance(a)}><i />{a}</button>)}</fieldset>
      </section>
      <section className="start-selection" aria-label="Starting position">
        <div className="section-heading"><h2>Starting position</h2><button className="text-button" onClick={() => setDraft({ ...draft, spawn: 'left', start: defaultStart(alliance) })}>Reset position ↺</button></div>
        <FieldMap alliance={alliance} robot={robot} position={position} controls={controls} active={active} focusRef={mapFocus} onChange={start => setDraft({ ...draft, start: normalizeStart(start, alliance) })} />
        <div className="spawn-presets" aria-label="Starting spot presets">{(['left', 'center', 'right'] as const).map(spot => <button key={spot} onClick={() => setDraft({ ...draft, spawn: spot, start: defaultStart(alliance, spot) })}>{spot}</button>)}<span>WASD to drive · J / L to turn · arrow = intake</span></div>
        <details className="session-advanced"><summary>Match options <span>{practice ? 'Free practice' : 'Timed match'} · {draft.preloads} preloads</span></summary><div className="session-options">
          <label>Session<select aria-label="Session" value={practice ? 'practice' : 'match'} onChange={e => setPractice(e.target.value === 'practice')}><option value="match">Timed match</option><option value="practice">Free practice</option></select></label>
          <label>Preloads<input aria-label="Preloads" type="number" min="0" max="8" value={draft.preloads} onChange={e => setDraft({ ...draft, preloads: Math.max(0, Math.min(8, Number(e.target.value))) })} /></label>
          <label>Event<select aria-label="Event" value={draft.profile} onChange={e => setDraft({ ...draft, profile: e.target.value as MatchConfig['profile'] })}>{Object.entries(EVENT_PROFILES).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select></label>
          <label className="supply-option"><input type="checkbox" checked={!!draft.humanSupply} onChange={e => setDraft({ ...draft, humanSupply: e.target.checked })} />Outpost supply</label>
        </div></details>
      </section>
    </div>
    <footer className="setup-footer"><p>Keyboard and controller bindings are in Settings.<br /><span>Escape opens the menu during play.</span></p><div><button className="quiet-button" onClick={onRules}>Rules</button><button className="launch-button" onClick={() => onStart({ ...draft, start: position }, practice)}>Start {practice ? 'practice' : 'match'}<span>→</span></button></div></footer>
  </main>;
}
