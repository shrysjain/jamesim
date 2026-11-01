import { EVENT_PROFILES } from '../sim/MatchRules';
import type { MatchConfig, MatchTelemetry } from '../sim/MatchRules';

export function clockText(seconds: number) {
  const t = Math.ceil(Math.max(0, seconds)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function MatchScoreboard({ match }: { match: MatchTelemetry }) {
  return <div className="match-scoreboard" aria-label={`${match.phase}. ${clockText(match.remaining)} remaining. Blue ${match.blue.total}, red ${match.red.total}.`}>
    <div className={`match-alliance blue ${match.lights.blue.active ? 'active' : 'inactive'}`}><span>BLUE</span><strong>{match.blue.total}</strong><small>{match.lights.blue.active ? 'ACTIVE' : match.lights.blue.graceRemaining > 0 ? 'PROCESSING' : 'INACTIVE'}</small></div>
    <div className="match-clock"><strong>{clockText(match.remaining)}</strong><span>{match.phase}</span>{!match.complete && <small>{clockText(match.phaseRemaining)} in phase</small>}</div>
    <div className={`match-alliance red ${match.lights.red.active ? 'active' : 'inactive'}`}><span>RED</span><strong>{match.red.total}</strong><small>{match.lights.red.active ? 'ACTIVE' : match.lights.red.graceRemaining > 0 ? 'PROCESSING' : 'INACTIVE'}</small></div>
  </div>;
}

export function SessionDialog({ config, onConfig, onMatch, onPractice, onClose }: {
  config: MatchConfig; onConfig: (config: MatchConfig) => void; onMatch: () => void; onPractice: () => void; onClose: () => void;
}) {
  return <div className="modal-backdrop"><section className="help-dialog session-dialog" role="dialog" aria-modal="true" aria-labelledby="session-title">
    <button className="modal-close" aria-label="Close session setup" onClick={onClose} autoFocus>×</button>
    <span className="eyebrow">JAMESIM · REBUILT</span><h2 id="session-title">Choose your session.</h2>
    <button className="practice-choice" onClick={onPractice}><strong>Free practice</strong><span>Unlimited driving, shooting, and fuel returns.</span></button>
    <h3>Solo timed match</h3><p>20 seconds of driver-operated AUTO, then 2:20 of teleop. Hub shifts and three-second processing windows follow the season rules.</p>
    <label className="session-field">Preloaded fuel<select aria-label="Preloaded fuel" value={config.preloads} onChange={e => onConfig({ ...config, preloads: Number(e.target.value) })}>{Array.from({ length: 9 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></label>
    <label className="session-field">Fuel RP targets<select aria-label="Event targets" value={config.profile} onChange={e => onConfig({ ...config, profile: e.target.value as MatchConfig['profile'] })}>{Object.entries(EVENT_PROFILES).map(([id, profile]) => <option key={id} value={id}>{profile.label}</option>)}</select></label>
    <p className="source-note">You drive during both AUTO and teleop. This is a solo fuel match: climbing, penalties, opponents, and win/tie RP are not assessed. All profiles currently use the 504-fuel field.</p>
    <button className="primary-button" onClick={onMatch}>Start timed match</button>
  </section></div>;
}

export function MatchResults({ match, onRematch, onPractice, onSetup, onClose }: {
  match: MatchTelemetry; onRematch: () => void; onPractice: () => void; onSetup: () => void; onClose: () => void;
}) {
  const profile = EVENT_PROFILES[match.config.profile];
  return <div className="modal-backdrop"><section className="help-dialog results-dialog" role="dialog" aria-modal="true" aria-labelledby="results-title">
    <button className="modal-close" aria-label="Inspect final field" onClick={onClose} autoFocus>×</button>
    <span className="eyebrow">{match.endedEarly ? 'SESSION ENDED EARLY' : 'MATCH COMPLETE'}</span><h2 id="results-title">Solo fuel results.</h2>
    <div className="result-totals"><div className="blue-hit"><span>BLUE</span><strong>{match.blue.total}</strong></div><div className="red-hit"><span>RED</span><strong>{match.red.total}</strong></div></div>
    <table className="result-table"><thead><tr><th>Fuel points</th><th>Blue</th><th>Red</th></tr></thead><tbody>
      <tr><th>Autonomous</th><td>{match.blue.auto}</td><td>{match.red.auto}</td></tr><tr><th>Teleop</th><td>{match.blue.teleop}</td><td>{match.red.teleop}</td></tr>
      <tr><th>Inactive / late, no points</th><td>{match.blue.inactive + match.blue.late}</td><td>{match.red.inactive + match.red.late}</td></tr>
    </tbody></table>
    <div className="result-targets"><strong>{profile.label} · fuel RP targets</strong><p>Energized ({profile.energized}): Blue {match.blue.energized ? 'met' : 'not met'} · Red {match.red.energized ? 'met' : 'not met'}</p><p>Supercharged ({profile.supercharged}): Blue {match.blue.supercharged ? 'met' : 'not met'} · Red {match.red.supercharged ? 'met' : 'not met'}</p></div>
    <p className="source-note">{match.endedEarly ? 'Incomplete match; these are the points earned before the early stop and its final processing window. ' : ''}Tower/Traversal, penalties, opponents, and win/tie RP are not assessed.</p>
    <button className="primary-button" onClick={onRematch}>Run another match</button><div className="result-actions"><button onClick={onPractice}>Free practice</button><button onClick={onSetup}>Change setup</button></div>
  </section></div>;
}
