# 9496 LYNK · Matterhorn (2026)

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
| Fold at reset | −115 degrees | Stow-pose fit; no powered retraction is enabled |
| Hopper front travel | .3048 m | Fit between expanded front panel and fixed-panel overlap |
| Drum center/radius | `[.127, .231025, 0]` / .0508 m | Measured source drum and brass-wheel axle |
| Shooter direction | Toward intake, yaw offset π | The source drum/guide arrangement uses the intake-facing exit; barrel/muzzle, clearance and launch all use this same frame |
| Hood | Fixed; no animated hood joint | Team explicitly confirms RPM-only distance adjustment |
| Projectile elevation | 56 degrees | Fitted complementary-angle interpretation of the early hood discussion, not a measured release calibration |
| Three lanes | Z −.17, 0, +.17 m | Fit within the measured .5255 m drum span |
| Capacity | 49 full-size 150 mm fuel | Fitted, non-overlapping seed layout under an estimated retaining-net ceiling; not a measured real maximum |
| Hopper floor/ceiling | Sloped floor and .723 m world retaining ceiling at nominal height | Conservative local contact fit. Net is absent from the upload and is not visually reconstructed or dynamically stretched |
| Rear storage limit | X = −.006 m, ahead of the CAD shooter housing | Bounds the complete 75 mm-radius fuel, so stored spheres cannot enter the drum or motor/sideplate region |
| Hopper panel finish | Smoke-gray RGBA `[.12, .13, .14, .42]`, nonmetallic, double-sided alpha blend | User-requested visual finish on the five original hopper panels; hardware keeps its CAD material |
| Intake / fire rate | 35 fuel/s / 18 shots/s nominal | Gameplay estimates; readiness/clearance/feed path constrain actual cadence |
| Passing limit | 9 m | Range represented in team passing calibration; physical clearance still gates release |
| Moving-accuracy rating | .90 | Relative uncertainty input, not a 90% hit guarantee |
| Release uncertainty | .030 yaw / .035 elevation radians, .035 speed fraction, .10 wider-tail probability, 30 rad/s spin | Explicit gameplay estimates; misses/rebounds remain physical |

Stored fuel subsequently moves in the existing local sphere solver. Full-size entry seeds do not pin a visual stack or create replacement ammunition. Payload mass is accounted once through original held fuel IDs/bodies. The net ceiling and local contacts approximate retention; no 62-fuel stretch-net capacity or complete cloth simulation is claimed.

## Controls and behavior

WASD drive, J/L turn, Shift collect, Q reverse, Space aim/shoot/pass and R restart retain editable shared bindings. Intake and front deploy at session start and stay out. There is no V retraction or C climbing capability. The real drum, brass wheels, intake rollers, floor rollers and feeder rollers animate around their authored axles; feeder/floor spin directions transport toward the shooter, while the intake collects below its roller.

Shoot aims the chassis with the intake facing the target, holds the real fixed hood angle, and solves for flywheel speed/flight time. A fixed-hood robot can have an infeasible near/obstructed shot; it does not secretly adjust its hood or force a hit. Passing searches farther legal landing points within its alliance zone when a shorter fixed-angle arc would hit the field net. Physical release scatter/spin is sampled once, with no in-flight correction or selected misses. Simultaneous collection/firing is enabled; exact team motor-pulsing/agitation timing is not modeled.

All modules remain rigidly mounted during steering and bump lean. Shared ground-query support stays numerical, not hardware suspension. Low-friction frame contact uses Rapier's minimum combine rule so a small sideways command can slide along a wall; physical field boundaries and tire-force traction remain active.

## Shared integration and merge guidance

| File | Reason / merge guidance |
| --- | --- |
| `src/robot/registry.ts` | One import/entry; combine other teams' entries instead of replacing the registry |
| `src/robot/types.ts`, `src/robot/validateDefinition.ts` | Optional fixed elevation, launch yaw offset and per-robot spread. Preserve incoming linkage/press/climber fields from other robot PRs |
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

A focused real RobotView WebGL review inspected stowed, half-deployed, expanded red/blue and full-49-fuel poses with no application errors. Browser artifacts remain ignored. The source export omits its net; retaining-ceiling shape, fixed release calibration, throughput, mass and contact envelopes need driver feedback. Detailed net deformation, motor gearing/control loops, roller compliance and every-CAD-surface collision are outside the shared model. The current live Onshape revision and CAD rights status remain as disclosed above.

Final checks: `pnpm test:robots` passed 28 tests across 7 files; `pnpm test:sim` passed 181 tests across 29 files. After the final CAD-fitted feeder path/spin-direction correction, 16 affected robot/asset/shared-acceptance checks passed. The final `pnpm build:release` passed asset integrity, TypeScript/Vite and the 12-asset production payload. The existing Rapier chunk advisory remains.

## Hopper refinement — November 2, 2026

Driver feedback requested a fuller hopper, rear containment and smoke-gray translucent sides. The fitted capacity increases from 40 to 49 non-overlapping full-size fuel. Seeds fill from bottom to top; the shared local solver still moves stored fuel. The storage rear moves from X=.112 to −.006 m to keep the entire sphere ahead of the shooter housing. The estimated retaining envelope rises from local Y=.38 to .50 m; the upload still omits the physical net, and the resulting capacity/ceiling are gameplay estimates rather than measured team specifications. The four original fixed/sliding side panels and front panel receive the smoke-gray translucent material during reproducible preparation, preserving metal hardware.

Focused verification covers 49-fuel collection and complete firing with original bodies and payload mass, both-alliance real hub shots, passing, loaded wall escape, seeded and dynamic sphere clearance, full-load containment under acceleration/turning, and actual prepared panel material bindings.

Refinement validation: 24 focused tests passed across the Matterhorn, shared hopper and robot-acceptance cases; `pnpm build:release` passed integrity, TypeScript/Vite and production-payload checks. The actual RobotView rendered full front/rear and empty rear poses with no page errors; the settled 49-fuel load had maximum rear sphere surface X=−.005990 m, ahead of the housing at −.0015 m. The existing Rapier chunk advisory remains.
