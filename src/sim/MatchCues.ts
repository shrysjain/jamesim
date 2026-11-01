export type MatchCue = 'start' | 'end' | 'resume' | 'shift_change' | 'warning' | 'abort';
/** Manual Table 5-4; times use the simulation clock, including the AUTO gap. */
export const MATCH_CUES: readonly { at: number; sound: MatchCue }[] = [
  { at: 0, sound: 'start' }, { at: 20, sound: 'end' }, { at: 23, sound: 'resume' },
  ...[33, 58, 83, 108].map(at => ({ at, sound: 'shift_change' as const })),
  { at: 133, sound: 'warning' }, { at: 163, sound: 'end' },
];
export const matchCuesBetween = (previous: number, current: number) => MATCH_CUES.filter(c => c.at > previous && c.at <= current);
export const MATCH_SOUNDS: readonly MatchCue[] = ['start', 'end', 'resume', 'shift_change', 'warning', 'abort'];
