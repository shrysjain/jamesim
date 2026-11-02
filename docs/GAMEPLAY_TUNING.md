# Gameplay revision — November 1, 2026

The user's FRSim 2910 metrics card is the gameplay baseline. It is a simulator reference, not an independent measurement of the real robot.

| Metric | Baseline |
| --- | --- |
| Speed | 16.7 ft/s = 5.09016 m/s |
| Wheel acceleration command | 33 ft/s² = 10.0584 m/s² |
| Empty traction / push | Approximately 130 lbf, from 56 kg and grip 1.05 |
| Fire rate | 32 balls/s nominal across four staggered lanes |
| Intake rate | 50 balls/s |
| Capacity | 55 existing fuel IDs |
| Shoot on the move | Disabled; translation must settle below 0.18 m/s |
| Passing reach | 33 ft = 10.0584 m |

Actual acceleration still depends on steering, load and tire force. Firing waits for chassis aim, spin-up, hood, ground support and clear exits. The sustained unobstructed 55-ball bench verifies over 28 and under 33 balls/s; startup, recovery and obstruction can reduce throughput. Small seeded launch variations break up regular rows, without any correction after release.

## Actuation

The latest user correction supersedes the earlier coupled retraction proposal. At reset both assemblies are in. At the start of the simulation they snap out together over 0.18 s, without requiring Shift. The hopper stays out. Shift runs the intake rollers, Q reverses, and Space retracts only the intake over up to 0.45 s as cargo empties. Releasing Space pops it out again automatically.

Eight or fewer balls allow full intake compression. Required extension increases linearly to full at 55. Stored fuel responds to the intake's pushing wall; the feed inlet remains attached to the frame. Cargo slots now seed entry positions rather than pinning stored fuel. The 55-ball layout uses 54 close-packed positions in three layers plus one feeder pocket, with non-overlapping 150 mm spheres. The pocket feeds first.

## Forgiving contacts

Pitch and roll are locked; yaw and vertical suspension remain physical. The simulation also projects physical rotation and angular velocity onto yaw before suspension queries and after each world step. Rotation locks alone allowed small off-axis errors to accumulate during loaded driving until the mechanism colliders supported the robot above the floor. This correction preserves linear velocity, height and yaw; it is not a height clamp or automatic respawn.

Bump triangles provide a level, damped support platform sampled over the robot footprint. The complete robot leans with the bump while its modules remain rigidly mounted at the prepared CAD positions. This avoids bellypan/intake beaching while preserving the bump's height change. The remaining field geometry still blocks the chassis normally.

Low fuel is displaced horizontally by the bumper footprint, including when landing on it. Sweeps prevent displacement through the static field. A trapped ball may briefly overlap the underside until space opens; it cannot provide vertical chassis support. Fuel-to-fuel, carpet and field physics, airborne contacts and stable IDs remain active.

## Timing and audio

AUTO is 20 seconds of driver-operated play, followed by the existing three-second assessment, 140 seconds of teleop phases and final assessment. There is no automatic preload routine.

Normal period audio follows [2026 manual Table 5-4](https://firstfrc.blob.core.windows.net/frc2026/Manual/HTML/2026GameManual.htm): start charge, AUTO buzzer, teleop bells, four shift popping cues, endgame whistle and final buzzer. Manual early completion uses Cheesy Arena's off-season abort sample. A mute button, browser gesture unlocking, pause cancellation and disposal are implemented.

Samples are unmodified local evaluation copies from [Team 254 Cheesy Arena](https://github.com/Team254/cheesy-arena/tree/248d9de497e701223e2cdbc986a19bbfea054c21/static/audio), pinned at `248d9de497e701223e2cdbc986a19bbfea054c21`. Download hashes, original timing source and license are retained in `assets/source/audio/`. Public launch needs an audio redistribution review under that retained license. No runtime audio, CAD or code depends on a system cache.

November 1 follow-up: bump-only pitch/roll is now rendered from the four module terrain heights, smoothed and capped at 15°, while stable collision support and horizontal fuel displacement remain active. Owned fuel and the shooter muzzle follow that lean. Full-hopper rendering accounts for the sloped rear panel. Final aim response is faster; empty shooters no longer own yaw. Disabled-period boundaries clear drive/aim commands and yaw, with passive yaw damping during assessment. This follow-up was applied and refreshed without tests at the user's request.

## Kepler card update

The user's Kepler FRSim card sets 14.4 ft/s maximum wheel speed, 33 ft/s² command acceleration, 130 lbf nominal empty traction, 13 shots/s in one turret lane, 40 fuel/s intake, approximately 50-fuel capacity, 95% moving-shot accuracy rating and 32 ft passing. Adjustable hood, simultaneous intake/shooting and L1 support remain enabled. These settings belong to Kepler's definition; selecting it does not change 2910 defaults.

The single-lane feeder uses pipelined transit through the floor/cross-feed/vertical path, retaining the 13 shots/s cadence without a back-of-hopper jump. Cadence still depends on aim, recovery, hood readiness and exit clearance. The 95% rating scales launch-angle spread while translating by 1/.95; actual hits remain physical, with no selected forced misses or correction after launch. This mapping is an implementation interpretation because the card does not define the percentage's calculation. CAD dimensions, approximate mass/inertia, hood lower stop and the managed L1 support model are documented in `docs/KEPLER.md`.

## Hopper dynamics and alliance bumpers

Stored fuel now moves under gravity, ball-to-ball contacts, friction and forces from chassis acceleration/turning. Two substeps with iterative equal-mass sphere contacts run per 120 Hz physics tick. Simplified inner wall/floor/roof envelopes belong to each robot definition; the inward-moving intake boundary pushes cargo as the carriage compresses. These are gameplay contact envelopes, not a full CAD mesh/contact simulation or a discrete model of every internal roller.

The original Rapier body and stable ID of every fuel remain intact. Owned field bodies stay disabled while their local sphere positions are solved; chassis payload mass, center of mass and inertia use those evolving positions once. Intake transfer and shooter feed remain managed handoffs. Shooting/ejection reactivate the same field body, while pause freezes the fixed-step simulation and restart/respawn clears hopper velocity history. Rendering uses solved positions without a separate clamp. The 2910 feeder exception applies only to 2910's entry slot, not index 54 on other robots.

A floating-point tolerance in the world accumulator prevents 144 Hz rendering from deferring a 120 Hz tick. Frame-rate checks now require equal physics time and matching cargo positions at 30, 60 and 144 Hz. Hopper tests cover gravity/settling, moving walls, inertia, turning, bump lean, full-capacity containment, pause, reset and original fuel-body conservation. Existing shooting throughput and physical hub-hit tests remain in force.


## Moving-shot uncertainty and match cutoff hold

Moving shooters now add seeded, bounded Gaussian variation to release yaw/elevation and wheel speed. The variation grows with translation, turning and acceleration; a 60 ms velocity estimate also leaves transient compensation error when starting, braking or changing direction. Quiet stationary shots retain the previous small release variation. The coefficients are gameplay tuning, not measured team calibration; the card percentage is not a guaranteed success rate. Slow, steady motion can still score an entire short series, while the more demanding full-hopper driving/turning regression must produce physical misses and remain useful. There is no target-based hit/miss coin flip or correction after release.

At AUTO, teleop and manual early-stop cutoffs, the chassis clears wheel commands and yaw, then zeros horizontal velocity while supported by grounded wheels. The hold runs at the cutoff tick and through disabled assessment, preventing momentum from carrying the robot across the carpet. Vertical falling, suspension settling and tower support remain physical, and unsupported airborne horizontal travel continues until landing. Pause and practice behavior are unchanged.

This branch changes moving-shot tuning and match-time stopping only. Cargo weight, local hopper contacts and per-fuel mass use the existing main-branch implementation.
Both retained robot choices switch bumper materials between blue and red on session changes. Prepared 2910 bumper vertex colors are disabled only on the bumper material so a blue vertex tint cannot mask red. Team numbers and other CAD colors are preserved. Browser checks inspect robot/alliance combinations; a separate WebGL render verifies the visible red/blue change.

## Stage 19.5

High Tide and the Tower trainer have been removed. The incoming local hopper dynamics and alliance-colored bumpers remain. Kepler now compresses its intake during shooting (intake/reverse extends it), and its single-lane feeder uses visible pipelined transit through definition-owned waypoints. C toggles hook deployment, tower capture and L1 winching/lowering; the original CAD sliding hook/stage is now separated from the batched body meshes and animated vertically. Capture requires alignment beside the low rung, and retraction takes up slack before lifting. See [current behavior and limits](STAGE_19_5.md).

## Rigid swerve mounts and driver turning — November 2

Wheel/fork assemblies retain their exact prepared CAD translations on every robot; only azimuth steering and wheel spin animate. Bump lean affects the complete chassis, including the modules. Fuel-only tire colliders also stay fixed relative to the physical frame. The established ray-based support solver remains a numerical ground-contact approximation, not articulated hardware suspension; its legacy `springLength`, `travel` and `suspension` values never reposition a module.

Manual full-turn demand increases from 4.8 to 6.4 rad/s, with module steering response increasing from 18 to 24 rad/s. Tire traction, payload inertia, acceleration and wheel-speed desaturation still constrain actual rotation; no direct yaw velocity is prescribed. Precision mode retains half turn demand. Chassis aiming normalizes against the shared turn scale so the faster driver command does not silently increase its feedback gains.

## Shot scatter and fuller hoppers — November 2

The owner's follow-up supersedes the nearly perfect accuracy and old capacity caps. Re•Blitz now holds 65 full-size fuel, Kepler 60, Darwin 48 and Limestone 70 with its juice press raised. These are fitted gameplay capacities, not new claims about measured real-robot maxima. Shapes, fuel mass and the configured total supply remain unchanged. Initial non-overlapping seeds fill the existing CAD-derived envelopes and then evolve in local hopper physics.

Shots use per-robot angle/speed variation, occasional wider release tails, motion-dependent uncertainty and physical spin. Stable per-fuel restitution differences produce varied rebounds. Scores and misses remain physical; timed AUTO records processed hub fuel rather than assuming every fired preload scores. See [the calibration notes](SHOT_TUNING.md) for the source limits and estimated profiles.

On the Limestone preview branch, intake/reverse raises the actual climber-mounted juice press without arming tower capture. Its roof, collider and cargo ceiling move together. As cargo empties, the stage contracts while retaining sufficient headroom. C retains deliberate tower/climb control; a full hopper can prevent complete press retraction. The roller converter removes 2,368 coincident faces that caused rotating intake-bar depth fighting. WildStang is deferred while the owner prepares its GLB.
