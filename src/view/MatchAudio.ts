import { MATCH_SOUNDS, matchCuesBetween } from '../sim/MatchCues';
import type { MatchCue } from '../sim/MatchCues';
import type { MatchTelemetry } from '../sim/MatchRules';
import { runtimeAsset } from '../runtimeAssets';

/** Browser audio follows simulation boundaries; it never advances the match. */
export class MatchAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private samples = new Map<MatchCue, ArrayBuffer>();
  private buffers = new Map<MatchCue, Promise<AudioBuffer>>();
  private voices = new Set<AudioBufferSourceNode>();
  private volume = 0.7;
  private muted = false;
  private previous = 0;
  private generation = 0;
  private stopped = false;
  private disposed = false;
  private playing = false;

  async prepare() {
    await Promise.all(MATCH_SOUNDS.map(async sound => {
      const response = await fetch(runtimeAsset(`/audio/frc/${sound}.wav`));
      if (!response.ok) throw new Error(`Match sound unavailable: ${sound}. Check the local asset pack.`);
      const bytes = await response.arrayBuffer();
      if (!this.disposed) this.samples.set(sound, bytes);
    }));
  }
  unlock = () => {
    if (this.disposed || !globalThis.AudioContext) return;
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain();
        this.master.connect(this.context.destination); this.applyLevel();
      }
      void this.context.resume().catch(() => {});
      for (const [sound, sample] of this.samples) {
        if (this.buffers.has(sound)) continue;
        const decoded = this.context.decodeAudioData(sample.slice(0));
        this.buffers.set(sound, decoded); void decoded.catch(() => {});
      }
    } catch { /* Browsers without available audio can still run the game. */ }
  };
  setLevel(volume: number, muted: boolean) {
    this.volume = volume; this.muted = muted; this.applyLevel();
    if (muted || volume === 0) this.stopVoices();
  }
  private applyLevel() {
    if (this.master && this.context) this.master.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.55, this.context.currentTime);
  }
  reset(match = false) {
    this.stopVoices(); this.previous = match ? -1 : 0; this.stopped = false; this.playing = match;
  }
  update(match: MatchTelemetry, running: boolean) {
    this.playing = running;
    if (match.mode !== 'match') return;
    if (!running) { this.stopVoices(); return; }
    if (match.endedEarly) {
      if (!this.stopped) this.play('abort');
      this.stopped = true;
    } else for (const cue of matchCuesBetween(this.previous, match.elapsed)) this.play(cue.sound);
    // Advance even while audio is locked: never replay an old start cue later.
    this.previous = match.elapsed;
  }
  private play(sound: MatchCue) {
    if (this.muted || this.volume === 0 || this.context?.state !== 'running') return;
    const generation = this.generation, requestedAt = performance.now();
    void this.buffers.get(sound)?.then(buffer => {
      if (this.disposed || generation !== this.generation || this.muted || !this.playing || this.context?.state !== 'running' || performance.now() - requestedAt > 250) return;
      const voice = this.context.createBufferSource(); voice.buffer = buffer;
      voice.connect(this.master!);
      voice.onended = () => { this.voices.delete(voice); voice.disconnect(); };
      this.voices.add(voice); voice.start();
    }).catch(() => {});
  }
  private stopVoices() {
    this.generation++;
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
  }
  dispose() { this.disposed = true; this.stopVoices(); void this.context?.close(); }
}
