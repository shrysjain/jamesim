import { afterEach, describe, expect, it, vi } from 'vitest';
import { MatchAudio } from './MatchAudio';
import { MatchRules, DEFAULT_MATCH } from '../sim/MatchRules';

let plays = 0, stops = 0, gain = 0;
class FakeAudioContext {
  state = 'suspended'; currentTime = 0;
  destination = {};
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { return Promise.resolve(); }
  decodeAudioData() { return Promise.resolve({}); }
  createGain() { return { gain: { setValueAtTime: (n: number) => { gain = n; } }, connect() {} }; }
  createBufferSource() { return { buffer: null, onended: null, connect() {}, disconnect() {}, start: () => { plays++; }, stop: () => { stops++; } }; }
}
async function setup() {
  plays = stops = gain = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
  const audio = new MatchAudio(), rules = new MatchRules(); rules.start(DEFAULT_MATCH);
  await audio.prepare(); audio.reset(true);
  return { audio, rules };
}
afterEach(() => vi.unstubAllGlobals());
describe('browser match audio', () => {
  it('drops the locked first-load cue and plays subsequent boundaries after a gesture', async () => {
    const { audio, rules } = await setup();
    try {
      audio.update(rules.telemetry, true); audio.unlock(); await Promise.resolve();
      audio.update({ ...rules.telemetry, elapsed: 1 }, true); await Promise.resolve(); expect(plays).toBe(0);
      audio.update({ ...rules.telemetry, elapsed: 20 }, true); await Promise.resolve(); expect(plays).toBe(1);
      audio.update({ ...rules.telemetry, elapsed: 20 }, true); await Promise.resolve(); expect(plays).toBe(1);
    } finally { audio.dispose(); }
  });
  it('applies live volume and cancels voices on mute, pause and restart', async () => {
    const { audio, rules } = await setup();
    try {
      audio.unlock(); await Promise.resolve(); audio.setLevel(0.4, false);
      expect(gain).toBeCloseTo(0.4 * 0.55);
      audio.update(rules.telemetry, true); await Promise.resolve(); expect(plays).toBe(1);
      audio.setLevel(0.4, true); expect(gain).toBe(0); expect(stops).toBe(1);
      audio.update({ ...rules.telemetry, elapsed: 20 }, true); await Promise.resolve(); expect(plays).toBe(1);
      audio.setLevel(0.4, false); audio.update({ ...rules.telemetry, elapsed: 23 }, true); await Promise.resolve(); expect(plays).toBe(2);
      audio.update({ ...rules.telemetry, elapsed: 23 }, false); expect(stops).toBe(2);
      audio.reset(true); audio.update(rules.telemetry, true); audio.reset(true); await Promise.resolve(); expect(plays).toBe(2);
    } finally { audio.dispose(); }
  });
});
