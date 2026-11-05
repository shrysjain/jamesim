import { ACTIONS, ACTION_LABELS } from '../controls';
import type { Controls } from '../controls';
import { controllerButtonLabel } from '../controllerLabels';
import type { RobotDefinition } from '../robot/types';
import { supportsIntakeToggle } from '../robot/poses';

export function ControllerGuide({ controls, robot, humanSupply }: { controls: Controls; robot: RobotDefinition; humanSupply: boolean }) {
  if (!controls.gamepad) return null;
  const supported = (action: string) => (action !== 'climb' || robot.mechanisms.climb)
    && (action !== 'toggleIntake' || supportsIntakeToggle(robot))
    && (action !== 'supply' || humanSupply)
    && (action !== 'switchIntake' || 'opposed' in robot.intake && !!robot.intake.opposed);
  return <section aria-label="Controller bindings">
    <h3>Controller</h3>
    <p>Left stick moves and strafes; right stick left/right turns. Button names use the standard Xbox / PlayStation layout. View or change these saved assignments in Settings.</p>
    <dl>{ACTIONS.filter(a => supported(a) && controls.buttons[a] !== null).map(a => <div key={a}><dt>{ACTION_LABELS[a]}</dt><dd>{controllerButtonLabel(controls.buttons[a])}</dd></div>)}</dl>
  </section>;
}
