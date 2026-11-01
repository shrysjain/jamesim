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

Eight or fewer balls allow full intake compression. Required extension increases linearly to full at 55. Stored cargo follows the intake's pushing motion; the feeder pocket stays fixed. The 55-ball layout uses 54 close-packed positions in three layers plus one feeder pocket, with non-overlapping 150 mm spheres. The pocket feeds first.

## Forgiving contacts

Pitch and roll are locked; yaw and vertical suspension remain physical. Bump triangles provide a level, damped support platform sampled over the robot footprint. The modules visually reach toward their individual ramp surfaces. This avoids bellypan/intake beaching while preserving the bump's height change. The remaining field geometry still blocks the chassis normally.

Low fuel is displaced horizontally by the bumper footprint, including when landing on it. Sweeps prevent displacement through the static field. A trapped ball may briefly overlap the underside until space opens; it cannot provide vertical chassis support. Fuel-to-fuel, carpet and field physics, airborne contacts and stable IDs remain active.

## Timing and audio

AUTO is 20 seconds of driver-operated play, followed by the existing three-second assessment, 140 seconds of teleop phases and final assessment. There is no automatic preload routine.

Normal period audio follows [2026 manual Table 5-4](https://firstfrc.blob.core.windows.net/frc2026/Manual/HTML/2026GameManual.htm): start charge, AUTO buzzer, teleop bells, four shift popping cues, endgame whistle and final buzzer. Manual early completion uses Cheesy Arena's off-season abort sample. A mute button, browser gesture unlocking, pause cancellation and disposal are implemented.

Samples are unmodified local evaluation copies from [Team 254 Cheesy Arena](https://github.com/Team254/cheesy-arena/tree/248d9de497e701223e2cdbc986a19bbfea054c21/static/audio), pinned at `248d9de497e701223e2cdbc986a19bbfea054c21`. Download hashes, original timing source and license are retained in `assets/source/audio/`. Public launch needs an audio redistribution review under that retained license. No runtime audio, CAD or code depends on a system cache.

November 1 follow-up: bump-only pitch/roll is now rendered from the four module terrain heights, smoothed and capped at 15°, while stable collision support and horizontal fuel displacement remain active. Owned fuel and the shooter muzzle follow that lean. Full-hopper rendering accounts for the sloped rear panel. Final aim response is faster; empty shooters no longer own yaw. Disabled-period boundaries clear drive/aim commands and yaw, with passive yaw damping during assessment. This follow-up was applied and refreshed without tests at the user's request.
