# 2026 robot performance estimates

Research date: November 2, 2026. This audit covers the seven robots in the selection preview, using the modeled revision rather than combining every version a team ran. It supersedes earlier performance estimates in the robot READMEs and SHOT_TUNING.md. CAD, dimensions, fuel size/mass and fitted cargo layouts are unchanged.

## Evidence and interpretation

Prefer team technical binders and pinned release code, distinguishing configured maxima, design objectives and measured results. Use build/reveal discussions for architecture and iteration. TBA identifies events, revisions and candidate video samples; alliance scores and records cannot isolate individual accuracy, intake rate or capacity. Nominal sustained throughput differs from a best burst and from whole-match scoring averages.

Statbotics' page and v3 team_year endpoints for 2910/1690 were inaccessible during this audit. No EPA is asserted or converted into a hit percentage. The third-party design dashboard served only as a pointer to primary sources: its descriptions mix the Alpha/Darwin and early Spectrum/FM revisions.

Direct YouTube opens for Re•Blitz's Behind the Bumpers, Darwin's reveal, Limestone's Behind the Bumpers and Matterhorn's reveal were throttled. TBA match listings were readable, but no frame-by-frame or timestamped attempt count was obtained. No rate is falsely attributed to watching those videos.

Ranges below are engineering judgments for gameplay, not statistical confidence intervals. Existing capacities remain physically fitted limits until counted loads and matching geometry justify replacing them. A larger net on another revision does not justify overlapping rigid 150 mm spheres.

## Current calibration

Speed is a configured wheel target, acceleration a wheel-command ceiling, and push the nominal empty traction estimate `mass × 9.81 × grip`. They are not independently measured loaded sprint/pushing results.

| Modeled robot | Speed m/s (ft/s) | Accel m/s² | Push ~lbf | Intake fuel/s | Fire fuel/s | Fitted capacity | Hub SOTM quality |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2910 Re•Blitz | 4.389 (14.4) | 9.5 | 136 | 44 | 32 | 65 | Stationary; moving passes enabled |
| 1690 Kepler | 4.389 (14.4) | 10.058 | 130 | 40 | 13 | 60 | 95/100, retained |
| 6328 Darwin 26C | 4.2 (13.8) | 9 | 165 | 36 | 22 | 48 | 50/100 |
| 1678 Limestone 26C | 4.39 (14.4) | 9.5 | 133 | 40 | 24 | 70 | 35/100 |
| 9496 Matterhorn release | 4.389 (14.4) | 9.5 | 160 | 30 | 16 | 42 | 20/100 |
| 3847 Infrared FM | 5.12 (16.8) | 10 | 134 | 30 | 14 | 39 | 25/100 |
| 4481 Era II Worlds | 5.8 (19.0) | 9.4 | 137 | 38 | 12 | 48 | 80/100 |

SOTM numbers are estimated relative motion quality, not observed make percentages. They scale release uncertainty without forcing misses or guiding airborne fuel. Lower motion quality does not penalize the same stationary launch profile. The UI uses `/100 est.`. Re•Blitz's internal 20/100 coefficient affects permitted moving passes, not an enabled moving hub shot.

| Robot | Hub translation / turn bound | Pass translation / turn bound | Evidence |
| --- | --- | --- | --- |
| Re•Blitz | Stationary: below 0.18 m/s; 0.3 rad/s | 2 m/s; 0.25 rad/s | Mode distinction from binder; numeric pass envelope estimated |
| Kepler | Existing turret readiness; no new hard speed cap | Existing readiness | No measured threshold located; retain prior behavior |
| Darwin | 1.2 m/s; 0.25 rad/s | 2 m/s; 0.25 rad/s | Conservative estimates; team confirms motion compensation |
| Limestone | 0.8 m/s; 0.25 rad/s | 1.5 m/s; 0.25 rad/s | Estimates prioritizing aligned dumping |
| Matterhorn | 0.5 m/s; 0.2 rad/s | 1.2 m/s; 0.25 rad/s | Estimated crawl envelope for fixed hood / chassis aim |
| Infrared FM | 0.65 m/s; 0.25 rad/s | 1.5 m/s; 0.25 rad/s | Estimated crawl envelope for the modeled FM |
| Era II | 1.7 m/s; 1 rad/s | 3 m/s; 3 rad/s | Exact configured constants from pinned team code |

Existing fixed-shooter readiness still requires turn rate below 0.3 rad/s, valid aim, spin-up, stable support and clear exits/trajectory. Above an envelope, release pauses without deleting cargo or altering drive forces. Optional `movingPasses` allows Re•Blitz to pass while moving without granting moving hub shots; omitted fields retain existing behavior.

A turret alone does not prove strong SOTM, and a fixed shooter can compensate for velocity. Darwin's documented solution earns a better estimate than the other fixed shooters. Exact scores remain judgments awaiting counted footage.

## Robot-specific findings

### 2910 Re•Blitz

Read the [official technical binder](https://drive.google.com/file/d/1r-6zR4afbr_BpeZfWwcM5XL1N74FjScI/view) through Google Drive, following the [team's June 7 release](https://www.chiefdelphi.com/t/2910-cad-and-tech-binder-release-2026/521705). It explicitly reports over 30 BPS with a sustained full-hopper maximum of 34, so retain 32. The binder separates stationary hub scoring from passing on the move. Its 95% stationary objective is not a measured make-rate sample.

R1 MK5n gearing replaces the inherited 16.7 ft/s default with a 14.4 ft/s configured estimate, consistent with the [SDS gear table](https://www.swervedrivespecialties.com/products/mk5n-swerve-module) and [Spectrum's R1 explanation](https://blog.spectrum3847.org/training/swerve/). Loaded speed may be lower. Intake 44 (35–50), acceleration 9.5 (8–10) and grip 1.10 (1.0–1.25) are estimates. Retain 56 kg/inertia estimates and fitted 65 capacity. The binder's 50/60 storage requirements do not establish an exact achieved maximum.

### 1690 Kepler

Sources: [team reveal/discussion](https://www.chiefdelphi.com/t/orbit-1690-2026-robot-reveal-kepler/515277), [official CAD release](https://www.chiefdelphi.com/t/frc-orbit-1690-2026-robot-cad-release/520673), and the previously supplied gameplay card recorded in [KEPLER.md](KEPLER.md). A spectator's one-second count of 13 corroborates the current 13 BPS, but is not a sustained test.

Retain the explicit card's 95 motion rating, 14.4 ft/s, command acceleration and 130 lbf calibration because no better matching measurement was obtained. The rating is not real 95% accuracy. Intake 40 (30–45), 54 kg/inertia and fitted 60 capacity remain estimates. The whole profile was reviewed; no number was changed merely to make every file differ. Existing L1 support is preserved.

### 6328 Darwin 26C

Sources: [team discussion of the competition drum and SOTM](https://www.chiefdelphi.com/t/frc-6328-mechanical-advantage-2026-build-thread/509595?page=30), [DriveConstants.java](https://github.com/Mechanical-Advantage/RobotCode2026Public/blob/559fa65be991303fec81d03c3de21e82a219da7c/src/main/java/org/littletonrobotics/frc2026/subsystems/drive/DriveConstants.java), [LaunchCalculator.java](https://github.com/Mechanical-Advantage/RobotCode2026Public/blob/559fa65be991303fec81d03c3de21e82a219da7c/src/main/java/org/littletonrobotics/frc2026/subsystems/launcher/LaunchCalculator.java).

Retain configured 4.2 m/s, 150 lb (68.04 kg) mass and 17.16 m passing-table envelope. Team statements and code establish flywheel/hood/velocity compensation, so preserve controlled SOTM with quality 93 → 50 and an estimated 1.2 m/s hub cap. Use nominal 22 BPS (18–24) and intake 36 (30–40). Grip 1.50 implied ~225 lbf without a measured traction test; use a less exceptional 1.10 (~165 lbf). Acceleration 9 (8–10), inertia and fitted 48 capacity remain estimates. Stationary scatter is unchanged. Do not substitute turreted Alpha details.

### 1678 Limestone 26C

Sources: [team robot page](https://www.citruscircuits.org/2026-robot), [reveal discussion](https://www.chiefdelphi.com/t/1678-2026-robot-limestone/515709), [pinned code](https://github.com/frc1678/C2026-Public/tree/0f403dd8f3ad1f7d0dbe0c1bd23b24c210f41677). The full-width multi-motor floor, accelerating ball tunnel and hood support retaining strong stationary throughput: nominal 24 BPS (22–28 estimate), intake 40 (35–45).

Reduce motion quality 90 → 35 with estimated 0.8 m/s hub cap. Retain 4.39 m/s configured drive; acceleration 9.5 and grip 1.10 are estimates. Retain 55 kg/inertia, fitted 70 capacity, the juice press and L1 mechanism. No counted stationary/moving sample was obtained.

### 9496 LYNK Matterhorn

Sources: [team explanation of fixed hood, RPM control, pose alignment and intake pulsing](https://www.chiefdelphi.com/t/lynk-9496-build-log-2026/511797?page=8), [pinned code](https://github.com/LynkRobotics/RobotCode2026Public/tree/6f60fc922916c545dad909ee42fa715b992a41e5), existing CAD/source record.

Use quality 20 rather than 90 and estimated 0.5 m/s hub cap for the fixed-hood reverse shooter. Nominal 16 BPS (14–20), intake 30 (25–35), acceleration 9.5 and grip 1.10 are estimates. Retain code-derived 14.4 ft/s, prior 66 kg/inertia and 9 m passing envelope. The existing 56° projectile release fit is not automatically replaced by a mechanical hood-angle reference.

Capacity 42 follows the uploaded open-rim CAD. The team's retaining net is absent from that model: do not raise capacity without matching containment. Full-width feeding, physical spillover and field contacts are preserved.

### 3847 Spectrum Infrared FM

Sources: [FM reveal post 339](https://www.chiefdelphi.com/t/spectrum-3847-build-blog-2026/509971/339), [official FM geometry](https://github.com/Spectrum3847/2026-Spectrum/tree/8be90a6c1044d9433f6f7ade9dd0857871f7579b/advantagescope-custom-assets/Robot_FM), [SwerveConfig.java](https://github.com/Spectrum3847/2026-Spectrum/blob/8be90a6c1044d9433f6f7ade9dd0857871f7579b/src/main/java/frc/robot/subsystems/swerve/SwerveConfig.java).

Early PM/XM turret descriptions do not establish FM capabilities. The prepared FM is chassis aimed. Retain the theoretical 12 V 5.12 m/s target and tested acceleration 10 (8–10 estimate). A trial 8.5 made wheel reversal too slow in unchanged wall tests and was rejected.

Quality 87 → 25; estimated hub cap 0.65 m/s. Nominal 14 BPS (12–16) and intake 30 (25–35) are low-confidence estimates, not counts from early singulator prototypes. Retain 58 kg/inertia, grip 1.05, fitted 39 capacity, 9 m passing and existing extra landing inset. Translucent panels, compression and full-width release remain intact.

### 4481 Rembrandts Era II Worlds

Sources: [Worlds subsystem updates](https://www.chiefdelphi.com/t/frc-4481-team-rembrandts-2026-build-thread-open-alliance/507296?page=26), [SwerveDriveConstants.java](https://github.com/FRC-4481-Team-Rembrandts/2026-robot-public/blob/e00d344b705b5e272229ba6ca5b6de26d93337af/robot/src/main/java/frc/robot/constants/SwerveDriveConstants.java), [ShooterConstants.java](https://github.com/FRC-4481-Team-Rembrandts/2026-robot-public/blob/e00d344b705b5e272229ba6ca5b6de26d93337af/robot/src/main/java/frc/robot/constants/ShooterConstants.java).

Retain configured 5.8 m/s, 9.4 m/s², hub 1.7 m/s / 1 rad/s, pass 3 m/s / 3 rad/s and 10 m passing table. The team documents increased inertia, lower compression, independent feeding/kicking and iteration against RPM drops. Quality 80 preserves a turret advantage without assuming Orbit-level performance.

Use nominal sustained 12 BPS (10–14); retain intake 38 (32–40). A trial 32 intake cadence spilled two balls from a full load at rest, so retain the validated cadence rather than altering containment around an unsupported number. Retain 59 kg/inertia, grip 1.05, fitted 48 capacity and tested 18.8 m/s² wheel braking. Preserve separate feeder axes, folded preview kicker and latest owner-requested fuel-aware carriage retraction with the lower bar down. Retraction is a gameplay adaptation, distinct from the passively deployed real carriage.

## TBA context and video follow-up

Official-play records read from the 2026 team pages are context only, not throughput or accuracy measurements: [2910](https://www.thebluealliance.com/team/2910/2026) 53–23; [1690](https://www.thebluealliance.com/team/1690/2026) 47–5; [6328](https://www.thebluealliance.com/team/6328/2026) 51–13; [1678](https://www.thebluealliance.com/team/1678/2026) 61–9; [9496](https://www.thebluealliance.com/team/9496/2026) 70–13; [3847](https://www.thebluealliance.com/team/3847/2026) 39–27; [4481](https://www.thebluealliance.com/team/4481/2026) 37–15. Records mix in-season revisions.

Located but playback-throttled references: [2910 BtB](https://www.youtube.com/watch?v=tKCFKqK_sXs), [6328 reveal](https://www.youtube.com/watch?v=uy4nd5wp0PU), [1678 BtB](https://www.youtube.com/watch?v=wsAJGi3yxSk), [9496 reveal](https://www.youtube.com/watch?v=Tbclswg5LmA). TBA links individual matches and event playlists.

## Validation and useful advice

The original tuning head (`0b14d0f`) passed GitHub CI: 335 simulation tests across 49 files and the complete release build. Earlier local checks covered 34 focused gameplay/containment/wall/moving-pass cases and seven-robot desktop/mobile selector behavior.

The integration refresh merges main `093d554` into the existing tuning branch without rewriting published history. It retains main’s legal starting-line placement, Prismarine implementation and temporary selection hiding, CAD corrections and team-number sizes. The PR increment contains only the research calibration, moving-pass support, documentation and related checks; the robot/UI dependency PRs are already incorporated into main. The AUTO-driving assertion now measures more than two meters of travel from the actual start rather than assuming the obsolete absolute starting coordinate.

The combined release integrity/build/payload check and focused desktop/mobile selector check pass. The browser check covers seven visible robots, hidden Prismarine, the Re•Blitz moving-pass badge, Spectrum/Rembrandts ratings and valid starting-line setup without page errors. Current full-suite and GitHub merge status are recorded in PR #11’s validation notes.

Best follow-up evidence:
- Full-hopper stationary/moving cycles for Spectrum FM, Matterhorn and Era II: event/match/timestamps, starting count, distance, departures and hub entries. Include the slow tail when estimating sustained BPS.
- A counted Re•Blitz full load; the binder establishes throughput but only storage requirements.
- Ready-to-play masses and matched-revision loaded sprint/pushing results; most masses and every empirical grip remain estimates.
- Whether Matterhorn should include its retaining net before revising capacity.

These are usable defaults within stated uncertainty. No EPA-derived accuracy, forced hit percentage or unobserved match count is claimed.
