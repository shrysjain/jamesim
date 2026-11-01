import { DEFAULT_CONTROLS, validateControls } from './controls';
import type { Controls } from './controls';
export type GraphicsPreset = 'low' | 'medium' | 'high';
export type Settings = { version: 1; volume: number; muted: boolean; graphics: GraphicsPreset; controls: Controls };
export const DEFAULT_SETTINGS: Settings = { version: 1, volume: 0.7, muted: false, graphics: 'medium', controls: validateControls(DEFAULT_CONTROLS) };
export const SETTINGS_KEY = 'jamesim.settings';
export const GRAPHICS = {
  low: { pixelRatio: 1, shadowSize: 0 },
  medium: { pixelRatio: 1.25, shadowSize: 1024 },
  high: { pixelRatio: 1.75, shadowSize: 2048 },
} as const;

export function validateSettings(value: unknown): Settings {
  const defaults = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== 'object') return defaults;
  const s = value as Record<string, unknown>;
  if (s.version !== 1) return defaults;
  return { ...defaults, controls: validateControls(s.controls),
    volume: typeof s.volume === 'number' && Number.isFinite(s.volume) ? Math.max(0, Math.min(1, s.volume)) : defaults.volume,
    muted: typeof s.muted === 'boolean' ? s.muted : defaults.muted,
    graphics: s.graphics === 'low' || s.graphics === 'medium' || s.graphics === 'high' ? s.graphics : defaults.graphics,
  };
}
export function readSettings(): Settings {
  try { return validateSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')); }
  catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(settings: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(validateSettings(settings))); }
  catch { /* Private browsing or a full store must not prevent play. */ }
}
