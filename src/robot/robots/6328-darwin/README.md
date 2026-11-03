# 6328 Mechanical Advantage · Darwin (2026)

Adds selectable `6328-darwin` with the official 26C body, hood, slapdown intake, sliding hopper front, roof, actual MK5i/MK5n modules, feeder rollers, drum and inertia wheel. Uses the shared driver-operated match, local cargo, scoring and stable fuel bodies. Independent branch `robot/6328-darwin` starts at main `0d64cbb`; it does not include/depend on the separate Citrus or other requested robot branches.

## Sources and exact document

The assignment is [this Onshape assembly](https://novalabsrobotics.onshape.com/documents/2da573df9d139d7a1e0f08a8/w/5266e52966df9f56fcb472f0/e/15a6a42133f059b818ad5264). Direct Onshape access is unavailable in this execution environment. The official [Mechanical-Advantage/RobotCode2026Public](https://github.com/Mechanical-Advantage/RobotCode2026Public/tree/559fa65be991303fec81d03c3de21e82a219da7c/ascope_assets/Robot_Darwin) exports provide usable original geometry:

- `model.glb`: fixed chassis, drive modules, superdexer and fixed launcher.
- `model_0.glb`: hood.
- `model_1.glb`: moving slapdown assembly.
- `model_2.glb`: sliding front/side panels.
- `model_3.glb`: roof and inner supports, not a climber.
- `config.json`: official visualization metadata, retained with its own hash.

All six files are pinned to `559fa65be991303fec81d03c3de21e82a219da7c`, with binary sizes/sha256 in `assets/robots/6328-darwin/sources.json`. The published extraction record `TylerHandel/rebuilt-sim-2026@344501f464477cb93517a7b5344b43d7ee9474a7/cad/robots/6328.json` identifies these official files as exports of the requested Onshape document `2da573df9d139d7a1e0f08a8`. No geometry or simulator implementation from that derivative is used here. The live workspace/element may have changed after the exported 26C revision; that cannot be checked through the blocked direct connection.

Team-code factual references at the same pinned commit: `DriveConstants.java`, `DarwinMechanism3d.java`, `slamtake/Slam.java`, `launcher/hood/Hood.java`, `launcher/flywheel/Flywheel.java`, and `launcher/LaunchCalculator.java`. Source code is used to establish units, targets and mechanical geometry, not to copy another simulation. CAD redistribution review remains **pending** under the owner-authorized noncommercial v1 policy; the code's MIT license is not treated as proof of CAD clearance.

## Geometry and gameplay values

| Parameter | Value | Status |
| --- | --- | --- |
| Frame convention | Intake −X, shooter +X; .223 m chassis reference | Native official CAD: Y up, intake +Z |
| Bumper envelope | .8763 m along X × .8509 m across Z | Actual exported bumper mesh; wood/foam retained, not reconstructed blocks |
| Module centers | X ±.282575 m; Z ±.269875 m | Measured exported centers; calibrated code track dimensions/axes differ, so physical/visual mount placement follows this CAD |
| Wheel radius | .0508 m | Exported nominal 4 in tread; team calibrated rolling radius differs slightly |
| Empty mass | 150 lb = 68.0389 kg | Team trajectory-model parameter, not a claimed scale measurement |
| Inertia | `[3.4, 6, 3.7]` kg·m² | Y = team rotation MOI parameter; X/Z estimates |
| Drive target / grip | 4.2 m/s / 1.5 | Team code target and modeled coefficient; actual loaded acceleration remains physical |
| Acceleration command | 10 m/s² | Gameplay estimate |
| Intake pivot | `[-.317, -.0375, 0]` | Measured CAD hinge |
| Intake stroke | 128.408204° | Team CAD-derived slam limits: 17.4088627799–145.8170667799° |
| Horizontal front stroke | .308478754 m | Calculated from team slot calibration dimensions; nine normalized samples keep its nonlinear motion |
| Drum pivot / radius | `[.26392, .26307, 0]` / .0508 m | Measured CAD center and tread |
| Hood travel | 31.2° | Team mechanism limits: 10–41.2° |
| Projectile elevations | 48.8–80° | Complementary-angle gameplay fit; not a measured release calibration |
| Three channels | Z −.17, 0, +.17 m | Fit full-size 150 mm fuel across the actual ~.533 m drum |
| Capacity | 48 | Fitted non-overlapping full-size packing within the unchanged fixed roof; gameplay capacity, not a measured real maximum |
| Intake / firing rate | 40 fuel/s / 24 shots/s nominal | Gameplay estimates, not source measurements or a user-provided spec card |
| Moving accuracy rating | .93 | Shared physical spread parameter, not a measured 93% hit rate; no forced outcomes/in-flight correction |
| Pass range | 17.16 m | Maximum distance represented in the team's passing table; the shared solver still requires a feasible clear trajectory |
| Roof | Fixed at the exported .554692 m assembly height | Published visualization/code retains this setting; no active compactor control is claimed |

The complete supplied subsystem tree contains no climber, and model_3 is visibly a roof/hopper stage. Climb is disabled; C is not falsely advertised. Nothing is inferred from another season's mechanism.

## Controls and mechanism behavior

WASD drive, J/L yaw, Shift intake, Q reverse, Space align/shoot/pass, V manual intake retraction/extension and R restart use the shared editable bindings. The Controls dialog shows V for this pivot intake. Active play retains the scoreboard-only interface.

At start the intake and linked front deploy. V retracts both as cargo permits; Shift/Q extend for collection/ejection. Shooting compresses the intake as fuel empties. The front panels, their articulated collision proxies and the cargo front boundary follow the same sampled cam-slot extension. At half intake stroke the front is approximately 67% extended, not 50%. Other robot definitions keep their existing transform/contact behavior.

Cargo seeds are non-overlapping full-size entry positions and then evolve in the existing local sphere solver. The conservative inner floor/walls/roof are gameplay contact envelopes, not detailed roller or net contact. Ownership, mass/inertia and physical launch use each fuel's original ID/body once. The fixed launcher uses chassis yaw; there is no turret grafted onto the model.

The owner's November 2 follow-up increases capacity from 40 to 48 and adds estimated per-robot release scatter/spin. Re•Blitz and Kepler receive the same shared model with their own profiles and revised 65/60 capacities. [Shot tuning notes](../../../../docs/SHOT_TUNING.md) distinguish the available FRSim/TBA context from physical gameplay estimates and the unavailable Statbotics data. Accuracy is not forced into a hit/miss percentage; the full-field shots still collide, miss, rebound and score normally.

## Reproduce and payload

With Node 26 and the pinned pnpm dependencies, from repo root:

```sh
node src/robot/robots/6328-darwin/prepare.mjs --download
pnpm robot:branch --team=6328
pnpm test:robots
pnpm test:sim
pnpm build:release
```

Without `--download`, the converter verifies inputs already in ignored `assets/source/robots/6328-darwin/`. It copies all five actual assemblies, removes fasteners/hidden small hardware, keeps the roof, separates the actual drum/intake/floor rollers and steerable modules, normalizes wheel axles to +Z, welds/simplifies per material/assembly and writes embedded Meshopt geometry. Original paint is retained with modest palette quantization; only the actual bumper foam material is recolored by alliance. Source exports contain no embedded fuel. Camera/reference geometry and raw CAD never ship at player runtime.

Final payload: **3,088,188 bytes; 512,969 rendered triangles; 108 primitives**. Each remains below the unchanged shared budgets of 6 MiB / 650k / 160. Per-robot `runtime.json` is generated with the actual output hash; no common manifest, build tooling or allowlist changes.

## Shared integration points and merge conflicts

| File | Why touched / integration guidance |
| --- | --- |
| `src/robot/registry.ts` | One import and entry, preserving existing IDs/order; combine concurrent entries rather than replacing the registry line |
| `src/robot/types.ts` | Optional monotonic `hopper.intakeCurve` samples and estimated `shooterGeometry.spread` profile |
| `src/robot/validateDefinition.ts` | Validate finite monotonic curve endpoints and launch-spread parameters |
| `src/robot/poses.ts` | Pure interpolation helper for definition-owned linkage data |
| `src/sim/RobotSimulation.ts` | Pivot/manual V/controller eligibility and linkage pose/storage mapping; preserve any incoming Citrus climber/coupled-hopper extensions |
| `src/sim/HopperDynamics.ts` | Only choose the correct linked front pose for this definition; no gravity, friction, cargo-weight or solver changes |
| `src/App.tsx` | V help eligibility, brief capability guidance and CAD credit; preserve Citrus credits/guidance if integrating both contributions |
| `THIRD_PARTY_NOTICES.md` | Official CAD provenance and pending rights status |
| `src/sim/SwerveChassis.ts` | Rigid tire proxies, faster manual yaw/steering response and low-friction frame contact using Rapier minimum combination; numerical ground support remains |
| `src/sim/Shooter.ts` | Normalize chassis aiming against the shared turn-rate scale, sample release uncertainty/spin and retain pass clearance and full-load shot history |
| `src/view/RobotView.ts` | Retain exact prepared wheel/fork translations during terrain lean, steering and spin |
| `src/robot/defaults.ts` | Clarify that support defaults do not represent hardware suspension; numeric defaults unchanged |
| `src/sim/RigidSwerve.test.ts`, `src/view/RobotView.test.ts` | Registry-wide fixed-mount, loaded turning, braking, precision and airborne regressions |
| `docs/GAMEPLAY_TUNING.md` | Document accepted rigid-mount behavior and manual turning targets |
| `src/sim/FuelSystem.ts` | Stable per-ID foam restitution estimates; original bodies, size and mass retained |
| `src/sim/ShotScatter.ts`, `src/sim/ShotScatter.test.ts` | Shared launch uncertainty/spin and physical statistical/rebound/full-load checks |
| `src/robot/cargoPacking.ts`, `src/robot/CargoPacking.test.ts` | Full-size close-packed seed helper and capacity/boundary validation |
| `src/robot/robots/2910-reblitz/cargo.ts`, `src/robot/robots/2910-reblitz/definition.ts` | Requested 65-fuel packing and independent 2910 spread profile |
| `src/robot/robots/1690-kepler/definition.ts` | Requested 60-fuel packing and independent Kepler spread profile |
| `src/sim/Kepler.test.ts`, `src/sim/Shooter.test.ts`, `src/sim/MatchSimulation.test.ts`, `src/sim/SessionFeatures.test.ts` | Revised full-capacity and physical uncertainty expectations; scoring remains tied to actual processed fuel |
| `docs/SHOT_TUNING.md` | Source limitations, estimated profiles and capacity rationale |
| `src/sim/WallContact.test.ts` | Empty/full wall sliding, normal reversal and both real perimeter sides; no escape teleports or weakened boundaries |

All registered robots retain rigid CAD module mounts and the faster manual turning follow-up. The shared accuracy/capacity changes are also included on the separate Citrus preview branch; they are estimated gameplay tuning rather than copied team performance measurements. Camera, match timing, dependencies and per-team drive parameters remain as before. The V/help lines overlap with Citrus; retain the common manual-pivot eligibility once. Preserve incoming hopper solver work and apply only the optional pose selection. Merge spread profiles and revised scoring expectations with any parallel moving-shot work rather than replacing it wholesale. Runtime records and CAD preparation files remain robot-owned.

## Verification and remaining limits

Final November 2 checks: `pnpm robot:branch --team=6328` passed; `pnpm test:robots` passed 35 tests across 8 files; `pnpm test:sim` passed 194 tests across 31 files; `pnpm build:release` passed asset integrity, TypeScript/Vite compilation and production-payload validation. The existing large Rapier chunk warning remains. Intended capacity and accuracy assertions now match the requested behavior; conservation and physical scoring checks remain.

`Darwin.test.ts` covers the nonlinear linkage, validation, full-size packing, loaded motion and payload conservation, pause/restart, real intake/reverse on both alliances, stationary/moving physical hub hits, three-lane full-load cadence, physical passing landings, actual bump/trench support, blocked trench shots and field perimeter. `DarwinAssets.test.ts` checks all assemblies, roof and roller hierarchy, normalized MK5i/MK5n axles and pinned provenance. Shared registry acceptance covers both alliances with immutable definitions and original fuel bodies.

Focused isolated Chromium checks exercise setup/selection, W/V/Space events, visible control help, actual red/blue bumper materials and restart conservation. Full-field drawing is disabled during input checks to avoid slow software-rendered field frames; separate real RobotView WebGL renders inspect stowed, deployed, partial-linkage and low-hood poses, badges and colors. Raw exports/reports/screenshots remain ignored.

The November 2 real-CAD browser check also traverses actual bump geometry for all three registered robots: each wheel/fork remains at its exact prepared translation (zero mount drift), whole-chassis terrain lean remains active, and Darwin reaches about 6.36 rad/s in the empty flat-floor turning check. Tire proxies are rigid; the stable ray-based contact solver is an approximation, not physical module suspension.

The wall-contact follow-up reproduces the owner’s reported sticking before the fix and verifies small-command sliding, backing away and turning after clearance. Low-friction frame surfaces now retain their intended material coefficient instead of averaging it up with the field; tire traction and collider envelopes are preserved.

The latest browser review fills all 65/60/48 slots through actual mouth collection and renders the original CAD with full hoppers. Shared distribution tests cover bounded unbiased release variation, deterministic resets, original-body spin and differing physical rebounds.

Contact envelopes, packing capacity, rates and launch fitting need driver/spec feedback. The nine-sample slot mapping approximates a continuous linkage. The fixed roof retains its published pose; active vertical compaction is not modeled or advertised. This is not a full motor/gearing, compliant net, free tipping or every-CAD-surface collision simulation. The existing managed feed/recovery/aim policies remain in force. CAD publication rights and the current live Onshape revision remain unverified as noted above.

## Compatible PR integration

The branch now contains the moving-shot/match-stop PR via a normal merge. Shared integration also touches `src/sim/FieldSimulation.ts` (disabled hold), `src/sim/MovingShotsAndStop.test.ts` (inherited regressions) and `docs/KEPLER.md` (motion-estimate notes). The newer per-robot scatter distribution remains singular; motion estimation, acceleration sensitivity, spin and recoil are reconciled. TypeScript and 20 targeted moving-shot, cutoff, wall and scatter checks pass. Recommended merge order: moving-shot/match-stop, Darwin, Citrus. Prior full-suite/build evidence above predates this merge; targeted checks were used for the requested usage budget.
