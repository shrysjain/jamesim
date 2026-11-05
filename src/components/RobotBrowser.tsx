import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ROBOTS } from '../robot/registry';
import type { RobotId } from '../robot/registry';
import type { Alliance } from '../field/targets';
import { RobotStats } from './RobotStats';
import { robotIdentity, robotStats } from './robotStatData';

const RobotPreview = lazy(() => import('./RobotPreview'));
const robots = Object.values(ROBOTS).filter(robot => robot.id !== '8592-prismarine'); // Temporarily hidden; retain its implementation and assets.

export function RobotBrowser({ selected, alliance, onChoose, onClose }: {
  selected: RobotId; alliance: Alliance; onChoose: (id: RobotId) => void; onClose: () => void;
}) {
  const [detail, setDetail] = useState<RobotId | null>(null);
  const [query, setQuery] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const screen = useRef<HTMLElement>(null);
  const lastCard = useRef<RobotId | null>(null);
  const cardRefs = useRef(new Map<RobotId, HTMLButtonElement>());
  const robot = detail ? ROBOTS[detail] : null;
  const identity = robot ? robotIdentity(robot) : null;
  // Some robot contributions add optional moving-shot metadata.
  const movingLimits = robot && 'movingLimits' in robot.shooterGeometry
    ? robot.shooterGeometry.movingLimits as { hub: { speed: number; turnRate: number }; pass: { speed: number; turnRate: number } } | undefined : undefined;
  const visible = robots.filter(r => `${r.name} ${r.summary}`.toLowerCase().includes(query.toLowerCase().trim()));

  useEffect(() => {
    if (!detail && lastCard.current) cardRefs.current.get(lastCard.current)?.focus();
    else { screen.current?.scrollTo({ top: 0 }); heading.current?.focus({ preventScroll: true }); }
  }, [detail]);

  return <main ref={screen} className={`setup-screen robot-browser alliance-${alliance}`} onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (detail) setDetail(null); else onClose(); }
  }}>
    <header className="setup-header"><span className="wordmark">Jamesim<span>REBUILT / 2026</span></span><button className="quiet-button" onClick={onClose}>Back to setup</button></header>
    <div className="browser-heading">
      <div><span className="eyebrow">FIND YOUR DRIVE</span><h1 ref={heading} tabIndex={-1}>{robot ? identity?.team : 'Choose your robot'}</h1>
        <p>{robot ? `${robot.teamNumber}${identity?.machine ? ` / ${identity.machine}` : ''}` : 'Compare the lineup. Open a robot to inspect its CAD and full spec.'}</p></div>
      <span className={`alliance-indicator ${alliance}`}><i />{alliance} alliance</span>
    </div>
    {robot && detail ? <>
      <button className="browser-back text-button" onClick={() => setDetail(null)}>← All robots</button>
      <div className="robot-detail">
        <section className="detail-inspection" aria-label="Robot inspection"><div className="robot-preview"><Suspense fallback={<p>Loading robot…</p>}><RobotPreview robot={robot} alliance={alliance} /></Suspense><span>Drag to inspect</span></div><p>{robot.summary}</p></section>
        <section className="detail-spec" aria-label={`${robot.name} stats`}><div className="detail-identity"><span className="team-number">{robot.teamNumber}</span><div><h2>{identity?.machine ?? identity?.team}</h2><span>{identity?.team}</span></div>{selected === detail && <span className="selected-badge">Selected</span>}</div>
          <RobotStats robot={robot} />
          {movingLimits && <p className="stats-note">{robot.mechanisms.movingShots ? `Hub shots: up to ${movingLimits.hub.speed} m/s and ${movingLimits.hub.turnRate} rad/s.` : 'Hub shots require settling.'} Passes: up to {movingLimits.pass.speed} m/s and {movingLimits.pass.turnRate} rad/s.</p>}
          <p className="stats-note">Configured simulator stats and gameplay estimates. Rates are nominal; motion ratings estimate quality rather than a hit percentage.</p>
          <button className="launch-button choose-robot" onClick={() => onChoose(detail)}>Use this robot<span>→</span></button>
        </section>
      </div>
    </> : <>
      <div className="browser-toolbar"><label className="robot-search"><span className="sr-only">Search robots</span><input type="search" placeholder="Search team or robot…" value={query} onChange={e => setQuery(e.target.value)} /></label><span role="status">{visible.length} of {robots.length} robots</span></div>
      <div className="robot-card-grid">{visible.map(r => {
        const id = r.id as RobotId, name = robotIdentity(r), current = id === selected;
        return <button key={id} ref={node => { if (node) cardRefs.current.set(id, node); else cardRefs.current.delete(id); }} className={`robot-card${current ? ' is-selected' : ''}`} onClick={() => { lastCard.current = id; setDetail(id); }} aria-label={`View ${r.name} stats${current ? ', selected' : ''}`}>
          <div className="robot-card-top"><span className="card-kicker">TEAM / {r.teamNumber}</span>{current ? <span className="selected-badge">✓ Selected</span> : <span className="card-open" aria-hidden="true">→</span>}</div>
          <div className="card-identity"><span className="team-number">{r.teamNumber}</span><div><h2>{name.team}</h2>{name.machine && <p>{name.machine}</p>}</div></div>
          <p className="card-summary">{r.summary}</p>
          <dl className="card-stats">{robotStats(r).filter(s => ['Speed', 'Fire rate', 'Intake rate', 'Capacity'].includes(s.label)).map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
          <span className="card-footer">{r.mechanisms.turret ? 'Turret' : 'Chassis aim'}<span>View full spec →</span></span>
        </button>;
      })}</div>
      {visible.length === 0 && <div className="robot-empty"><h2>No matching robots</h2><p>Try a team number or a different name.</p><button onClick={() => setQuery('')}>Clear search</button></div>}
      <p className="stats-note browser-note">Stats reflect the current simulator setup. Capacity and performance include gameplay estimates.</p>
    </>}
  </main>;
}
