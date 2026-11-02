import type { RobotDefinition } from '../robot/types';
import { robotFeatures, robotStats } from './robotStatData';

export function RobotStats({ robot, compact = false }: { robot: RobotDefinition; compact?: boolean }) {
  const stats = robotStats(robot);
  return <div className={`robot-spec${compact ? ' compact' : ''}`}>
    {!compact && <h3>Spec <span>2026 / REBUILT</span></h3>}
    <dl className="robot-stat-grid">
      {(compact ? stats.filter(s => ['Speed', 'Fire rate', 'Capacity'].includes(s.label)) : stats).map(stat =>
        <div className="robot-stat" key={stat.label} title={stat.note}>
          <dt>{stat.label}</dt><dd>{stat.value}</dd>
          {!compact && <div className="stat-meter" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} className={stat.amount !== null && i < Math.round(Math.min(1, stat.amount / stat.maximum) * 10) ? 'filled' : ''} />)}</div>}
        </div>)}
    </dl>
    <ul className="robot-features" aria-label="Robot features">{robotFeatures(robot).map(feature => <li key={feature}>{feature}</li>)}</ul>
  </div>;
}
