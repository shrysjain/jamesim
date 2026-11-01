import { useEffect, useState } from 'react';
import { ACTIONS, ACTION_LABELS, bindKey, keyLabel, validKey } from '../controls';
import type { Action, Controls } from '../controls';

export function ControlsSettings({ controls, onChange }: { controls: Controls; onChange: (c: Controls) => void }) {
  const [binding, setBinding] = useState<Action | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!binding) return;
    const handle = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code === 'Escape') { setBinding(null); return; }
      if (!validKey(e.code)) { setMessage('That key is reserved. Choose another key.'); return; }
      onChange(bindKey(controls, binding, e.code)); setBinding(null); setMessage('Saved. Conflicting bindings were swapped.');
    };
    window.addEventListener('keydown', handle, true);
    return () => window.removeEventListener('keydown', handle, true);
  }, [binding, controls, onChange]);
  return <fieldset className="controls-settings"><legend>Player controls</legend>
    <p>Click a key, then press its replacement. Escape cancels. Enter, Escape and H remain pause/help shortcuts.</p>
    <label className="setting-row">Enable controller<input type="checkbox" checked={controls.gamepad} onChange={e => onChange({ ...controls, gamepad: e.target.checked })} /></label>
    <label className="setting-volume">Stick deadzone: {Math.round(controls.deadzone * 100)}%<input aria-label="Controller deadzone" type="range" min="0.05" max="0.5" step="0.01" value={controls.deadzone} onChange={e => onChange({ ...controls, deadzone: Number(e.target.value) })} /></label>
    <p>Standard controller: left stick moves, right stick turns. Button numbers follow the browser Gamepad mapping; “—” disables a button.</p>
    {ACTIONS.map(action => <div className="binding-row" key={action}><span>{ACTION_LABELS[action]}</span><button onClick={() => { setBinding(action); setMessage('Press a key…'); }} aria-label={`Rebind ${ACTION_LABELS[action]}`}>{binding === action ? 'Press key…' : controls.keys[action].map(keyLabel).join(' / ')}</button><select aria-label={`Controller button for ${ACTION_LABELS[action]}`} value={controls.buttons[action] ?? ''} onChange={e => onChange({ ...controls, buttons: { ...controls.buttons, [action]: e.target.value === '' ? null : Number(e.target.value) } })}><option value="">—</option>{Array.from({ length: 17 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></div>)}
    <p role="status">{message}</p>
  </fieldset>;
}
