import { describe, expect, it } from 'vitest';
import { matchCuesBetween } from './MatchCues';

describe('match audio timing', () => {
  it('uses the 2026 AUTO, teleop, shift, endgame and end boundaries exactly once', () => {
    const times = [-1, 0, 19.99, 20, 22.99, 23, 33, 58, 83, 108, 133, 163, 166];
    const cues = times.slice(1).flatMap((time, i) => matchCuesBetween(times[i], time));
    expect(cues.map(c => [c.at, c.sound])).toEqual([[0, 'start'], [20, 'end'], [23, 'resume'],
      [33, 'shift_change'], [58, 'shift_change'], [83, 'shift_change'], [108, 'shift_change'], [133, 'warning'], [163, 'end']]);
    expect(matchCuesBetween(33, 33)).toEqual([]); // Pause/resume cannot replay a boundary.
    expect(matchCuesBetween(166, 167)).toEqual([]);
  });
});
