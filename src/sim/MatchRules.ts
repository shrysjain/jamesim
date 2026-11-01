import { ROBOTS } from '../robot/RobotDefinition';
import type { RobotId } from '../robot/RobotDefinition';
import type { Alliance } from '../field/targets';

export const MATCH_HZ = 120;
export const MATCH_TIMES = { autoEnd: 20, teleopStart: 23, teleopEnd: 163, complete: 166, processingGrace: 3 };
export const EVENT_PROFILES = {
  regional: { label: 'Regional / district', energized: 100, supercharged: 360, traversal: 50 },
  districtChampionship: { label: 'District championship', energized: 240, supercharged: 360, traversal: 50 },
  championship: { label: 'FIRST Championship', energized: 360, supercharged: 500, traversal: 50 },
} as const;
export type MatchConfig = { profile: keyof typeof EVENT_PROFILES; preloads: number; seed: number; alliance?: Alliance; spawn?: 'left' | 'center' | 'right'; robot?: RobotId; humanSupply?: boolean };
export const DEFAULT_MATCH: MatchConfig = { profile: 'regional', preloads: 8, seed: 2026 };
export type MatchPhase = 'Practice' | 'Auto' | 'Auto scoring' | 'Transition' | 'Shift 1' | 'Shift 2' | 'Shift 3' | 'Shift 4' | 'Endgame' | 'Final scoring' | 'Complete';
const PHASES: { phase: MatchPhase; start: number; end: number; drive: boolean }[] = [
  { phase: 'Auto', start: 0, end: 20, drive: true }, { phase: 'Auto scoring', start: 20, end: 23, drive: false },
  { phase: 'Transition', start: 23, end: 33, drive: true }, { phase: 'Shift 1', start: 33, end: 58, drive: true },
  { phase: 'Shift 2', start: 58, end: 83, drive: true }, { phase: 'Shift 3', start: 83, end: 108, drive: true },
  { phase: 'Shift 4', start: 108, end: 133, drive: true }, { phase: 'Endgame', start: 133, end: 163, drive: true },
  { phase: 'Final scoring', start: 163, end: 166, drive: false },
];
export type ProcessedFuel = { sequence: number; id: number; alliance: Alliance; enteredAt: number; processedAt: number };
type FuelScore = { autoTower: number; teleopTower: number; penalties: number; auto: number; teleop: number; inactive: number; late: number };
export type HubLight = { active: boolean; warning: boolean; chase: boolean; graceRemaining: number };
export type MatchTelemetry = {
  mode: 'practice' | 'match'; phase: MatchPhase; elapsed: number; remaining: number; phaseRemaining: number;
  driverEnabled: boolean; actuatorsEnabled: boolean; complete: boolean; endedEarly: boolean;
  firstInactive: Alliance | null; selectionReason: 'Auto fuel' | 'Seeded tie' | null; config: MatchConfig;
  blue: FuelScore & { total: number; energized: boolean; supercharged: boolean; traversal: boolean; fuelTotal: number; bonusRP: number };
  red: FuelScore & { total: number; energized: boolean; supercharged: boolean; traversal: boolean; fuelTotal: number; bonusRP: number };
  lights: Record<Alliance, HubLight>;
};
const emptyScore = (): FuelScore => ({ autoTower: 0, teleopTower: 0, penalties: 0, auto: 0, teleop: 0, inactive: 0, late: 0 });

/** Pure fixed-tick fuel-match rules. Physics, rendering and wall-clock time stay outside. */
export class MatchRules {
  mode: 'practice' | 'match' = 'practice';
  config = { ...DEFAULT_MATCH };
  private tick = 0;
  private scores = { blue: emptyScore(), red: emptyScore() };
  private seen = new Set<number>();
  private stoppedAt: number | null = null;
  private firstInactive: Alliance | null = null;
  private selectionReason: MatchTelemetry['selectionReason'] = null;
  get elapsed() { return this.tick / MATCH_HZ; }
  private get finishAt() { return this.stoppedAt === null ? MATCH_TIMES.complete : this.stoppedAt + MATCH_TIMES.processingGrace; }
  private get cutoff() { return this.stoppedAt ?? MATCH_TIMES.teleopEnd; }
  get phase(): MatchPhase {
    if (this.mode === 'practice') return 'Practice';
    if (this.elapsed >= this.finishAt) return 'Complete';
    if (this.stoppedAt !== null) return 'Final scoring';
    return PHASES.find(p => this.elapsed >= p.start && this.elapsed < p.end)!.phase;
  }
  get driverEnabled() { return this.mode === 'practice' || !!PHASES.find(p => p.phase === this.phase)?.drive; }
  get actuatorsEnabled() { return this.mode === 'practice' || this.phase === 'Auto' || this.driverEnabled; }
  start(config: MatchConfig) {
    this.reset(); this.mode = 'match';
    this.config = { alliance: config.alliance === 'red' ? 'red' : 'blue', spawn: config.spawn === 'left' || config.spawn === 'center' ? config.spawn : 'right', humanSupply: config.humanSupply === true, robot: config.robot && Object.hasOwn(ROBOTS, config.robot) ? config.robot : '2910-reblitz', profile: Object.hasOwn(EVENT_PROFILES, config.profile) ? config.profile : 'regional',
      preloads: Number.isFinite(config.preloads) ? Math.max(0, Math.min(8, Math.floor(config.preloads))) : 8, seed: config.seed >>> 0 };
  }
  reset() {
    this.mode = 'practice'; this.tick = 0; this.scores = { blue: emptyScore(), red: emptyScore() };
    this.seen.clear(); this.stoppedAt = null; this.firstInactive = this.selectionReason = null;
  }
  advance() {
    if (this.mode !== 'match' || this.phase === 'Complete') return;
    this.tick++;
    if (this.elapsed >= MATCH_TIMES.teleopStart) this.resolveAuto();
  }
  endEarly() { if (this.mode === 'match' && this.stoppedAt === null && this.elapsed < MATCH_TIMES.teleopEnd) this.stoppedAt = this.elapsed; }
  private resolveAuto() {
    if (this.firstInactive) return;
    const { blue, red } = this.scores;
    if (blue.auto !== red.auto) { this.firstInactive = blue.auto > red.auto ? 'blue' : 'red'; this.selectionReason = 'Auto fuel'; }
    else {
      const random = (Math.imul(this.config.seed, 1664525) + 1013904223) >>> 0;
      this.firstInactive = random < 0x80000000 ? 'blue' : 'red'; this.selectionReason = 'Seeded tie';
    }
  }
  private activeIntervals(alliance: Alliance) {
    const selected = this.firstInactive ?? 'blue';
    const candidates: [number, number][] = [[0, 20], [23, 33]];
    for (let i = 0; i < 4; i++) if ((i % 2 === 0) !== (alliance === selected)) candidates.push([33 + i * 25, 58 + i * 25]);
    candidates.push([133, 163]);
    const intervals: [number, number][] = [];
    for (const [start, originalEnd] of candidates) {
      const end = Math.min(originalEnd, this.cutoff);
      if (start >= end) continue;
      const previous = intervals.at(-1);
      if (previous?.[1] === start) previous[1] = end;
      else intervals.push([start, end]);
    }
    return intervals;
  }
  /** Assess managed sensor passage, including the official three-second processing windows. */
  recordProcessed(event: ProcessedFuel) {
    if (this.mode !== 'match' || this.phase === 'Complete' || !Number.isInteger(event.sequence) || event.sequence < 1 || this.seen.has(event.sequence)) return;
    if (!Number.isFinite(event.enteredAt) || !Number.isFinite(event.processedAt) || !['blue', 'red'].includes(event.alliance)
      || event.processedAt < event.enteredAt || event.processedAt < 0 || event.processedAt > this.elapsed + 1 / MATCH_HZ + 1e-7) return;
    this.seen.add(event.sequence);
    if (event.processedAt >= MATCH_TIMES.teleopStart) this.resolveAuto();
    const score = this.scores[event.alliance], time = event.processedAt;
    if (time >= this.finishAt) { score.late++; return; }
    const interval = this.activeIntervals(event.alliance).find(([start, end]) => time >= start && time < end + MATCH_TIMES.processingGrace);
    if (!interval) { score.inactive++; return; }
    if (interval[0] === 0) score.auto++;
    else score.teleop++;
  }
  light(alliance: Alliance): HubLight {
    if (this.mode === 'practice') return { active: true, warning: false, chase: false, graceRemaining: 0 };
    const time = this.elapsed, intervals = this.activeIntervals(alliance);
    const interval = intervals.find(([start, end]) => time >= start && time < end);
    const grace = intervals.find(([start, end]) => time >= start && time >= end && time < end + MATCH_TIMES.processingGrace);
    return { active: !!interval, warning: !!interval && interval[1] - time <= 3,
      chase: this.phase === 'Transition' && this.firstInactive === alliance,
      graceRemaining: grace ? grace[1] + MATCH_TIMES.processingGrace - time : 0 };
  }
  assessTower(alliance: Alliance, level: number, period: 'auto' | 'teleop') {
    if (this.mode !== 'match' || this.phase === 'Complete' || !Number.isInteger(level) || level < 0 || level > 3) return;
    this.scores[alliance][period === 'auto' ? 'autoTower' : 'teleopTower'] = period === 'auto' ? (level ? 15 : 0) : level * 10;
  }
  recordPenalty(offender: Alliance, major: boolean) {
    if (this.mode !== 'match' || !this.driverEnabled) return;
    this.scores[offender === 'blue' ? 'red' : 'blue'].penalties += major ? 15 : 5;
  }
  get telemetry(): MatchTelemetry {
    const phase = this.phase, time = this.elapsed, profile = EVENT_PROFILES[this.config.profile];
    const read = (score: FuelScore) => ({ ...score, total: score.auto + score.teleop + score.autoTower + score.teleopTower + score.penalties, fuelTotal: score.auto + score.teleop, traversal: score.autoTower + score.teleopTower >= profile.traversal, bonusRP: Number(score.auto + score.teleop >= profile.energized) + Number(score.auto + score.teleop >= profile.supercharged) + Number(score.autoTower + score.teleopTower >= profile.traversal),
      energized: score.auto + score.teleop >= profile.energized, supercharged: score.auto + score.teleop >= profile.supercharged });
    return { mode: this.mode, phase, elapsed: time, remaining: phase === 'Auto' ? 20 - time : this.driverEnabled && this.mode === 'match' ? 163 - time : 0,
      phaseRemaining: this.mode === 'practice' || phase === 'Complete' ? 0 : this.stoppedAt !== null ? this.finishAt - time : PHASES.find(p => p.phase === phase)!.end - time,
      driverEnabled: this.driverEnabled, actuatorsEnabled: this.actuatorsEnabled, complete: phase === 'Complete', endedEarly: this.stoppedAt !== null,
      firstInactive: this.firstInactive, selectionReason: this.selectionReason, config: { ...this.config }, blue: read(this.scores.blue), red: read(this.scores.red),
      lights: { blue: this.light('blue'), red: this.light('red') } };
  }
}
