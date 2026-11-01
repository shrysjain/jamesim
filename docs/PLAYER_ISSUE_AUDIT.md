# Player-reported issue audit

This pass responds to the report that High Tide movement, clipping, intake motion,
model accuracy, key selection, buttons and shooting were broken. The earlier
release notes overstated readiness: simulation checks did not establish that the
whole player experience or 4414 model was complete.

## Confirmed fixes

- **Key selection and controls:** key capture belongs to the focused rebind button;
  clicking another control cancels capture. Escape cancels the binding without
  closing Settings. New default keys cannot steal explicit saved bindings.
  Unbound keys are displayed safely. Num-pad/navigation mappings are supported.
  Audio-only changes preserve held movement. Disabled-period transitions discard
  stale inputs and keyboard repeats cannot revive them.
- **Session choices and buttons:** reopening setup preserves practice mode;
  restart retains session type. Left/right spawn labels match the selected driver
  view while the default physical spawn remains unchanged. Pause/restart labels
  and hints follow the active session/mappings. Foul buttons show their awarded
  points; unavailable climber/supply actions are omitted from driving hints.
- **Mechanism reuse and High Tide:** its sliding intake now has translation in
  simulation, collision proxies, cargo positions and rendering. Hopper sides and
  rear now have collision surfaces. Bump support considers the longer intake.
  `V` (rebindable) toggles extension once per press; a queued command prevents
  short taps between frames from being lost. Intake/reverse requests deploy it,
  shooting compresses it as space becomes available, and cargo limits retraction.
  The HUD reports extension state. The linear assembly moves together, while
  2910 retains its previously approved fixed-hopper behavior.
- **Shooting:** turret robots no longer inherit the fixed-shooter chassis-turn
  lockout. Turret prediction compensates for translation and chassis yaw. Physical
  hub-entry regressions require at least 7/8 standing shots and 6/8 while moving
  and turning, not merely successful launches.
- **Climbing:** the existing trainer reports whether to approach, face the tower,
  stop, attach, raise, hold or lower. It remains a simplified original trainer.
- **Rules:** an early stop before teleop remains an AUTO assessment even if the
  final grace interval crosses the teleop-start timestamp.

## Verification and limits

The full suite passed 107 tests across 14 files. Following the final turret
prediction change, all eight player regression cases passed again, including
physical scored shots and checking the entire intake/hopper collision envelope
while driving across the prepared field. Production build, source asset integrity,
TypeScript and production payload checks pass.

An isolated browser with **drawing disabled** and real simulation/input events
passed robot selection, practice preservation, rebind/save/cancel, dropdown
isolation, rebound movement, pause/resume/restart, help, credits, restore defaults,
intake toggling, foul feedback, simulated controller pause/resume and results
restart. This does not establish visual fidelity or desktop performance.

**Still unresolved:** the 4414 model is procedural, not original team CAD. Intake
travel and performance rates remain estimates; the numeric FRSim profile has not
been verified. An original CAD/model source is needed to close the model-accuracy
request. Manual foul entry and the fictional tower trainer do not constitute a
complete competition robot/referee simulation. This pass should not be described
as completing all six original bullets.
