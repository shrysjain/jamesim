import { describe, it, expect } from 'vitest';
import { MatchRules, DEFAULT_MATCH, MATCH_HZ } from './MatchRules';
import type { MatchConfig, MatchPhase, ProcessedFuel } from './MatchRules';

function setup(config: Partial<MatchConfig> = {}) { const m = new MatchRules(); m.start({ ...DEFAULT_MATCH, ...config }); return m; }
function to(m: MatchRules, seconds: number) { const tick = Math.round(seconds * MATCH_HZ); while (Math.round(m.elapsed * MATCH_HZ) < tick) m.advance(); }
const event = (sequence: number, alliance: 'blue' | 'red', time: number, id = 0): ProcessedFuel => ({ sequence, alliance, id, enteredAt: time - 0.35, processedAt: time });
function blueWins() { const m = setup(); to(m, 1); m.recordProcessed(event(1, 'blue', 1)); to(m, 23); return m; }

describe('REBUILT fixed-tick fuel match rules', () => {
  it('uses the full official phase timeline, disabled processing gaps, and teleop countdown', () => {
    const m = setup();
    const boundaries: [number, MatchPhase, boolean][] = [[0, 'Auto', true], [20, 'Auto scoring', false], [23, 'Transition', true],
      [33, 'Shift 1', true], [58, 'Shift 2', true], [83, 'Shift 3', true], [108, 'Shift 4', true], [133, 'Endgame', true], [163, 'Final scoring', false], [166, 'Complete', false]];
    for (const [seconds, phase, drive] of boundaries) {
      to(m, seconds); expect(m.phase).toBe(phase); expect(m.driverEnabled).toBe(drive);
      expect(m.actuatorsEnabled).toBe(phase === 'Auto' || drive);
      if (drive) expect(m.telemetry.remaining).toBe(phase === 'Auto' ? 20 : 163 - seconds);
    }
    m.advance(); expect(m.elapsed).toBe(166);
  });

  it('includes late auto processing before locking the shift order and alternates all four shifts', () => {
    const m = setup(); to(m, 1); m.recordProcessed(event(1, 'blue', 1));
    to(m, 23 - 1 / MATCH_HZ); m.recordProcessed(event(2, 'red', 22.999)); m.recordProcessed(event(3, 'red', 22.9995)); m.advance();
    expect(m.telemetry.firstInactive).toBe('red'); expect(m.telemetry.selectionReason).toBe('Auto fuel');
    for (const [time, redActive] of [[33, false], [58, true], [83, false], [108, true]] as const) {
      to(m, time); expect(m.light('red').active).toBe(redActive); expect(m.light('blue').active).toBe(!redActive);
    }
    to(m, 133); expect(m.light('blue').active && m.light('red').active).toBe(true);
  });

  it('chooses tied auto hub order from the match seed reproducibly', () => {
    for (const [seed, expected] of [[0, 'blue'], [1000, 'red']] as const) {
      const first = setup({ seed }), second = setup({ seed }); to(first, 23); to(second, 23);
      expect(first.telemetry.firstInactive).toBe(expected); expect(second.telemetry.firstInactive).toBe(expected);
      expect(first.telemetry.selectionReason).toBe('Seeded tie');
    }
  });

  it('scores sensor events through the shutdown grace window and rejects inactive-hub fuel afterward', () => {
    const m = blueWins(); to(m, 36 - 1 / MATCH_HZ);
    expect(m.light('blue')).toMatchObject({ active: false });
    m.recordProcessed(event(2, 'blue', 35.999)); m.advance(); m.recordProcessed(event(3, 'blue', 36)); m.recordProcessed(event(4, 'red', 36));
    expect(m.telemetry.blue).toMatchObject({ auto: 1, teleop: 1, inactive: 1 }); expect(m.telemetry.red.teleop).toBe(1);
    to(m, 61 - 1 / MATCH_HZ); m.recordProcessed(event(5, 'red', 60.999)); m.advance(); m.recordProcessed(event(6, 'red', 61));
    expect(m.telemetry.red).toMatchObject({ teleop: 2, inactive: 1 });
  });

  it('attributes the auto boundary correctly and assesses final fuel before freezing results', () => {
    const m = setup(); to(m, 23 - 1 / MATCH_HZ); m.recordProcessed(event(1, 'blue', 22.999)); m.advance();
    m.recordProcessed(event(2, 'blue', 23)); expect(m.telemetry.blue).toMatchObject({ auto: 1, teleop: 1 });
    to(m, 166 - 1 / MATCH_HZ); m.recordProcessed(event(3, 'blue', 165.999)); m.recordProcessed(event(4, 'blue', 166)); m.advance();
    expect(m.telemetry.blue).toMatchObject({ auto: 1, teleop: 2, late: 1 });
    const frozen = m.telemetry.blue; m.recordProcessed(event(5, 'blue', 165)); expect(m.telemetry.blue).toEqual(frozen);
  });

  it('deduplicates by passage sequence while allowing the same fuel ID to score on another cycle', () => {
    const m = setup(); to(m, 1); const first = event(1, 'blue', 1, 42);
    m.recordProcessed(first); m.recordProcessed(first); expect(m.telemetry.blue.total).toBe(1);
    to(m, 2); m.recordProcessed(event(2, 'blue', 2, 42)); expect(m.telemetry.blue.total).toBe(2);
    m.start({ ...DEFAULT_MATCH }); to(m, 1); m.recordProcessed(first); expect(m.telemetry.blue.total).toBe(1);
  });

  it.each([
    ['regional', 100, true, false], ['regional', 360, true, true],
    ['districtChampionship', 239, false, false], ['districtChampionship', 240, true, false],
    ['championship', 360, true, false], ['championship', 500, true, true],
  ] as const)('applies %s fuel targets at %i points', (profile, points, energized, supercharged) => {
    const m = setup({ profile }); to(m, 1);
    for (let i = 0; i < points; i++) m.recordProcessed(event(i + 1, 'blue', 1));
    expect(m.telemetry.blue).toMatchObject({ total: points, energized, supercharged });
  });

  it('reports upcoming shutdown pulses and transition chase lights', () => {
    const m = blueWins(); expect(m.light('blue').chase).toBe(true); expect(m.light('red').chase).toBe(false);
    to(m, 30); expect(m.light('blue').warning).toBe(true); expect(m.light('red').warning).toBe(false);
    to(m, 33); expect(m.light('blue')).toMatchObject({ active: false, warning: false, graceRemaining: 3 });
    to(m, 160); expect(m.light('blue').warning && m.light('red').warning).toBe(true);
    to(m, 163); expect(m.light('blue')).toMatchObject({ active: false, warning: false, graceRemaining: 3 });
  });

  it('ends early with a bounded final assessment, without extending an already inactive hub window', () => {
    const auto = setup(); to(auto, 5); auto.endEarly(); expect(auto.phase).toBe('Final scoring'); expect(auto.actuatorsEnabled).toBe(false);
    to(auto, 8 - 1 / MATCH_HZ); auto.recordProcessed(event(1, 'blue', 7.999)); auto.advance();
    expect(auto.telemetry).toMatchObject({ complete: true, endedEarly: true }); expect(auto.telemetry.blue.auto).toBe(1);
    const teleop = blueWins(); to(teleop, 35); teleop.endEarly(); to(teleop, 37);
    teleop.recordProcessed(event(2, 'blue', 37)); teleop.recordProcessed(event(3, 'red', 37));
    expect(teleop.telemetry.blue.inactive).toBe(1); expect(teleop.telemetry.red.teleop).toBe(1);
    to(teleop, 38); expect(teleop.phase).toBe('Complete');
  });

  it('ignores malformed/future events and keeps free practice independent of match scores', () => {
    const m = setup(); to(m, 1);
    m.recordProcessed(event(1, 'blue', 2)); m.recordProcessed({ ...event(2, 'blue', 1), enteredAt: 3 }); m.recordProcessed(event(0, 'red', 1));
    m.recordProcessed({ ...event(3, 'blue', 1), enteredAt: NaN }); m.recordProcessed({ ...event(4, 'red', 1), processedAt: Infinity });
    expect(m.telemetry.blue.total + m.telemetry.red.total).toBe(0);
    m.reset(); m.advance(); m.recordProcessed(event(1, 'blue', 0));
    expect(m.phase).toBe('Practice'); expect(m.elapsed).toBe(0); expect(m.driverEnabled).toBe(true); expect(m.telemetry.blue.total).toBe(0);
  });
});
