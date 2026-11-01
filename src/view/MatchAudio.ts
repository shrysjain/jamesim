import { MATCH_SOUNDS, matchCuesBetween } from '../sim/MatchCues';
import type { MatchCue } from '../sim/MatchCues';
import type { MatchTelemetry } from '../sim/MatchRules';

/** One unlocked browser audio context; local samples follow simulation time. */
export class MatchAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<MatchCue, Promise<AudioBuffer>>();
  private voices = new Set<AudioBufferSourceNode>();
  private enabled = true;
  private previous = 0;
  private generation = 0;
  private stopped = false;
  private disposed = false;
  private playing = false;

  unlock = () => {
    if (this.disposed) return;
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => {});
    if (!this.buffers.size) for (const sound of MATCH_SOUNDS) {
      if (this.buffers.has(sound)) continue;
      const buffer = fetch(`/audio/frc/${sound}.wav`).then(r => {
        if (!r.ok) throw new Error(`Match sound unavailable: ${sound}`);
        return r.arrayBuffer();
      }).then(bytes => this.context!.decodeAudioData(bytes));
      this.buffers.set(sound, buffer);
      void buffer.catch(error => console.warn(error));
    }
  };
  setEnabled(enabled: boolean) { this.enabled = enabled; if (!enabled) this.stopVoices(); }
  reset(match = false) {
    this.stopVoices(); this.previous = match ? -1 : 0; this.stopped = false; this.playing = match;
  }
  update(match: MatchTelemetry, running: boolean) {
    this.playing = running;
    if (match.mode !== 'match') return;
    if (!running) { if (this.voices.size) this.stopVoices(); return; }
    if (match.endedEarly) {
      if (!this.stopped) this.play('abort');
      this.stopped = true;
    } else for (const cue of matchCuesBetween(this.previous, match.elapsed)) this.play(cue.sound);
    this.previous = match.elapsed;
  }
  private play(sound: MatchCue) {
    if (!this.enabled || !this.context) return;
    const generation = this.generation;
    void this.buffers.get(sound)?.then(buffer => {
      if (this.disposed || generation !== this.generation || !this.enabled || !this.playing || this.context?.state !== 'running') return;
      const voice = this.context.createBufferSource(), gain = this.context.createGain();
      voice.buffer = buffer; gain.gain.value = 0.55;
      voice.connect(gain).connect(this.context.destination);
      voice.onended = () => { this.voices.delete(voice); voice.disconnect(); gain.disconnect(); };
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
