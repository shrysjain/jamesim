import { ACTION_LABELS, keyLabel } from '../controls';
import type { Action, Controls } from '../controls';
import type { RobotDefinition } from '../robot/RobotDefinition';

const MOVEMENT = [['forward', 'Forward'], ['left', 'Left'], ['backward', 'Back'], ['right', 'Right']] as const;

export function ControlsHint({ controls, expanded, robot, humanSupply, onExpand }: {
  controls: Controls; expanded: boolean; robot: RobotDefinition; humanSupply: boolean; onExpand: () => void;
}) {
  const actions: Action[] = ['turnLeft', 'turnRight', 'intake', 'shoot', 'reverse'];
  if (robot.intake.stowTravel) actions.push('toggleIntake');
  if (robot.mechanisms.climb) actions.push('climb', 'lower');
  if (humanSupply) actions.push('supply');
  actions.push('restart', 'pause');
  const binding = (action: Action) => controls.keys[action].map(keyLabel).join(' / ') || 'Unbound';

  return <section className="drive-hints" aria-label="Keyboard controls">
    <div className="controls-summary">
      <div className="movement-keys" aria-label="Movement keys">
        {MOVEMENT.map(([action, label]) => <span key={action} title={binding(action)}><kbd>{keyLabel(controls.keys[action][0])}</kbd>{label}</span>)}
      </div>
      <button type="button" aria-expanded={expanded} aria-controls={expanded ? 'driving-action-keys' : undefined} onClick={onExpand}>{expanded ? 'Fewer controls' : 'More controls'}</button>
    </div>
    {expanded && <div className="action-keys" id="driving-action-keys">
      {actions.map(action => <span key={action}><kbd>{binding(action)}</kbd>{ACTION_LABELS[action]}</span>)}
      <span><kbd>Enter / Esc</kbd>Pause</span><span><kbd>H</kbd>Full controls</span>
    </div>}
  </section>;
}
