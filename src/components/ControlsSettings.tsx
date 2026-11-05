import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ACTIONS, ACTION_LABELS, bindKey, bindButton, keyLabel, validKey } from '../controls';
import type { Action, Controls } from '../controls';
import { controllerButtonLabel } from '../controllerLabels';

export function ControlsSettings({ controls, onChange }: { controls: Controls; onChange: (c: Controls) => void }) {
  const [binding, setBinding] = useState<Action | null>(null);
  const [message, setMessage] = useState('');
  const capture = (event: KeyboardEvent<HTMLButtonElement>, action: Action) => {
    if (binding !== action) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    if (event.code === 'Escape') { setBinding(null); setMessage('Rebinding cancelled.'); return; }
    if (!validKey(event.code)) { setMessage('That key is reserved or unsupported. Choose another key.'); return; }
    onChange(bindKey(controls, action, event.code)); setBinding(null); setMessage(`${ACTION_LABELS[action]} saved. Conflicting bindings were swapped.`);
  };
  return <fieldset className="controls-settings"><legend>Player controls</legend>
    <p>Click a key, then press its replacement. Escape cancels. Enter, Escape and H remain pause/help shortcuts.</p>
    <label className="setting-row">Enable controller<input type="checkbox" checked={controls.gamepad} onChange={e => onChange({ ...controls, gamepad: e.target.checked })} /></label>
    <label className="setting-volume">Stick deadzone: {Math.round(controls.deadzone * 100)}%<input aria-label="Controller deadzone" type="range" min="0.05" max="0.5" step="0.01" value={controls.deadzone} onChange={e => onChange({ ...controls, deadzone: Number(e.target.value) })} /></label>
    <p>Standard controller: left stick moves, right stick turns. Names show Xbox / PlayStation equivalents; numbers are zero-based browser button indices. “—” disables a button.</p>
    {ACTIONS.map(action => <div className="binding-row" key={action}><span>{ACTION_LABELS[action]}</span><button onClick={() => { setBinding(action); setMessage('Press a key…'); }} onKeyDown={event => capture(event, action)} onBlur={() => setBinding(null)} aria-pressed={binding === action} aria-label={`Rebind ${ACTION_LABELS[action]}`}>{binding === action ? 'Press key…' : controls.keys[action].map(keyLabel).join(' / ') || 'Unbound'}</button><select aria-label={`Controller button for ${ACTION_LABELS[action]}`} value={controls.buttons[action] ?? ''} onChange={e => onChange(bindButton(controls, action, e.target.value === '' ? null : Number(e.target.value)))}><option value="">—</option>{Array.from({ length: 32 }, (_, i) => <option key={i} value={i}>{i} · {controllerButtonLabel(i)}</option>)}</select></div>)}
    <p role="status">{message}</p>
  </fieldset>;
}
