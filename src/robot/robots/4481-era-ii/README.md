# 4481 Team Rembrandts — Era II (2026 Worlds)

## Profiled intake contacts — November 6

The old field proxies represented both inclined `TR26-IN-4019` side panels with full-height rectangles and the sloped `4020` front panel with one vertical wall. They assigned the raised section's height to the low front, rejecting valid starts where that front is beneath the arm while the high section remains outside it.

`node src/robot/robots/4481-era-ii/measure-intake-contacts.mjs` reads the same hash-verified owner upload and generates `intakeContacts.ts`: eight conservative X intervals per original panel, padded by 0.75 mm. All three original panel solids are retained. Convex planar envelopes approximate their profile and fill small cut-outs; they do not lower the real high section. The prepared model and runtime asset record are unchanged from the hood correction.

Both alliances and both lanes now admit a stowed start at alliance-relative X=4.57 m, Z=±3.5 m, settle without ejection and retain every original preload body. A deeper X=4.30 m start still intersects the high panel and remains blocked. These are valid partial overlaps of the low front with the arm, not permission to put the entire raised intake underneath. The intake starts retracted and uses the existing passive deployment; frame size, slide travel/rise, starting rules and field geometry are unchanged.

New checks enclose every prepared polycarbonate vertex, retain the full raised height, validate/reject the two placements appropriately and exercise actual-field deployment in all four cases. The profile contacts complete the starting-position correction alongside the hood work. Only robot-owned contact data, its definition/source notes, the guarded offline measurement and regression change.

## Trench hood correction — November 6

The supplied export has its hood extended. Both `TR26-SH-4006` cheeks belong with the `4011` hood skin and `4021` cross brace; leaving those cheeks fixed kept the turret above trench height even when the skin moved. Preparation now groups all four original solids and rotates them +26° about the measured flywheel axle into the retracted neutral pose. Runtime hood movement restores the original extended shape at the other end of travel. The bearing, flywheel, modules, intake geometry and launch calibration are retained.

The team's [automatic hood-retraction explanation](https://www.chiefdelphi.com/t/frc-4481-team-rembrandts-2026-build-thread-open-alliance/507296/402), [zone-priority explanation](https://www.chiefdelphi.com/t/frc-4481-team-rembrandts-2026-build-thread-open-alliance/507296/423) and pinned final code establish this behavior. `RobotContainer` defaults to retraction, gives trench safety priority and cancels shooting there. The final `HoodConstants` use **0.15 s travel** and a **300 mm hood diameter**, superseding the February write-up's 0.08 s. New source-file hashes are in the robot source record. The [Worlds finals match reference](https://www.youtube.com/watch?v=tSeGDeeX4JE) was found via TBA, but playback was blocked; no visual match review is claimed.

Optional `shooterGeometry.trenchSafety` activates a conservative swept envelope around the real offset bearing using its point velocity, hood radius, travel time and powered acceleration. All four prepared-field trench arms are covered. It retracts before overlap, inhibits new/queued releases on both sides of the physics step, and keeps the intake extended so its inclined slide cannot raise the side panels into the arm while Shoot is held. Existing feeder paths return queued fuel to storage. Normal held-Shoot behavior resumes outside the zone; other robots do not opt in.

The **fully stowed intake remains taller than the trench**: its current fitted slide pose reaches about 628 mm, versus the 565 mm arm clearance; deployed CAD panels reach about 533 mm. The profiled-contact follow-up above permits clear partial overlaps while rejecting starts that place the raised portion under the arm. Slide travel/rise remain fitted estimates; neither correction shrinks the CAD or changes field clearance.

Prepared runtime: **3,653,292 bytes, 573,898 triangles, 71 primitives**, SHA-256 `41f3fda85fed7c66ddaf2df6a283a88cbc7bd89af398f63faf91f37d246aee17`. The same 894 CAD bodies and five removed decorative fuel bodies are retained. Geometry remains within the original budgets and source/redistribution status is unchanged. Historical measurements below describe the earlier preparation where superseded by this correction.

Performance update (November 2, 2026): [the lineup research audit](../../../../docs/ROBOT_PERFORMANCE_RESEARCH.md) supersedes earlier rate, drive/traction and motion-rating estimates below. CAD/capacity and previous validation descriptions remain historical evidence.

Selectable, owner-supplied Worlds CAD robot with a linear intake, fuel-dependent shooting retraction, an independent lower bar, two intake rollers, rotating-floor indexer, fixed feed tower, finite-travel turret and adjustable hood. Uses the shared simulation, fuel bodies, controls, camera and match lifecycle.

The user's exact [Onshape document/workspace/element](https://cad.onshape.com/documents/af9429d854eeaa98a1b3eeda/w/2554bb5ba18919b03a73491d/e/0bdb27080b01fd9a708ccf46) is the Worlds link in the [official release, post 521](https://www.chiefdelphi.com/t/frc-4481-team-rembrandts-2026-build-thread-open-alliance/507296?page=26). This is Era II, distinct from Regionals Era. The uploaded GLB's root is `TR26-00-1000_4481_Robot Worlds`.

Branch: `robot/4481-era-ii`. Originally based on main `0d64cbb`, then normally merged the tested Spectrum/Matterhorn/Citrus/Darwin/moving-shot integration stack at `88e062f`. Those preceding PRs are dependencies until integrated into main. No main merge or deployment is part of this contribution.

## CAD and preparation

The owner provided `Rembrandts 4481 Worlds.glb` as 14 ordered binary parts. Reassembled input: **362,992,644 bytes**, SHA-256 **6502ca903919ef90fab559e73bab930cd6335a362fc9585fb2a552beca893fc4**, matching the supplied join script's expected hash. The script was inspected as data and not executed. Raw CAD/parts stay ignored. Source access through Onshape/GrabCAD had previously been unavailable; this upload supplies the actual geometry rather than a substitute.

Reproduce from the repository root with Node 26 and installed pinned dependencies:

```sh
node src/robot/robots/4481-era-ii/prepare.mjs
```

Place the original at `assets/source/robots/4481-era-ii/upload/Rembrandts 4481 Worlds.glb`. The converter verifies its hash, normalizes native Y-up/intake −Z to runtime intake −X, and subtracts .223 m for the chassis reference. It removes **all five `GP26_FUEL` decorative balls**, omits 1,833 fastener/small-detail bodies, retains 894 CAD bodies, batches by articulation/material, simplifies and Meshopt-compresses the model. The ignored preparation report records the actual output. No raw geometry, scripts or conversion run at player runtime.

Runtime: **3,652,424 bytes / 573,754 triangles / 71 primitives**, within the unchanged 6 MiB / 650k / 160 limits. SHA-256: **a3a93d96eacf396aaec50c764ff62975c74f4c9718cca66ac5a1d6c3b69781c6**. The robot-owned runtime record is discovered by existing build tooling; no common manifest, allowlist, dependencies or hosting changes.

## Measured geometry and source settings

Official robot code is pinned to [`e00d344b705b5e272229ba6ca5b6de26d93337af`](https://github.com/FRC-4481-Team-Rembrandts/2026-robot-public/tree/e00d344b705b5e272229ba6ca5b6de26d93337af). Individual file URLs/hashes and pending CAD redistribution status are in `assets/robots/4481-era-ii/sources.json`. The owner's authorized noncommercial v1 publication policy applies; a public CAD release or code license is not recorded as CAD-rights clearance.

| Parameter | Evidence / treatment |
| --- | --- |
| Bumpers | CAD envelope .8524 × .8524 m, vertical .0631–.1774 m; fabric uses the shared red/blue material and rendered 4481 numbers. |
| Swerve | Actual SDS MK5i wheel/fork bodies; CAD centers ±.27332 m, wheel radius .0508 m. Code nominal wheelbase/track .546 m. Axles normalized to +Z and mounts remain rigid. |
| Drive | Official code maximum 5.8 m/s and 9.4 m/s² powered acceleration. Estimated 18.8 m/s² wheel braking prevents lingering full-speed wheel spin after a wall push; chassis force remains traction-limited. Shared turn response/ground support preserved. |
| Turret | CAD bearing [.15,.17315,−.15] relative to chassis; flywheel axle [.2425,.25535,−.15] in prepared neutral pose. Remove the export's 20.918° yaw, with launch toward +X. |
| Flywheel | Actual 40 mm outer tread radius; 79 mm metal flywheel bodies and hubs spin with it. Do not interpret the source constant named `FLYWHEEL_RADIUS = 4 inches` as a CAD radius. |
| Turret range | Team code 370° mechanical range; use its conservative operational ±182.8° stops. Choose an equivalent legal bearing and reverse through the allowed range at a cable stop. |
| Hood | Real curved skin/cross brace animated around the flywheel. Controller angles −75° to −49°; the positive **49–75° launch-angle mapping is an estimate**, not a measured encoder calibration. |
| Moving-shot limits | Official code hub 1.7 m/s / 1 rad/s; passing 3 m/s / 3 rad/s. Above either limit, release waits while aiming remains active. |
| Indexer | CAD floor disk radius .208 m at [−.038,−.0951,0]. Its 5 rad/s speed and .45 floor friction are estimates. Contact friction affects supported balls only; the animation uses the same actuator angle. |
| Hopper | Full-size 150 mm spheres, 151 mm seed pitch; **48 slots** within the fixed walls, moving front wall, cone, tower and inclined rear funnel. This is a simulation working-capacity estimate, not a measured team specification. |

The complete CAD's rear `TR26-CM` assembly contains UC-844 cameras. The pinned `VisionConstants.java` independently identifies four matching rear cameras/heights. Preserve these fixed mounts; this model has no supported climber, so no C control is exposed.

## Controls and mechanism behavior

- **WASD** drive; **J/L** rotate; **Shift** collect; **Q** reverse; **Space** aim/shoot/pass; **R** restart; Escape opens controls/settings. Shared rebinding and controller handling are retained.
- The four constant-force springs passively deploy the intake at session start. Its estimated 260 mm travel/95 mm rise follow the inclined rails. During shooting, the carriage retracts progressively as held fuel falls from 48 toward eight or fewer; eight or fewer allow full retraction. Intake/reverse demand extends it again, and releasing shooting restores extension. The lower kicker stays deployed independently of that slide. The separate passive kicker folds inside the bumper at the measured frame hinge in preview/reset and deploys only after simulation starts. Its 110° folding angle is an estimate; original CAD geometry is retained. Explicit `manualRetraction: false` prevents exposing an ineffective V button despite a real starting-to-deployed slide.
- Original intake rollers and fixed tower rollers spin on their real shafts. Each opposed upper feeder cylinder has its own center; the right cylinder counter-rotates so both sides feed upward. The floor disk stirs supported fuel with bounded friction during collection/shooting and reverses with Q. Upper cargo moves through normal sphere contacts, not a forced rigid stack.
- Intake transfer preserves each ball's lateral pickup column across a bounded .46 m inlet. It does not collapse the whole roller width into one point. The indexer cone, feed tower and inclined rear funnel exclude occupied volume from seeds and dynamic fuel contacts.
- A single managed/pipelined feed path carries the same owned IDs from the hopper into the fixed tower and rotating muzzle. The remaining detailed roller/brush/gear interactions are approximations, not a separate simulation or instant replacement ammunition.
- Every projectile launches physically with seeded angular/speed variation and spin. The .91 moving rating scales uncertainty, not a forced hit percentage; moving shots are not 100% accurate and are never corrected after release.
- Open hopper rims allow real overflow under aggressive loading/driving. Escaped fuel returns to field physics using its original body/ID; no invisible lid or replenishment is added.

## Explicit estimates and limits

18.8 m/s² unloaded wheel braking is an estimate, not a team-code deceleration measurement. The wall regressions retain their original clearance, sliding, reversal and turn assertions; no common bounds or friction were lowered.

59 kg empty mass, inertia [3.4,6.2,3.7] kg·m², grip 1.05, 38 fuel/s nominal intake, 16 shots/s, intake travel/rise, turret/indexer rates, hopper contact envelopes and scatter are gameplay estimates. CAD supplies geometry, not independently measured mass or throughput. The ballistic solver uses shared flight physics rather than claiming to replay the team's empirical RPM lookup table. Passing is bounded to the source's approximately 10 m envelope.

Fixed local boxes and one inclined envelope approximate the cone, tower and rear funnel. Wheels stay fixed to the frame; no suspension animation is added. AUTO remains driver-operated. No unsupported climb, multiplayer or opponent-rule capability is claimed. Full CAD hardware detail is simplified; original fastener/tessellation fidelity is deliberately not a runtime requirement.

## Integration points

All robot-specific code/assets/records live in this robot's folders. Shared changes are additive and optional:

- `src/robot/registry.ts`: one import/key, preserving prior order.
- `src/robot/types.ts`, `validateDefinition.ts`: finite turret/mode motion limits, local hopper obstacles, inlet width and rotating-floor data; one indexer spin source.
- `src/robot/hopperGeometry.ts`: browser-independent signed box/tilted-box contact math used for seeds and dynamic clearance.
- `src/sim/HopperDynamics.ts`: optional obstacle contacts and bounded powered-floor friction. Original fuel bodies and mass accounting remain shared.
- `src/sim/RobotSimulation.ts`: optional inlet-column preservation/indexer actuator, explicit passive-intake control support.
- `src/sim/SwerveChassis.ts`: optional separate wheel braking response, with legacy behavior unchanged when absent; Rembrandts keeps its source powered-acceleration limit.
- `src/sim/TurretTravel.ts`, `Shooter.ts`: legal cable-stop paths and mode-specific motion readiness; defaults preserve existing turrets/shooters.
- `src/robot/poses.ts`, `src/App.tsx`: one capability helper hides unsupported V actions; help explains motion limits/passive deployment and credits the team. Existing robots preserve their controls.
- `src/view/RobotView.ts`: indexer animation reads that same simulated angle; preview explicitly resets a previously deployed kicker.

These shared files overlap prior robot/core PRs. The normal merge from `88e062f` already preserves their current implementations. Review this contribution after that stack or merge with normal ancestry; do not replace shared files wholesale or squash dependencies without resolving the resulting duplicate changes.

## Validation

Validation results are recorded below after final checks. Tests exercise both-alliance shared acceptance, full-size packing and loading, discharge/conservation, actual-field hub shots/passes, passive intake behavior, wall escape, moving-shot limits, finite turret travel, powered-disk contact, inclined obstacles and measured CAD pivots/rigid modules. Visual QA uses an isolated local browser, including empty/full, stowed/deployed, turret/hood and alliance-color poses. No unperformed user-PC or deployed-site test is claimed.

Initial implementation evidence (`bef38ed`, November 2, 2026):

- `pnpm build:release`: passed integrity for 23 source runtime files (29.90 MiB), TypeScript/Vite and production payload checks. Sixteen content-hashed runtime outputs; no development UI or preparation files. The existing Rapier chunk-size warning remains.
- All 21 shared wall cases plus two focused braking cases pass, including empty/full-load sliding, reversing away, both real perimeter sides and turning clear. The source powered-acceleration target remains unchanged.
- Focused articulated-asset/finite-travel checks pass. All four measured wheel/fork roots, normalized axles, turret/hood nesting and disk pivot were checked against actual model data.
- Isolated CAD renders verify empty/full, stowed/deployed, red/blue bumpers and moved turret/hood poses with no page errors. No decorative CAD fuel remains.
- Actual app: all seven selector options retained; Rembrandts/red session with eight preloads starts; help visibly lists normal WASD/J/L/Shift/Space/Q/R bindings and motion limits, with no unsupported V/C action. Keyboard resume, drive/turn/intake/shoot inputs, pause and return to setup complete with selection retained and no page errors. A first medium-graphics pointer Resume attempt timed out under software WebGL; the successful run used low graphics and keyboard-accessible menu actions.
- `pnpm test:sim`: **323 tests passed across 46 files**, including all registered-robot definition/asset/shared acceptance cases and all existing match/shooter/hopper/rigid-swerve/wall regressions. No shared assertions were weakened.

## Feeder/kicker correction — November 2, 2026

The two `TR26-TW-2036` rollers are at native X .0526 and .2474 m, both Y .3511 m. Grouping by height had put both on the first shaft, making the second cylinder orbit vertically when Space ran the feeder. They now have separate axis-X nodes at runtime [.15,.1281,−.0526] and [.15,.1281,−.2474], with opposite spin directions.

The forward `TR26-IN-4013` kicker plates were incorrectly left fixed on the chassis, while the ramp/link bars were grouped with the linear intake. The original 4013/4014/4015/4021/4103 CAD pieces now form a distinct passive assembly about runtime hinge [−.22,−.0055,0]. Preparation folds it 110° inward; the existing passive-kicker actuator restores its exported deployed pose after play starts. This does not add a new control or change pickup, cargo mass, firing or collision tuning.

The current correction passes **47 focused tests across 8 files**, including real-GLTF/RobotView rotation checks throughout 360°, counter-rotation, folded footprint below .55 m, preview after deployment, paused pre-match state, restart, Rembrandts gameplay and shared rendering/definition/asset checks. `pnpm build:release` passes. The full 323-test result above is the pre-correction baseline; this visual correction used focused regression coverage.

Isolated browser renders also confirm folded/deployed kicker and quarter/half-turn feeder poses with no page errors.

## Fuel-dependent intake retraction

The owner requested shooting compression on this simulation variant. The team source describes a passively extended intake; this automatic retraction is a requested gameplay behavior, not a claimed measurement of a powered Era II mechanism. It reuses the existing shared cargo-limited actuator: full at 48, proportional partial extension as fuel is consumed, fully retracted at eight or fewer. Collection/reverse override it to extend. No manual V control is added.

The existing independent lower kicker/bar stays down after deployment while only the carriage and its rollers slide inward/upward. The moving hopper front boundary follows that same carriage position, so cargo is pushed by the existing solver. The model, bar hinge, cargo mass, IDs, capacity, feed path, turret, rates and other robots' settings are unchanged.

Validation: **329 tests passed across 48 files** with `pnpm test:sim`; `pnpm build:release` passes. The new full-load test fires all 48 original fuel bodies while recording progressively smaller intake extensions and a fully retracted empty pose. Actual GLTF/RobotView tests prove that the deployed lower bar position, rotation and bounds stay unchanged across carriage travel. Collection/reverse, pause and restart checks pass. Browser full/half/retracted poses show the bar staying down with no page errors.
