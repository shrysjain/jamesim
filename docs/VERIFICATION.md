# Jamesim gameplay revision verification

Verified locally November 1, 2026. `GAMEPLAY_TUNING.md` records the selected FRSim baseline, latest user actuation correction and model limits.

- Current coverage comprises 78 checks across eight suites. The complete run passed 76/77; its remaining assertion still assumed the old 4.5 m/s limit. After updating that expectation and adding the 33-ft passing check, the affected driving/shooter suites passed all 33 checks. Match cue timing passed its focused check. Unchanged field, intake, hub and match suites passed in the complete run. The host was under load; serial workers avoided spurious five-second timeouts.
- New checks cover locked pitch/roll impulses, full-speed trench passage, bump crossings on both alliances, floor fuel beneath a landing chassis, passive deployment, hopper staying out during intake compression, automatic intake return without Shift, 55-ball non-overlapping packing, cargo-limited compression, staggered finite-rate firing, stopping before firing, manual AUTO input and no automatic preload firing, and all 2026 normal audio boundaries.
- The unobstructed 55-ball bench sustains over 28 and under 33 balls/s after startup, preserves per-lane cooldowns and the original fuel bodies, and empties completely. Physical hub range, blocked exits, returns, recollection, reverse, payload, pause and resets remain covered.
- TypeScript and production build pass. The bundle remains about 5.32 MB / 1.94 MB gzip with the existing chunk advisory.
- Browser verification in Safari collected fuel with Shift. A dedicated local tab then confirmed driver-operated AUTO (W reached 1.3 m/s while AUTO was active), no firing until Space, eight preloaded balls physically launched and scored as eight AUTO points, both assemblies out again after release, 0° tilt/four supported modules, all 504 fuel returned loose, and the Shift 1 light/score state. Browser console warnings/errors were empty after the audio/shot sequence. The screenshot is `gameplay-revision.jpg`.
- Audio samples are retained locally and served successfully. Pure schedule checks cover start, AUTO end, teleop start, all four shifts, endgame and final end without repeated boundary playback. This is not an independent audio audition or an exact FRSim physics measurement. The off-season abort sample and redistribution license are documented for the later public-launch review.

Earlier gate/stage entries below are historical and describe their original behavior. In particular, their automatic AUTO routines, tilting chassis and 32-ball storage have been superseded.

---

# Jamesim stage 5 verification

Verified locally October 31, 2026. `MATCH.md` records the implemented solo fuel-match rules and the remaining competition scope.

- **73 checks pass across seven suites.** Twenty new cases cover the fixed-tick phase timeline, auto and final assessment, late processing before auto tie/winner resolution, hub alternation, inactive scoring and grace endpoints, seeded ties, unique passage awards, event targets, lights, early completion, autonomous commands, paused clocks, restart, input locks, frame-rate independence, and blocked outlet processing independent of release. A later malformed-event guard passed the focused 15-case rule suite again.
- TypeScript and production build pass. Runtime JavaScript is approximately 5.32 MB (1.93 MB gzip). The existing large-chunk advisory remains.
- Full-field integration preloaded eight existing neutral IDs, fired all eight with the physical autonomous routine, assessed eight auto points and eight returns, and finished the five-second sample with 504 loose fuel and no replaced bodies. Injected manual inputs could not override auto.
- Browser verification: session setup, eight real auto points, W locked during auto, blue inactive/red active in Shift 1, reversed state in Shift 2, teleop driving, pause with frozen clock, early end with three-second assessment, correct 8–0 fuel results, and return to empty fresh practice. `stage-5-match.jpg` and `stage-5-results.jpg` record the play/result views.
- The full 166-second timeline is verified in the pure rules tests. Browser verification used early completion after observing shifts; it did not run a full real-time match. This is not a broad browser/performance guarantee.

Managed sensor passage is estimated at 0.35 seconds after entry. Match score timestamps are independent of blocked return queues. Profiles select verified fuel thresholds while retaining 504-fuel staging. Tower/climbing/Traversal, penalties, opponents, win/tie RP, optional extra-fuel layouts, and tournament rankings are explicitly not assessed. Earlier verification sections below are historical.

---

# Jamesim gate 4 verification

Verified locally October 31, 2026. See `PRACTICE.md` for entry geometry, controlled transit/return, reset behavior, and remaining fidelity limits.

- **53 automated checks pass** across five suites, including eight hub checks. New checks cover the inset hexagon, mirrored hubs, exactly-once entry, upward/side/rim rejection, swept fast crossings, blocked exits, bounded outlet cadence/no overlapping releases, deterministic reset/pause, and actual official-field shooting followed by recollection and another hit with the same IDs.
- TypeScript and production build pass. Runtime JavaScript is approximately 5.30 MB (1.93 MB gzip).
- The dedicated local browser collected 11 fuel, respawned retaining cargo, then launched them. The main Practice hits counter reached Blue 11 / Red 0; Debug confirmed 11 hits, 11 returns, no queued fuel, and 504 loose of 504 total. Collider debugging opened successfully and closing Debug restored the normal play view. `gate-4-browser.jpg` records the result.
- `pnpm benchmark:practice` collected 24 fuel on the complete field, launched all 24 through four lanes, registered 24 hits and 24 returns, and ended with all 504 loose bodies, zero cargo/transit, and 56 kg robot mass. Mean/p95 step wall time was 3.10/5.47 ms (peak 11.98 ms). This is a headless local sample including aim/physics, not a rendering or frame-rate guarantee; see `practice-baseline.json`.

Entries use the measured CAD funnel centers at X = ±3.6449 m, correcting the previous center estimate by 15.875 mm. Existing field collision geometry and the approved follow camera remain unchanged. Practice counters do not implement match rules, active hubs, foam deformation, or official counter sensing. Earlier gate notes below are historical.

---

# Jamesim gate 3 verification

Verified locally October 31, 2026. Gate 3 adds four physical shooter lanes, shared flywheel response, finite hood/feed motion, chassis alignment, and automatic hub/pass target selection. See `SHOOTER.md` for reference geometry, fitted coefficients, behavior, and limits.

- **45 automated checks pass** across field, drive, intake, and shooter suites. Ten shooter checks cover gravity/damping, official zone selection, four lanes, spin-up/readiness/cadence, physical yaw, fuel conservation and payload removal, cancellation/reverse/pause/reset, obstruction, stationary/moving hub range, and passes including over the official hub net. Hub range crossings are bounded within 0.37 m of the target center; this is a range check, not a scored entry event.
- TypeScript checking and the production build pass. The JavaScript bundle is approximately 5.29 MB (1.93 MB gzip).
- Dedicated in-app browser: collected 28 balls, respawned retaining them, held Space, observed Hub/Aiming while the chassis turned, then launched all 28 and returned to 0/32 and 56 kg. Debug confirmed 28 launches and 504/504 loose/total fuel afterward.
- Browser passing: reset, collected 14 balls, held Space outside the blue zone, observed Pass/Feeding, and emptied the hopper. `gate-3-browser.jpg` records the live passing view. Keyboard hints, flywheel coast, clean gameplay view, and retained follow camera were checked.
- `pnpm benchmark:shoot`: actual full-field intake collected 24 IDs and launched all 24 through all four lanes after robot-only respawn. Final state: 504 loose, zero owned, mass 56 kg. Sample mean/p95 step wall time: 3.64/5.20 ms at 120 Hz, peak 9.13 ms. This includes physics/aim computation with 504 fuel, but no rendering. It is a local sample, not a frame-rate guarantee; see `shooter-baseline.json`.

Shooting coefficients remain provisional. Full-speed moving accuracy, broad hardware/browser coverage, hub-entry counting, controlled hub return, and match rules remain later work. The sections below retain earlier gate verification history.

---

# Jamesim gate 2 verification

The current implementation passes 35 focused checks: 26 field/drive checks and nine intake/storage/reverse checks. Type checking and the production build pass. The source robot's one `Fuel` mesh is excluded from the prepared GLB (verified from `asset-report.json`), and every gameplay ball uses the shared ownership system.

A headless run with the complete official field and 504 fuel collected 24 IDs during a 1.5 second drive. A reverse request facing the bump retained cargo at the blocked outlet, preserving all 504 IDs. Respawning at the clear practice location and reversing returned all 504 to loose bodies and the robot to 56 kg. The intake/storage model and limits are described in `INTAKE.md`.

Checked the local app in a dedicated in-app browser on October 31, 2026:

- Jamesim title/header, empty robot at startup, and readable white 2910 numbers on the blue bumper faces.
- Shift + W from Fuel approach collected 27 balls, with visible cargo and a loaded mass of 61.8 kg. Releasing Shift stowed the intake while the hopper stayed deployed and retained cargo.
- Robot respawn retained cargo. Holding Q at the clear practice location ejected all 27 balls, returning the robot to 0/32 and 56.0 kg. Debug confirmed 504/504 loose/total fuel afterward.
- The main gameplay screen keeps Debug hidden; the approved follow camera remains in use. A final browser view is saved as `gate-2-browser.jpg`.

This is a focused browser smoke check, not a cross-browser or sustained-performance guarantee. The earlier browser checks below are gate 1 history.

---

# Current robot asset gate

The Re•Blitz asset fit supersedes the generic chassis dimensions and key bindings below. See `REBLITZ_ASSET_GATE.md` for the current measured geometry, 20 focused drive/contact checks, starting/collecting clearance checks, browser inspection, and explicit remaining calibration. Prototype history below is retained as a baseline.

# Swerve practice verification

Checked locally on October 30, 2026. Implementation and required assets remain inside this project.

## Automated checks

`pnpm test`: **24 passing checks** across two suites:

- Field assembly counts, 504-fuel staging, exact pose reset, floor contact, hub opening, trench clearance, and ramp surface height.
- Acceleration, speed limit, braking distance, strafing, yaw, diagonal normalization, precision input, combined-command desaturation, no drive authority in the air, render-rate independence, and field-relative translation while turning.
- Full-speed alliance wall contact and stopped contact with a trench support.
- Slow crossings of all four bump lanes, plus straight and angled full-speed bump crossings.
- Passage under all four trench arms.
- Full-count fuel pushing/reset and bounded full-speed fuel impacts without floor tunneling.
- The lowered bumper pushing an isolated ball and a row while the chassis stays low. The row case permits fuel to scatter/stack above the bumper and checks that floor fuel does not enter under the frame.

`pnpm build`: TypeScript checking and the Vite production build pass. The embedded Rapier WASM produces a large-chunk advisory; the current JavaScript bundle is approximately 5.29 MB before transport compression (1.93 MB gzip).

The prepared GLB is 2.67 MB with 410,854 visual triangles. The field has 18 static colliders and 216,242 collision triangles. Adding 504 fuel, the reusable probe, and seven chassis proxies produces 530 colliders. Drawn triangle counts include fuel, the robot, and shadow passes.

## Browser checks

Opened the local Vite app in Safari and verified:

- The default screen is third-person practice with a small speed HUD and the debug panel hidden.
- WASD translation, J/L rotation, braking, respawn, and the follow camera. Field orientation stays fixed while the robot rotates in the default field-relative mode.
- The lowered robot drives into the full neutral fuel supply, pushes balls aside, and remains on four contacts. A sampled stopped state after pushing showed 0.0° tilt, all 504 fuel, 60 FPS, and approximately 4 ms of physics per frame.
- Trench driving, debug-panel opening/closing, camera switching, pause/reset, and scene diagnostics.
- The existing field inspector remains available in Debug; prior field-environment checks covered selection/focus, visibility layers, grid, labels, collider-only rendering, and the orange probe.

These are manual smoke checks, not cross-browser guarantees or sustained frame-time measurements. Debug wireframes can add substantial rendering work.

Revisited FRSim Beta v31 with the 2910 Jack in the Bot v2 to compare translation, J/L turning, trench traversal, fuel pushing, and the camera frame. See `DRIVING.md` for the resulting behavior choices and the limits of this qualitative comparison.

## Headless profiling

`pnpm benchmark:drive` runs the shared simulation with the official field, one chassis, and 504 fuel for eight simulated seconds: two seconds of precision forward drive, two of reverse, and four of settling. The report in `driving-baseline.json` records step times, displaced fuel, peak awake count, tilt, and any fuel below the floor. It includes cold steps and does not measure rendering. Run it alone when comparing changes; local CPU load and WASM warmup affect results.

`physics-baseline.json` retains the earlier field-only settling sample. Its mostly sleeping scene does not represent active robot/fuel contact.

## Scope and fidelity

The chassis is original placeholder geometry. It uses four ray contact patches, compliant support, finite module steering/acceleration, and a tire-force budget. Bumpers and frame collide physically with the field and fuel; separate wheel proxies contact fuel without duplicating the ray springs’ floor support. Global solver iterations are four, with two additional iterations for the chassis. The chassis and fuel use CCD. Pausing preserves sleeping islands; contact wakes fuel naturally.

The body is lowered to approximately 0.223 m at its center of mass. The bumper bottom is approximately 53 mm above the carpet, with its vertical face crossing the 75 mm fuel center. The lower frame retains approximately 103 mm clearance for bump traversal.

This is a driving prototype with tunable coefficients, rather than a measured reproduction of FRSim or a particular real robot. Extreme impacts, concentrated piles, further hardware/browser profiles, and controller support remain validation work. Mechanisms, scoring, and multiplayer are future milestones.

The original STEP and prepared runtime assets are stored in the project. Normal startup requires no remote assets or CAD conversion. Source hash and conversion limits are in `public/assets/PROVENANCE.md`. Small hardware and duplicate vinyl skins are removed; production signage and AprilTag image textures are absent. Later drawing revisions still need a targeted audit.
