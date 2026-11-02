import type { HubTelemetry } from '../sim/HubSystem';
import { EVENT_PROFILES } from '../sim/MatchRules';
import { Dialog } from './Dialog';
import type { MatchTelemetry } from '../sim/MatchRules';

export function clockText(seconds: number) {
  const t = Math.ceil(Math.max(0, seconds)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function MatchScoreboard({ match, hits }: { match: MatchTelemetry; hits?: HubTelemetry | null }) {
  const practice = match.mode === 'practice';
  return <div className="match-scoreboard" aria-label={`${match.phase}. ${clockText(match.remaining)} remaining. Blue ${match.blue.total}, red ${match.red.total}.`}>
    <div className={`match-alliance blue ${match.lights.blue.active ? 'active' : 'inactive'}`}><span>BLUE</span><strong>{practice ? hits?.blue.hits ?? 0 : match.blue.total}</strong><small>{match.lights.blue.active ? 'ACTIVE' : match.lights.blue.graceRemaining > 0 ? 'PROCESSING' : 'INACTIVE'}</small></div>
    <div className="match-clock"><strong>{practice ? '∞' : clockText(match.remaining)}</strong><span>{match.phase}</span>{!practice && !match.complete && <small>{clockText(match.phaseRemaining)} in phase</small>}</div>
    <div className={`match-alliance red ${match.lights.red.active ? 'active' : 'inactive'}`}><span>RED</span><strong>{practice ? hits?.red.hits ?? 0 : match.red.total}</strong><small>{match.lights.red.active ? 'ACTIVE' : match.lights.red.graceRemaining > 0 ? 'PROCESSING' : 'INACTIVE'}</small></div>
  </div>;
}

export function MatchResults({ match, onRematch, onClose, restartLabel, onSetup }: {
  match: MatchTelemetry; onRematch: () => void; onClose: () => void; restartLabel: string; onSetup: () => void;
}) {
  const profile = EVENT_PROFILES[match.config.profile];
  return <Dialog title="Solo match results." eyebrow={match.endedEarly ? 'SESSION ENDED EARLY' : 'MATCH COMPLETE'} onClose={onClose} className="results-dialog">
    <div className="result-totals"><div className="blue-hit"><span>BLUE</span><strong>{match.blue.total}</strong></div><div className="red-hit"><span>RED</span><strong>{match.red.total}</strong></div></div>
    <table className="result-table"><thead><tr><th>Points</th><th>Blue</th><th>Red</th></tr></thead><tbody>
      <tr><th>AUTO fuel</th><td>{match.blue.auto}</td><td>{match.red.auto}</td></tr><tr><th>Teleop fuel</th><td>{match.blue.teleop}</td><td>{match.red.teleop}</td></tr>
      <tr><th>AUTO tower</th><td>{match.blue.autoTower}</td><td>{match.red.autoTower}</td></tr>
      <tr><th>Teleop tower</th><td>{match.blue.teleopTower}</td><td>{match.red.teleopTower}</td></tr>
      <tr><th>Inactive / late, no points</th><td>{match.blue.inactive + match.blue.late}</td><td>{match.red.inactive + match.red.late}</td></tr>
    </tbody></table>
    <div className="result-targets"><strong>{profile.label} · fuel RP targets</strong><p>Energized ({profile.energized}): Blue {match.blue.energized ? 'met' : 'not met'} · Red {match.red.energized ? 'met' : 'not met'}</p><p>Supercharged ({profile.supercharged}): Blue {match.blue.supercharged ? 'met' : 'not met'} · Red {match.red.supercharged ? 'met' : 'not met'}</p><p>Traversal ({profile.traversal} tower points): Blue {match.blue.traversal ? 'met' : 'not met'} · Red {match.red.traversal ? 'met' : 'not met'}</p></div>
    <p className="source-note">{match.endedEarly ? 'Incomplete match; these are the points earned before the early stop and its final processing window. ' : ''}Solo play assesses fuel, tower and bonus targets. A single robot can earn at most 45 tower points; Traversal requires an alliance. Opponent-dependent fouls and win/tie RP are not assessed.</p>
    <button className="primary-button" onClick={onRematch}>Restart match <kbd>{restartLabel}</kbd></button><button className="secondary-button" onClick={onSetup}>Back to singleplayer</button>
  </Dialog>;
}
