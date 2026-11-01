import { useState } from 'react';
import { Dialog } from './Dialog';
import { DEFAULT_MATCH, EVENT_PROFILES } from '../sim/MatchRules';
import type { MatchConfig } from '../sim/MatchRules';
import { ROBOTS } from '../robot/RobotDefinition';
export function SessionDialog({ config, mode, onStart, onClose }: { config: MatchConfig; mode: 'match' | 'practice'; onStart: (config: MatchConfig, practice: boolean) => void; onClose: () => void }) {
  const [draft, setDraft] = useState({ ...DEFAULT_MATCH, ...config });
  const [practice, setPractice] = useState(mode === 'practice');
  return <Dialog title="Session setup" eyebrow="OPTIONAL · QUICK START IS ALWAYS AVAILABLE" onClose={onClose}>
    <label className="setting-row">Session<select aria-label="Session" value={practice ? 'practice' : 'match'} onChange={e => setPractice(e.target.value === 'practice')}><option value="match">Timed match</option><option value="practice">Free practice</option></select></label>
    <label className="setting-row">Robot<select aria-label="Robot" value={draft.robot ?? '2910-reblitz'} onChange={e => setDraft({ ...draft, robot: e.target.value as MatchConfig['robot'] })}>{Object.entries(ROBOTS).map(([id, robot]) => <option key={id} value={id}>{robot.name}</option>)}</select></label>
    {draft.robot === '4414-high-tide' && <p>4414 Ripcurrent: 85-fuel extending hopper, single-stream turret and moving shots. Team-binder dimensions; procedural model and estimated rates. Exact FRSim tuning remains unverified.</p>}
    {draft.robot === '1690-kepler' && <p>Kepler: team-release CAD, sliding intake, independent turret and moving shots. FRSim target: 14.4 ft/s, 13 shots/s, 40 intake/s, about 50 fuel, 95% moving-shot accuracy and 32 ft passing. L1 winch behavior remains approximate.</p>}
    <label className="setting-row">Alliance<select aria-label="Alliance" value={draft.alliance ?? 'blue'} onChange={e => setDraft({ ...draft, alliance: e.target.value as 'blue' | 'red' })}><option>blue</option><option>red</option></select></label>
    <label className="setting-row">Spawn<select aria-label="Spawn" value={draft.spawn ?? 'left'} onChange={e => setDraft({ ...draft, spawn: e.target.value as MatchConfig['spawn'] })}><option>left</option><option>center</option><option>right</option></select></label>
    <label className="setting-row">Preloads<input aria-label="Preloads" type="number" min="0" max="8" value={draft.preloads} onChange={e => setDraft({ ...draft, preloads: Math.max(0, Math.min(8, Number(e.target.value))) })} /></label>
    <label className="setting-row">Event<select aria-label="Event" value={draft.profile} onChange={e => setDraft({ ...draft, profile: e.target.value as MatchConfig['profile'] })}>{Object.entries(EVENT_PROFILES).map(([id, profile]) => <option key={id} value={id}>{profile.label}</option>)}</select></label>
    <label className="setting-row">Outpost supply (12 per alliance)<input type="checkbox" checked={!!draft.humanSupply} onChange={e => setDraft({ ...draft, humanSupply: e.target.checked })} /></label>
    <p>Starting resets the world and score. AUTO remains driver-operated.</p>
    <button className="primary-button" onClick={() => onStart(draft, practice)}>Start {practice ? 'practice' : 'match'}</button>
  </Dialog>;
}
