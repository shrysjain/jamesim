# Gate 3: Re•Blitz shooter bench

Hold **Space** to aim and shoot. WASD translation stays available; the aim controller owns yaw until Space is released. Q overrides shooting. Space also retracts the intake and deploys/latches the hopper; it takes priority over Shift. Release Space to cancel feeding and let the flywheel coast down. Pause/loss of focus clears the request and freezes simulation time. R retains carried IDs, returns pending feeds to storage, and stops the shooter; world reset clears mechanisms and restores all original fuel.

The HUD shows Hub/Pass, readiness, and RPM while shooting or coasting. Debug adds requested RPM, exit elevation, yaw error, four feed-lane meters, launch count, and airborne count. Launches are not scored entries. The existing follow camera and clean main screen remain in use.

## Target and aim

The [official TU22 manual](https://firstfrc.blob.core.windows.net/frc2026/Manual/2026GameManual.pdf), §5.3, defines a 158.6-inch alliance-zone depth. In the centered CAD frame, blue is +X, its wall is X = 8.27024 m, and the starting-line boundary is X = 4.24180 m. Red is mirrored. `src/field/targets.ts` records this geometry. The current practice robot is blue; the target helper supports both alliances.

Aim-assist mode uses the chassis center to choose the zone, rather than implementing the full bumper-overlap match rule. Inside the zone, target the CAD funnel center at X = ±3.6449 m, Z = 0, with a descending crossing at Y = 1.95 m. Outside, start with the nearest floor point 0.45 m inside the zone, preserving Z unless a guardrail margin requires clamping it. If no permitted arc clears the field there, try points farther into the zone in 0.2 m increments, up to 1 m extra. A central pass needs this adjustment to clear both the hub net and front rim within the hood limits. If none works, retain the ball and show Blocked or Out of range.

The solver searches descending flight times from 0.35–3.2 seconds. It selects a physical exit speed and hood angle, accounting for the robot's current translation, angular velocity at the muzzle, orientation, gravity, and the fuel's existing 0.15/s linear damping. Sphere sweeps check the proposed arc against static field geometry. Arc selection runs at 20 Hz; motion compensation and yaw error refresh at 120 Hz, including after each physics step and immediately when zone mode changes. Final per-lane muzzle and breech checks run at release time.

A bounded yaw controller requests module motion through the existing swerve tire-force model. It includes target-direction tracking while translating. It never sets chassis orientation or velocity. Feed readiness requires aim error under 1.5°, angular speed under 0.3 rad/s, hood error under 1°, flywheel speed within its tolerance, translation below 0.18 m/s and at least three wheel contacts. Pitch/roll are locked for gameplay. Translation remains subject to the shared module speed/traction limits. These checks intentionally hold shots when aggressive motion prevents an achievable solution.

## Mechanism and launch model

The retained [team technical binder](../assets/source/robots/2910-reblitz/technical-binder.pdf), pages 5 and 10, describes four-ball-wide handling, a 4-inch main drum, a flywheel with 6.7:1 overdrive, and measured sustained throughput up to 34 balls/s. The retained [team constants](https://github.com/FRCTeam2910/2026CompetitionRobot-Public/blob/921c85bf725fbd9c488eb7d557e0e065640da095/src/main/java/org/frc2910/robot/config/Constants.java) define 0–37° hood travel. These establish the architecture; they do not supply every simulator coefficient.

`src/sim/Shooter.ts` supplies all four lanes at Z = ±0.0762/±0.2286 m, a shared flywheel, finite hood slew, spin-up/coast, shot load and recovery. Each lane reserves an existing stored ID and follows a visible roughly 0.10-second feed path. Seeded duration/spacing variations stagger releases across the four lanes, with a 32 balls/s nominal feed target. Its own cooldown limits it to eight shots/s; shared flywheel recovery can reduce aggregate throughput. Empty, transferring, occupied, blocked, unstable, or unready lanes cannot create shots. Cancelled feeds return to their reserved storage slots. There are no invented random jams. Seeded release offsets (±8 mm), elevation variation (±0.23°), yaw variation (±0.26°), and wheel-slip variation (±0.4%) break up rows without steering balls after launch.

The muzzle derives from the measured drum center [0.282575, 0.25325, Z], the 50.8 mm drum radius, ball radius, and tangent direction. An additional 155 mm guide-clearance distance places the physical sphere clear of the simplified robot proxies. A field sweep from the breech to that point prevents a ball from appearing above a trench beam without a clear exit route. Final sweeps include the robot and other loose balls as well as the field.

At launch, the same disabled fuel body is re-enabled with:

`velocity = chassis.velocityAtPoint(muzzle) + fullRobotRotation × localExitVelocity`

Payload mass is removed once and the opposite exit impulse acts at the muzzle. The launched ball has CCD and ordinary Rapier gravity, damping, ball/field contacts, and bounces. It receives no later trajectory correction. On first physical contact, its airborne label becomes loose without replacing or moving its body. Ownership is `loose → transferring → stored → feeding → airborne → loose`; all IDs remain accounted for.

The 38–75° exit-angle mapping over 37° hood travel, 0.8 drum-to-ball speed factor, 4–19 m/s speed envelope, 4000 RPM/s acceleration, 1100 RPM/s coast, 35 RPM loss per shot, 140°/s hood slew, feed timing, and linear drag are initial simulator fits. Drum, hood rollers, flywheel, and feed rollers animate from simulation state. These values require measured shot/range data before claims of real-robot or FRSim accuracy.

## Verification and next gate

Ten shooter checks cover official/mirrored zone targets, gravity/drag prediction against physical flight, bounded physical alignment from facing away, four lanes, full-hopper cadence/recovery/conservation, cancellation/pause/reverse/empty/reset, blocked-muzzle retention, stationary and stop-before-firing range trials on the official field, physical passing, a central pass over the net, and a blocked trench exit/respawn. The current range trial confirms that driving blocks firing, then validates shots after the robot settles. Tested hub crossings stay within 0.37 m of the target center, including lateral lane spacing.

Browser smoke checks collected and launched 28 balls toward the hub, then collected and passed 14 from outside the blue zone. The full-field headless cycle and timing sample are in `shooter-baseline.json`; reproduce with `pnpm benchmark:shoot`. See `VERIFICATION.md` for results and limits.

Gate 4 now supplies valid downward entry detection, practice hit counters, and ID-preserving hub transit/return; see `PRACTICE.md`. Stage 5 now adds active/inactive hubs and timed fuel scoring (`MATCH.md`); full competition rules remain later work.

Passing reach is capped at 33 ft (10.0584 m), following the supplied FRSim card. Beyond that reach, cargo remains owned and the HUD shows Out of range. Small recoil residuals below 0.18 m/s count as settled; driving while holding Space continues aiming but displays Waiting to stop.
