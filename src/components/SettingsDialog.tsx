import { ControlsSettings } from './ControlsSettings';
import { DEFAULT_SETTINGS } from '../settings';
import type { GraphicsPreset, Settings } from '../settings';
import { Dialog } from './Dialog';

export function SettingsDialog({ settings, onChange, onClose, onAbout }: {
  settings: Settings; onChange: (settings: Settings) => void; onClose: () => void; onAbout: () => void;
}) {
  return <Dialog title="Settings" eyebrow="MAKE YOURSELF AT HOME" onClose={onClose}>
    <label className="setting-row"><span>Match sounds<small>Period and hub-shift cues</small></span><input aria-label="Mute match sounds" type="checkbox" checked={settings.muted} onChange={e => onChange({ ...settings, muted: e.target.checked })} /><span className="setting-value">{settings.muted ? 'Muted' : 'On'}</span></label>
    <label className="setting-volume"><span>Volume<output>{Math.round(settings.volume * 100)}%</output></span><input aria-label="Sound volume" type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={e => onChange({ ...settings, volume: Number(e.target.value) })} /></label>
    <fieldset className="graphics-choice"><legend>Graphics</legend><div>{(['low', 'medium', 'high'] as const).map(preset => <button key={preset} aria-pressed={settings.graphics === preset} onClick={() => onChange({ ...settings, graphics: preset as GraphicsPreset })}>{preset}</button>)}</div><p>Medium is a good starting point. Lower graphics reduce resolution and shadows.</p></fieldset>
    <label className="setting-row"><span>Full controls legend<small>Show action keys; movement keys always stay visible</small></span><input type="checkbox" checked={settings.showHints} onChange={e => onChange({ ...settings, showHints: e.target.checked })} /></label>
    <ControlsSettings controls={settings.controls} onChange={controls => onChange({ ...settings, controls })} />
    <div className="settings-links"><button onClick={() => onChange({ ...DEFAULT_SETTINGS })}>Restore defaults</button><button onClick={onAbout}>About & credits</button></div>
    <button className="primary-button" onClick={onClose}>Done</button>
  </Dialog>;
}
