# 9496 LYNK · Matterhorn (2026)

Performance update (November 2, 2026): [the lineup research audit](../../../../docs/ROBOT_PERFORMANCE_RESEARCH.md) supersedes earlier rate, drive/traction and motion-rating estimates below. CAD/capacity and previous validation descriptions remain historical evidence.

Independent contribution `robot/9496-matterhorn`, based on `origin/main` at `0d64cbb`. Adds selectable owner-supplied release CAD, real MK5n modules, passive slapdown intake, sliding hopper front/side panels, roller floor, vertical feeder and a full-width drum with its brass flywheels. Uses the existing driver-operated match, stable fuel ownership and physical hub scoring. No separate robot simulation is introduced.

## Exact source and reproduction

The assigned [Onshape document/workspace/element](https://cad.onshape.com/documents/768d7890bafac55a2a891aae/w/a270c1901be101ad8a97909d/e/df73afab8b112242516b9ad0) is independently identified by the [team CAD release](https://github.com/LynkRobotics/Lynk-Build-Logs/blob/fadbbd079612fa86495e66da3eceb3c1467bf09b/2026/CAD-Release.md). The owner supplied `9496 LYNK.glb` inside `9496 LYNK.7z`; it is the sole runtime geometry input. An earlier public derivative was investigated but is not used in the prepared model.

Input: **214,524,968 bytes**, SHA-256 `e004d5b5288c78d4373953f311d5d2c47f766d346536f182c3b1494c6851a552`. The source hierarchy contains `V2 TOP LEVEL ASSEM`, `Feeder V3`, `Comp Hopper V5`, `Comp Shooter V2`, `Intake V2`, `Bumper`, `Hopper Floor V4` and `Chassis`. The complete hierarchy contains no climber or physical retaining-net mesh. Direct live Onshape access is unavailable, so equality with its current workspace revision is not claimed.

`assets/robots/9496-matterhorn/sources.json` pins the upload, release identity and [official team-code revision](https://github.com/LynkRobotics/RobotCode2026Public/tree/6f60fc922916c545dad909ee42fa715b992a41e5). Code supplies factual drive/RPM targets; no team Java or other simulator implementation is copied. [Team discussion](https://www.chiefdelphi.com/t/lynk-9496-build-log-2026/511797?page=8) confirms fixed-hood shooting with RPM control, passive intake deployment, intake pulsing and a retaining net.

With the original upload at `assets/source/robots/9496-matterhorn/upload/9496 LYNK.glb`, from the repository root:

```sh
node src/robot/robots/9496-matterhorn/prepare.mjs
pnpm robot:branch --team=9496
pnpm test:robots
pnpm test:sim
pnpm build:release
```

Preparation verifies the input hash; removes bolts, rivets, washers, bearings and other small hardware; preserves 381 visible source occurrences; normalizes axes; separates real moving geometry; batches by assembly/material; simplifies CAD tessellation; and embeds Meshopt geometry. All four actual wheel/fork pairs are unsteered from the export's 45-degree pose, using the complete wheel bounds rather than one tessellation face. No raw CAD, original metadata, caches or preparation reports ship at runtime.

Final CAD payload: **2,989,292 bytes / 617,626 rendered triangles / 121 primitives**. Shared ceilings remain 6 MiB / 650k / 160. `runtime.json` records the exact output hash and pending redistribution review. Existing owner-authorized noncommercial v1 publication applies; attachment, public access and code licensing are not treated as proof of CAD rights.

## Geometry versus estimates

| Parameter | Value | Evidence/status |
| --- | --- | --- |
| Bumper envelope | .83185 m along X × .8382 m across Z | Supplied actual bumper geometry; not reconstructed blocks |
| Frame convention | Intake −X, Y up, chassis reference .223 m | Source intake +Z normalized by a −90-degree Y rotation |
| Module centers | X/Z ±.276225 m | Measured CAD; official code's older 20.75-inch track differs, so mounts follow this upload |
| Wheel radius | .0508 m | Actual MK5n molded wheel |
| Speed target | 14.4 ft/s = 4.38912 m/s | Team MK5n R1 code target; not a loaded speed measurement |
| Acceleration / grip | 10 m/s² command / 1.05 | Gameplay estimates, with force-limited traction |
| Empty mass / inertia | 66 kg / `[3.5, 6, 3.8]` kg·m² | Estimates; team reports a robot near the weight limit |
| Intake pivot | `[-.32385, -.03885, 0]` | Actual source hinge |
| Fold at reset | −115 degrees | Stow-pose fit; shooting-linked folding is an owner-requested gameplay approximation |
| Hopper front travel | .3048 m | Fit between expanded front panel and fixed-panel overlap |
| Drum center/radius | `[.127, .231025, 0]` / .0508 m | Measured source drum and brass-wheel axle |
| Shooter direction | Toward intake, yaw offset π | The source drum/guide arrangement uses the intake-facing exit; barrel/muzzle, clearance and launch all use this same frame |
| Hood | Fixed; no animated hood joint | Team explicitly confirms RPM-only distance adjustment |
| Projectile elevation | 56 degrees | Fitted complementary-angle interpretation of the early hood discussion, not a measured release calibration |
| Full-width output | Three scheduling bands centered at Z −.12333, 0, +.12333 m, each with ±.06167 m variation | Continuous fuel-center coverage ±.185 m, with a full 75 mm sphere radius inside the measured .5255 m drum span |
| Intake limit | 42 full-size 150 mm fuel | Fitted non-overlapping entry seeds; upper fuel can spill while driving. This is an intake limit, not a guaranteed retained load or measured team capacity |
| Hopper floor/rim | Sloped floor; local wall tops Y=.308 front, .34 rear and .31 sides | Finite wall contacts fitted to CAD panel/shooter tops. No invisible lid or simulated retaining net |
| Cargo seed height / inlet | Local Y≤.44 m / `[-.45, .24, 0]` | Seed height is not a dynamic ceiling. Actual intake enters at the inlet and falls into evolving cargo, rather than targeting an old packing slot |
| Rear storage limit | X = −.006 m, ahead of the CAD shooter housing | Bounds the complete 75 mm-radius fuel, so stored spheres cannot enter the drum or motor/sideplate region |
| Hopper panel finish | Smoke-gray RGBA `[.12, .13, .14, .42]`, nonmetallic, double-sided alpha blend | User-requested visual finish on the five original hopper panels; hardware keeps its CAD material |
| Intake / fire rate | 35 fuel/s / 18 shots/s nominal | Gameplay estimates; readiness/clearance/feed path constrain actual cadence |
| Passing limit | 9 m | Range represented in team passing calibration; physical clearance still gates release |
| Moving-accuracy rating | .90 | Relative uncertainty input, not a 90% hit guarantee |
| Release uncertainty | .030 yaw / .035 elevation radians, .035 speed fraction, .10 wider-tail probability, 30 rad/s spin | Explicit gameplay estimates; misses/rebounds remain physical |

Stored fuel subsequently moves in the existing local sphere solver. Full-size entry seeds do not pin a visual stack or create replacement ammunition. Payload mass is accounted once through original held fuel IDs/bodies. Finite wall contacts approximate the CAD panels. Spheres contact the rim and can roll over it. An escaped sphere re-enables its original Rapier body at the solved position, with local and chassis linear/angular motion, and leaves payload accounting immediately. It falls and collides on the field, can be collected again and never receives shot credit. The omitted net supplies no invisible retention; cloth and soft-fuel deformation are not simulated.

## Controls and behavior

WASD drive, J/L turn, Shift collect, Q reverse, Space aim/shoot/pass and R restart retain editable shared bindings. Intake and front deploy at session start. Holding Space contracts the hopper front and folds the intake/kicker assembly upward as the remaining cargo permits; releasing Space extends them. Shift or Q overrides contraction, including simultaneous Shift/Space. This uses the existing load-aware pose controller and the real pivot/slide geometry. There is no V retraction or C climbing capability. The team source confirms passive deployment; automatic retraction is the owner-requested gameplay behavior, not a newly verified powered real-team mechanism. The real drum, brass wheels, intake rollers, floor rollers and feeder rollers animate around their authored axles; feeder/floor spin directions transport toward the shooter, while the intake collects below its roller.

Shoot aims the chassis with the intake facing the target, holds the real fixed hood angle, and solves for flywheel speed/flight time. A fixed-hood robot can have an infeasible near/obstructed shot; it does not secretly adjust its hood or force a hit. Passing searches farther legal landing points within its alliance zone when a shorter fixed-angle arc would hit the field net. Physical release scatter/spin is sampled once, with no in-flight correction or selected misses. Simultaneous collection/firing is enabled; exact team motor-pulsing/agitation timing is not modeled.

All modules remain rigidly mounted during steering and bump lean. Shared ground-query support stays numerical, not hardware suspension. Low-friction frame contact uses Rapier's minimum combine rule so a small sideways command can slide along a wall; physical field boundaries and tire-force traction remain active.

## Shared integration and merge guidance

| File | Reason / merge guidance |
| --- | --- |
| `src/robot/registry.ts` | One import/entry; combine other teams' entries instead of replacing the registry |
| `src/robot/types.ts`, `src/robot/validateDefinition.ts` | Optional fixed elevation, launch yaw offset, per-robot spread, finite hopper rim and inlet. Preserve incoming linkage/press/climber fields from other robot PRs |
| `src/sim/HopperDynamics.ts`, `src/sim/HopperDynamics.test.ts` | Optional finite wall-top contacts, open top and spill handoff; normal/friction contact impulses, damped relative motion and a field-contact callback avoid artificial ejection velocities. Definitions without `rim` retain the existing enclosed solver |
| `src/sim/RobotSimulation.ts` | Optional inlet delivery, open-cargo contact queries against actual static field CAD before/after chassis motion, and spill handoff to original bodies with chassis/local velocity and payload removal |
| `src/sim/FuelSystem.ts` | Restore full collision filters and normal restitution on release/reset; open-hopper spills use a softer contact material until the next release/reset |
| `src/sim/Shooter.ts` | Shared fixed-angle flight-time root search and farther fixed-hood pass points; consistent yaw offset for muzzle, feed, clearance, aim and launch; optional launch scatter/spin. Existing variable-hood definitions retain their original path. Reconcile with the pending motion-estimation/match-stop/spread integration instead of replacing it wholesale |
| `src/sim/ShotScatter.ts` | Reuses the project's definition-owned bounded release sampler; separate resettable RNG from feed/lane ordering |
| `src/sim/SwerveChassis.ts` | Previously accepted rigid tire proxies, faster manual steering/yaw and low-friction contact. Preserve incoming disabled-drive hold and optional collider parts |
| `src/view/RobotView.ts` | Previously accepted fixed module translations while steering/spinning and leaning as a complete chassis |
| `src/robot/defaults.ts` | Clarifies ground support versus fixed CAD mounts; numeric support defaults unchanged |
| `src/sim/RigidSwerve.test.ts`, `src/sim/WallContact.test.ts`, `src/view/RobotView.test.ts` | Registry-wide mount, turning, loaded/empty wall escape and airborne regressions |
| `src/App.tsx` | Capability-based fixed-hood help and team CAD credit; selector remains registry-driven |
| `THIRD_PARTY_NOTICES.md` | Source/upload attribution and pending CAD review |
| `docs/GAMEPLAY_TUNING.md` | Accepted shared rigid-mount/turning behavior from the existing project follow-up |

The rigid-mount/turning follow-up was reused from existing project commit `61c418c`; this is not a wholesale inheritance of another team's definition. Camera, match timing, dependencies/lockfile, asset limits, allowlist, common manifest and build tooling remain unchanged. Only the exact prepared GLB and robot-owned runtime/source records are added. Other new robots are separate contribution branches.

## Verification and remaining limits

Focused checks cover real-field hub shots on both alliances, fixed hood/backward aim, legal passing, passive deployment, full-capacity actual intake/firing, loaded wall support, original fuel bodies/mass and no fabricated retraction/climb. Asset checks cover the upload hash, runtime integrity, actual MK5n mounts/axles, drum/flywheels, moving front and feeder hierarchy. Shared acceptance checks preload, intake, reverse, shooting, pause/restart and immutable definitions.

A focused real RobotView WebGL review inspected stowed, half-deployed, expanded red/blue and full-42-fuel poses with no application errors. Browser artifacts remain ignored. The source export omits its net; finite wall/contact fits, fixed release calibration, throughput, mass and contact envelopes need driver feedback. Detailed net deformation, motor gearing/control loops, roller compliance and every-CAD-surface collision are outside the shared model. The current live Onshape revision and CAD rights status remain as disclosed above.

Final checks: `pnpm test:robots` passed 28 tests across 7 files; `pnpm test:sim` passed 181 tests across 29 files. After the final CAD-fitted feeder path/spin-direction correction, 16 affected robot/asset/shared-acceptance checks passed. The final `pnpm build:release` passed asset integrity, TypeScript/Vite and the 12-asset production payload. The existing Rapier chunk advisory remains.

## Open hopper refinement — November 2, 2026

Driver feedback requested a smaller, natural load and fuel that can actually fall out. The intake limit is 42 instead of the previous 49, with a lower seed arrangement. The hopper is open above the real panels: finite front/side/rear wall tops replace the invisible retaining ceiling. The unchanged smoke-gray translucent CAD panels show loose spheres moving under gravity, inertia and ball contacts. Intake feeds at a defined inlet so new fuel does not jump into a slot already occupied by moving cargo. Direct contact impulses prevent positional separation from spuriously launching a light load.

Spilled fuel returns to the same Rapier body with its solved position, local velocity and chassis point velocity. It leaves payload mass, remains in the finite field supply and can be collected again. Pausing freezes it; restart restores it through the existing fuel system. There is no forced spill quota or automatic top-up. A full load stays at rest but can shed upper fuel during a tight turn. Detailed cloth/net retention and soft-fuel deformation remain outside this model.

The rear feed path is also fitted to the curved guide: X=.224 m along the feeder and .208 m at the upper turn. The former .2458/.235 m path let a full sphere surface cross the guide. A regression samples sphere cross-sections against CAD-measured rear surfaces, rather than checking only ball centers. Roller nip contact approximates the real soft fuel's compression; it is not a rigid CAD mesh solver.

Checks cover real-field shooting on both alliances, passing, finite rim contact and spillover on all four sides, inlet collection, shot/spill accounting, stable bodies and payload, loaded wall escape and unchanged enclosed-hopper behavior. The curved rear guide is tested against full sphere cross-sections rather than centers.

## Calmer fuel and field contact

Open-hopper drag increases from .8 to 1.8/s and Coulomb-style contact friction damps tangential sliding at wall and ball contacts. Spilled fuel has .18 restitution; the .35 shot/default material is restored on the next release or reset. These are gameplay tuning values. Spill positions and inherited chassis/local velocities remain physical; there is no chosen spill count or automatic top-up. In the same actual RobotView 2.5-second full-turn sample, 42 stay at rest and 32 remain after turning, versus the previous 25. All original bodies remain present, with mass 72.88 kg for the 32 held fuel.

Owned fuel bodies remain disabled for single-count payload accounting, so exposed stored spheres now query the actual static field meshes through a local-solver contact callback. Queries resolve penetration and closing velocity against trench beams/posts, perimeter, bumps and other field elements. Contacts run during local sphere solving and again after chassis movement, preventing the rendered load from following the chassis through a beam. A beam can press the upper load down or strip it over a finite rim; escaped balls then use their original field bodies and collide normally. Intake transfer/feed remain managed mechanisms, rather than a full CAD roller contact simulation.

The actual-field regressions check carried contacts under all four trench arms, a trench support and the perimeter, full-load driving through a trench with bounded sphere penetration, a spilled ball contacting a real trench beam, original IDs/bodies, and shot/reset collision materials. Moderate loaded turning retains the full load while explicit rim-overflow checks still pass. `pnpm test:sim` passed all 195 tests across 30 files; all 36 focused robot/hopper/field-contact checks passed. `pnpm build:release` passed integrity, TypeScript/Vite and production-payload checks. A real RobotView/field WebGL check carried 42 toward the trench, passed through with 35 retained and 7 physically stripped fuel, and reported no page errors. The existing Rapier chunk advisory remains.


## Full-width roller feeding — November 2

The wide shooter now uses the entire safe roller span rather than funneling every feeding ball through Z=0 and releasing at three nearly fixed points. Three scheduling bands cover fuel-center positions continuously from −.185 to +.185 m; each band has a uniform per-ball release offset. The path through the feeder and upper curved guide follows the selected column all the way to the muzzle. Reversed shooting uses the actual muzzle Z so feed and release agree under the π launch-frame offset. Transit duration uses that actual path length. Full-size fuel still fits within the .5255 m CAD roller width. The 42-ball intake limit, finite-rim cargo/field-contact behavior, fixed hood, shooting cadence and launch scatter remain unchanged.

Optional `shooterGeometry.feedAcrossLanes` / `laneJitter` are added to `types.ts` / `validateDefinition.ts` and read in `Shooter.ts`. Existing robots retain their original paths/offsets unless explicitly enabled; the validator limits this path mapping to chassis-mounted shooters. `FullWidthFeed.test.ts` follows each original fuel ID through its column to physical release, verifies both outer regions and center, safe roller bounds and variation between fixed points. These shared fields match the Spectrum contribution and must be retained once when integrating branches.

The isolated baseline passed 11 focused team cases, the full 188-test simulation suite and release build. The latest committed Matterhorn cargo/field-contact refinement (`059bdd5`) was then fast-forwarded into the isolated worktree so final affected checks include that work without editing or discarding it. All 23 final team/asset/field-contact checks passed on the combined version, followed by a passing release build. Browser review of the real CAD showed multiple feeding columns and distributed physical shots with no page errors.


## PR integration — November 2

The branch normally merges the existing Citrus/Darwin/moving-shot PR ancestry so it can land after PRs #1, #2 and #3 without restoring older shared files. All robot entries, Citrus's juice press/hood/climb and linkage, moving-shot velocity estimation, grounded match-cutoff hold, rigid modules, wall sliding, Matterhorn's fixed-angle/reversed shooting, full-width feed, inlet and finite-rim/field contacts are retained.

Normal free fuel retains the existing per-ID restitution variation from the earlier PRs. Matterhorn spill handoff still lowers restitution to .18; capture/relaunch/reset restore that same ball's normal per-ID value. The field-contact regression checks the restored per-ID value rather than the earlier fixed global constant. Optional rim handling and moving roof height coexist, so enclosed hoppers keep their press/ceiling behavior.

Additional shared integration points include the normally merged `FuelSystem.ts`, `HopperDynamics.ts`, `RobotSimulation.ts`, `SwerveChassis.ts`, `Shooter.ts`, `types.ts`, validation, registry and controls/credits text; all earlier robot assets/entries are retained. Merge the earlier PRs with merge commits to preserve their ancestry, then this LYNK/Matterhorn PR, then Spectrum. These are branch merges only; main has not been changed by this work.


The registry-wide full-load accuracy fixture now accounts for a reversed shooter axis when choosing its initial heading toward the actual hub. It no longer starts an open-hopper robot facing away from the target and spills test ammo during an unrelated half-turn. Full shot-count, hit/miss, spin and body-ID assertions are retained; separate cases still exercise turning and spilling. The combined nine-case scatter regression passes with all registered robots.
