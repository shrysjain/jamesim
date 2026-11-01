import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY, readSettings, saveSettings, validateSettings } from './settings';

afterEach(() => vi.unstubAllGlobals());
describe('saved player settings', () => {
  it('rejects obsolete or malformed data and validates individual fields', () => {
    for (const value of [null, [], 'bad', { version: 0, volume: 0 }]) expect(validateSettings(value)).toEqual(DEFAULT_SETTINGS);
    expect(validateSettings({ version: 1, volume: 4, muted: 'false', graphics: 'ultra' }))
      .toEqual({ ...DEFAULT_SETTINGS, volume: 1 });
    expect(validateSettings({ version: 1, volume: NaN })).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trips choices through storage and survives unavailable storage', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key), setItem: (key: string, value: string) => data.set(key, value) });
    const chosen = { ...DEFAULT_SETTINGS, volume: 0.25, muted: true, graphics: 'low' as const };
    saveSettings(chosen); expect(readSettings()).toEqual(chosen);
    data.set(SETTINGS_KEY, '{broken'); expect(readSettings()).toEqual(DEFAULT_SETTINGS);
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('full'); } });
    expect(readSettings()).toEqual(DEFAULT_SETTINGS); expect(() => saveSettings(chosen)).not.toThrow();
  });
});
