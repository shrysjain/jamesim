# Stage 5: solo timed fuel matches

Use **Practice / Timed match** beside Jamesim to choose a session. Free practice remains unlimited and starts empty. Timed mode resets the field and starts a solo blue-robot fuel match, with a selectable preload and event fuel targets. WASD/J/L, Shift, Space and Q retain their normal meanings during both AUTO and teleop. R restarts the whole timed match; it remains robot-only respawn in practice.

The main HUD shows fuel points, phase, match time, phase time, and each hub's active/processing/inactive state. Lip lights show alliance color when active, dim when inactive, pulse before shutdown, and show a white chase on the hub selected to be inactive in Shift 1 during transition. Disabled assessment periods use purple lights. Existing follow-camera framing is unchanged.

## Timeline

The [official TU22 manual](https://firstfrc.blob.core.windows.net/frc2026/Manual/2026GameManual.pdf), §6.4–6.5, supplies phase durations, hub order, processing allowances, and fuel point values. `MatchRules.ts` runs on integer 120 Hz ticks, independent of React, render rate, or wall-clock timers.

| Simulation elapsed | Phase | Driver control | Hubs |
| --- | --- | --- | --- |
| 0–20 s | Autonomous | Driver-operated, with the normal controls | Both active |
| 20–23 s | Auto assessment | Disabled outputs | Auto fuel processing allowance |
| 23–33 s | Transition | Enabled; teleop clock starts at 2:20 | Both active |
| 33–58 s | Shift 1 | Enabled | Auto winner's hub inactive |
| 58–83 s | Shift 2 | Enabled | Reverse Shift 1 |
| 83–108 s | Shift 3 | Enabled | Same as Shift 1 |
| 108–133 s | Shift 4 | Enabled | Same as Shift 2 |
| 133–163 s | Endgame | Enabled | Both active |
| 163–166 s | Final assessment | Disabled outputs | Final fuel processing allowance |
| 166 s | Results | Frozen simulation | Off |

There are 160 enabled match seconds plus the two assessment gaps. Pause, focus loss, help, and session setup freeze both clock and physics. Resuming preserves the remaining phase time. A completed match cannot resume through the pause button. It can be inspected, restarted, or replaced with a fresh practice session.

The pause card and Debug offer **End match**. This disables outputs and assesses fuel for up to three more simulated seconds before showing an explicitly incomplete result. It does not extend the existing processing window of a hub that was already inactive.

## Fuel scoring and hub order

Mouth crossings remain the physical **hit** counter from gate 4. A separate managed sensor event occurs 0.35 simulated seconds after each accepted entry, before outlet release. This delay is a simulator fit for the internal sensor passage, not a measured counter latency. Outlet blockage cannot delay scoring indefinitely or create duplicate awards.

The rule controller consumes these events in timestamp order. Each passage has a unique sequence, so repeating a callback cannot award again. A returned ball can score on a later genuine entry with a new passage sequence. Every award uses an existing fuel ID; preloads, scoring and returns never create ammunition.

Each eligible processed fuel earns one point. Processing continues during the three-second tail after a hub deactivates, after auto, and after teleop. Events outside the eligible window earn no points, while their balls still return normally. At a shutdown boundary, the active interval excludes its endpoint and the processing tail includes it; the tail excludes its own closing endpoint. Auto assessment closes when teleop starts at elapsed 23 seconds. Events at that instant belong to teleop. Results freeze after final assessment.

This is a sensor-timestamp model of the manual's processing allowance: a passage is assessed when its managed sensor event occurs, including during a valid tail. It is not classified from button press or shot launch. Foam, counter sensing details, launch-zone fouls, and other referee judgments are not inferred.

Auto fuel totals settle before the Shift 1 order is locked. The higher-scoring alliance becomes inactive first. A tie uses a seeded choice. New matches receive a seed; restarting reproduces the same seed. Debug exposes the seed, selection reason, auto/teleop totals, and uncredited inactive passages.

## Autonomous and preloads

AUTO is driver-operated for simulator gameplay. No path planner, automatic preload firing, or driver lock runs during its 20 seconds. The AUTO phase still supplies the correct clock, hub state and scoring interval. The three-second assessment gaps retain disabled outputs.

Choose zero to eight preloaded balls. They are taken from existing neutral-zone IDs after reset, so the complete field supply stays at 504. Stored positions follow the hopper's stow/deploy travel, keeping preloads supported in the starting configuration. Cargo mass is included normally.

During disabled assessment periods, wheel motors and mechanism actuation stop. Passive tire/spring support and physical field/fuel motion continue; launched balls can finish their flight. The flywheel coasts. Match restarts restore initial fuel, preloads, robot, clocks, hit counters, and scores. Practice-only teleport, pose, probe and tuning controls are unavailable during a timed run; inspection cameras and collision layers remain available.

## Profiles and results

Fuel RP targets use manual Table 6-5:

| Profile | Energized | Supercharged |
| --- | ---: | ---: |
| Regional / district | 100 | 360 |
| District championship | 240 | 360 |
| FIRST Championship | 360 | 500 |

These selections currently change targets only. All profiles use the retained 504-fuel field; an optional championship layout with additional fuel is not implemented.

Results show blue/red fuel totals, autonomous/teleop breakdown, uncredited inactive/late passages, and whether each fuel target was met. **Tower/climbing points, Traversal, penalties, opponents, win/tie RP, and tournament rankings are not assessed.** This is a solo fuel match, not a complete competition rules engine. Climbing still requires its own mechanism and contact-based assessment implementation.

## Match audio

Local WAV samples play at the 2026 manual Table 5-4 boundaries: cavalry charge at start, buzzer at AUTO end, three bells at teleop start, popping at each alliance shift, steam whistle at endgame, and buzzer at match end. Manual early completion uses the retained off-season abort cue. The HUD mute button silences cues; pause/focus loss stops playing samples without replaying a boundary on resume. `MatchCues.ts` uses simulation time. Samples, hashes and source/license records are retained locally; see `assets/source/audio/`.

## Verification

See the latest `VERIFICATION.md` entry for current checks. The earlier stage-5 screenshots document the prior automatic-preload prototype and are historical; AUTO is now driver-operated.
