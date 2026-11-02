# 4481 Team Rembrandts — Era II (2026 Worlds)

Selectable, owner-supplied Worlds CAD robot with a passive linear intake, two intake rollers, rotating-floor indexer, fixed feed tower, finite-travel turret and adjustable hood. Uses the shared simulation, fuel bodies, controls, camera and match lifecycle.

The user's exact [Onshape document/workspace/element](https://cad.onshape.com/documents/af9429d854eeaa98a1b3eeda/w/2554bb5ba18919b03a73491d/e/0bdb27080b01fd9a708ccf46) is the Worlds link in the [official release, post 521](https://www.chiefdelphi.com/t/frc-4481-team-rembrandts-2026-build-thread-open-alliance/507296?page=26). This is Era II, distinct from Regionals Era. The uploaded GLB's root is `TR26-00-1000_4481_Robot Worlds`.

Branch: `robot/4481-era-ii`. Originally based on main `0d64cbb`, then normally merged the tested Spectrum/Matterhorn/Citrus/Darwin/moving-shot integration stack at `88e062f`. Those preceding PRs are dependencies until integrated into main. No main merge or deployment is part of this contribution.

## CAD and preparation

The owner provided `Rembrandts 4481 Worlds.glb` as 14 ordered binary parts. Reassembled input: **362,992,644 bytes**, SHA-256 **6502ca903919ef90fab559e73bab930cd6335a362fc9585fb2a552beca893fc4**, matching the supplied join script's expected hash. The script was inspected as data and not executed. Raw CAD/parts stay ignored. Source access through Onshape/GrabCAD had previously been unavailable; this upload supplies the actual geometry rather than a substitute.

Reproduce from the repository root with Node 26 and installed pinned dependencies:

```sh
node src/robot/robots/4481-era-ii/prepare.mjs
```

Place the original at `assets/source/robots/4481-era-ii/upload/Rembrandts 4481 Worlds.glb`. The converter verifies its hash, normalizes native Y-up/intake −Z to runtime intake −X, and subtracts .223 m for the chassis reference. It removes **all five `GP26_FUEL` decorative balls**, omits 1,833 fastener/small-detail bodies, retains 894 CAD bodies, batches by articulation/material, simplifies and Meshopt-compresses the model. The ignored preparation report records the actual output. No raw geometry, scripts or conversion run at player runtime.

Runtime: **3,597,364 bytes / 566,412 triangles / 69 primitives**, within the unchanged 6 MiB / 650k / 160 limits. SHA-256: **ecfb4c6f53e7c6dcf074022355f7f293c41b8dc72357374b5a84a044d1f08930**. The robot-owned runtime record is discovered by existing build tooling; no common manifest, allowlist, dependencies or hosting changes.

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
- The four constant-force springs passively deploy the intake at session start. Its estimated 260 mm travel/95 mm rise follow the inclined rails. The intake stays out during firing. Explicit `manualRetraction: false` prevents exposing an ineffective V button despite a real starting-to-deployed slide.
- Original intake rollers and fixed tower rollers spin on their real shafts. The floor disk stirs supported fuel with bounded friction during collection/shooting and reverses with Q. Upper cargo moves through normal sphere contacts, not a forced rigid stack.
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
- `src/view/RobotView.ts`: indexer animation reads that same simulated angle.

These shared files overlap prior robot/core PRs. The normal merge from `88e062f` already preserves their current implementations. Review this contribution after that stack or merge with normal ancestry; do not replace shared files wholesale or squash dependencies without resolving the resulting duplicate changes.

## Validation

Validation results are recorded below after final checks. Tests exercise both-alliance shared acceptance, full-size packing and loading, discharge/conservation, actual-field hub shots/passes, passive intake behavior, wall escape, moving-shot limits, finite turret travel, powered-disk contact, inclined obstacles and measured CAD pivots/rigid modules. Visual QA uses an isolated local browser, including empty/full, stowed/deployed, turret/hood and alliance-color poses. No unperformed user-PC or deployed-site test is claimed.

Final local evidence (November 2, 2026):

- `pnpm build:release`: passed integrity for 23 source runtime files (29.90 MiB), TypeScript/Vite and production payload checks. Sixteen content-hashed runtime outputs; no development UI or preparation files. The existing Rapier chunk-size warning remains.
- All 21 shared wall cases plus two focused braking cases pass, including empty/full-load sliding, reversing away, both real perimeter sides and turning clear. The source powered-acceleration target remains unchanged.
- Focused articulated-asset/finite-travel checks pass. All four measured wheel/fork roots, normalized axles, turret/hood nesting and disk pivot were checked against actual model data.
- Isolated CAD renders verify empty/full, stowed/deployed, red/blue bumpers and moved turret/hood poses with no page errors. No decorative CAD fuel remains.
- Actual app: all seven selector options retained; Rembrandts/red session with eight preloads starts; help visibly lists normal WASD/J/L/Shift/Space/Q/R bindings and motion limits, with no unsupported V/C action. Keyboard resume, drive/turn/intake/shoot inputs, pause and return to setup complete with selection retained and no page errors. A first medium-graphics pointer Resume attempt timed out under software WebGL; the successful run used low graphics and keyboard-accessible menu actions.
- `pnpm test:sim`: **323 tests passed across 46 files**, including all registered-robot definition/asset/shared acceptance cases and all existing match/shooter/hopper/rigid-swerve/wall regressions. No shared assertions were weakened.
