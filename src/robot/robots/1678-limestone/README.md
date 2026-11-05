# 1678 Citrus Circuits · Limestone (2026 REBUILT)

Performance update (November 2, 2026): [the lineup research audit](../../../../docs/ROBOT_PERFORMANCE_RESEARCH.md) supersedes earlier rate, drive/traction and motion-rating estimates below. CAD/capacity and previous validation descriptions remain historical evidence.

Adds the `1678-limestone` selector entry, articulated release CAD, four-module swerve, a slapdown intake with coupled horizontal hopper extension, local cargo, a fixed three-wide drum/adjustable hood, and managed L1 climbing with either outer hook. Uses the existing match, controls, fuel ownership and scoring systems. Based on `origin/main` commit `0d64cbb`; the integration follow-up now includes Darwin and the moving-shot/match-stop PR through normal merges.

## CAD identity and sources

The requested [Onshape release assembly](https://1678.onshape.com/documents/acdaaf42764a293a9452326d/w/f887ef4c6a254c09c73344c3/e/a9684fa7665096e977b19c44?aa=true) is the source of the body and mechanisms:

- Document: `acdaaf42764a293a9452326d`
- Workspace: `f887ef4c6a254c09c73344c3`
- Element: `a9684fa7665096e977b19c44`
- Export identity: `1678-26c-0000 CAD Release`

The [official robot page](https://www.citruscircuits.org/2026-robot) links that document and describes the mechanisms. The [team's CAD/code release](https://www.chiefdelphi.com/t/1678-citrus-circuits-2026-cad-and-robot-code-release/521535) establishes the release context. Direct Onshape access/export is unavailable in the execution environment. The published tessellation's extraction recipe explicitly identifies the same document, workspace and element; this is not a generic Citrus robot or a different season's model.

`assets/robots/1678-limestone/sources.json` records all used binary URLs, sizes and SHA-256 hashes. Inputs are pinned to:

- `TylerHandel/rebuilt-sim-2026@344501f464477cb93517a7b5344b43d7ee9474a7`: body, folded intake, horizontal slide, climber/lid. Only CAD geometry is reused, not that simulator's implementation or tuning code.
- `frc1678/C2026-Public@0f403dd8f3ad1f7d0dbe0c1bd23b24c210f41677`: actual MK5n molded wheels, steerable turret/forks and fixed L plates from `assets/Robot_Comp/model.glb`. The rest of this large original is excluded from the runtime model.

Team-code references: `TunerConstants.java` (drive speed, wheel radius, module centers); `IntakeDeployConstants.java` (actuator limits and extension); `HoodConstants.java` (hood travel); `ClimberConstants.java` (vertical travel); `RobotConstants.java` (the shipped Epsilon configuration); `Superstructure.java`/`FieldLayout.java` (outside A/E climb approaches). Java is used as factual reference, not ported into the simulator. CAD redistribution remains **pending**, under the owner's existing noncommercial v1 publication policy; public access or the Java license does not establish CAD/media clearance.

## Dimensions, controls and tuning

| Parameter | Value | Evidence / status |
| --- | --- | --- |
| Frame | 27 × 27 in | Team robot page and CAD |
| Swerve centers | ±0.276225 m X/Z | Team code: ±10.875 in |
| Wheels | 0.0508 m radius; approximately 0.0603 m tread/hub width | Team code and official molded-wheel mesh |
| Drive target | 4.39 m/s | Team `kSpeedAt12Volts`; theoretical target, not measured loaded speed |
| Intake hinge | `[-.30465, -.0541, 0]` in robot frame | CAD hinge, approximately .169 m above carpet |
| Fold | 132° CAD collecting-to-exported pose | CAD; team command is 130°, a small reference/stop difference |
| Horizontal hopper travel | .303211 m | Shipped Epsilon branch in team code; alternate code branch is .167250 m |
| Vertical lid/hook travel | .2159 m (8.5 in) | Shipped Epsilon branch; alternate code branch is 8.25 in |
| Managed climb | .159 m maximum lift, .20 m/s winch, .55 s deployment | Gameplay estimates in the shared hook/contact model; retracts to simulated stow, not the team code’s 3 in Epsilon climb stop |
| Drum center | `[.28815, .25385, 0]` | CAD, relative to .223 m chassis reference |
| Drum contact radius | .0455 m | Tessellated tread envelope; nominal team drum is 3.5 in |
| Hood travel | 35° | Team 17.5–52.5° mechanism range |
| Projectile elevations | 37.5–72.5° | Gameplay fit using complementary hood angles; not a measured launch calibration |
| Three lanes | Z = −.17, 0, +.17 m | CAD drum width; simplified full-size fuel channels |
| Capacity | 70 fuel raised; 32-fuel lowered control threshold | Full-size non-overlapping packing in the existing expanded envelope; gameplay estimates, **not measured real maxima** |
| Intake / fire rate | 36 fuel/s / 24 shots/s nominal | Gameplay estimates; no user-supplied FRSim card or measured throughput available |
| Empty mass / inertia | 55 kg / `[2.9, 5.5, 3.0]` kg·m² | Estimates, not CAD mass properties or a scale reading |
| Acceleration / grip | 10 m/s² command / 1.05 | Gameplay estimates; shared tire/contact/payload model remains active |
| Moving-shot rating | .90 | Explicit gameplay spread setting, not a measured 90% hit rate; shared physical release, no forced misses or in-flight correction |
| Bumpers | Estimated 3.25 in thick, 4.5 in high; .8509 m outer X/Z | Both published CAD inputs omit bumper solids; reconstructed and disclosed, not claimed as measured |

WASD and J/L retain the shared driver controls. Shift collects, Q reverses, Space aims and shoots/passes, V requests intake retraction/extension, C raises/lowers the climber and attached lid, R restarts. Bindings remain editable in Settings and visible in the Controls dialog. Active play retains the scoreboard-only interface.

At start the intake and linked horizontal slide deploy. V folds/retracts them together, subject to cargo clearance. Shift/Q temporarily extend for collection/reverse. Shooting compresses them as cargo empties. Cargo continues to move in the existing local sphere solver; seeds do not pin the stack. The lid's visual geometry, collision proxy and local cargo ceiling all follow the same vertical stage. Shift/Q automatically raise this shared juice-press stage for collection/reverse without arming tower capture. As cargo empties, it lowers toward the load-dependent minimum; a full hopper keeps it raised. C retains manual climb control. The 70-fuel gameplay cap uses the raised envelope, with 32 as the lowered control threshold. Automatic real-team trench sequences are not claimed.

L1: raise with C, face the own-alliance tower and align either outer hook with a low-rung **end**, outside the upright. Stop, let the hook engage, and press C to retract/winch up. Another C lowers and releases. Example blue poses near `(7.1335, −1.18)` or `(7.1335, .60)` in field X/Z, shooter heading +X; mirror X/Z and heading for red. These are verified simulator approaches, not copied real-field localization targets. Capture still requires a fresh deployment, ground support, slow speed, correct heading and a ray hit on the actual own-alliance low rung. L2/L3 are not enabled.

## Reproduce and inspect

From the repository root with Node 26 and pinned pnpm dependencies:

```sh
node src/robot/robots/1678-limestone/prepare.mjs --download
pnpm robot:branch --team=1678
pnpm test:robots
pnpm test:sim
pnpm build:release
```

Download is offline preparation only; no Onshape, GitHub or original CAD request occurs during play. Without `--download`, the converter requires the verified inputs in ignored `assets/source/robots/1678-limestone/`. It writes the one allowlisted `public/assets/robots/1678-limestone/robot.glb`, its per-robot runtime record, and an ignored preparation report. It checks input hashes and disconnected-solid counts before articulation. The final asset is 1,825,984 bytes, 313,469 rendered triangles, 125 mesh primitives, embedded geometry/materials and Meshopt compression. No Draco or external textures/buffers are required.

The converter rotates source CAD into shooter +X/intake −X, bakes a collecting pose, and uses semantic `extras.mechanism` nodes. Existing CAD hood rollers/drum, slapdown rollers, moving hook tubes/lid, horizontal panels and stationary hardware are separated by connected solid and measured bounds. The fixed intake kicker stays on the chassis; hood rollers follow the hood; wheel axles normalize to +Z. No decorative fuel is embedded. The exported 45° MK5n steering pose is removed before the normal steering/spin animation is applied. Roller preparation replaces 20 irregular or overlapping long shell solids with seven clean 48-segment cylindrical surfaces: the three intake rollers, three hood rollers and main shooter drum. Their radii/lengths/centers are measured from the pinned CAD. Original narrow full-length shafts, exposed shaft ends, short end hardware and axle frames are retained; shaft bounds are excluded from the thicker main tubes so those tubes are not extended over the end hardware. This fixes the main shooter drum’s differently triangulated, overlapping outer skins as well as the main intake tube; exact-face deduplication alone missed these surfaces. Other CAD assemblies remain as before. The runtime integrity record contains the regenerated payload hash.

## Integration points and merge conflicts

This contribution needs narrowly scoped shared extensions because the pre-existing contract only toggled linear intakes and modeled Kepler's side-approach hook:

| Shared file | Change / likely conflict |
| --- | --- |
| `src/robot/registry.ts` | One import and keyed entry, preserving existing IDs/order; concurrent robot additions may touch this line |
| `src/robot/types.ts` | Optional coupled hopper/vertical ceiling travel, automatic juice-press threshold, launch-spread profile, climber pose/collider part, optional approach axis and lateral hook offsets; reconcile concurrent contract additions field by field |
| `src/robot/poses.ts` | Vertical climber proxy transform; existing intake/hood transforms retained |
| `src/robot/validateDefinition.ts` | Validate optional profile/roof data, automatic lift threshold, launch spread and climber collider part |
| `src/sim/RobotSimulation.ts` | Enable existing manual-retraction flag for pivot intake requests/controller edges; optional intake/hopper coupling; carry climber extension into the shared pose and expose load-dependent press targets |
| `src/sim/SwerveChassis.ts` | Clamp/cache climber pose for articulated collider updates |
| `src/sim/HopperDynamics.ts` | Only optional moving-roof ceiling; no cargo-weight, friction, gravity or solver retuning |
| `src/sim/Climber.ts` | Optional head-on approach and either lateral hook; automatic press target/cargo minimum without arming capture; original capture ground/speed/rung checks and Kepler defaults retained |
| `src/App.tsx` | Show V help for manually retractable pivot intakes, correct Limestone climb/automatic-press guidance, capability text and CAD credit; no selector rewrite or active-play overlay |
| `THIRD_PARTY_NOTICES.md` | Citrus CAD/source-chain attribution with pending review status |
| `src/sim/SwerveChassis.ts` | Rigid tire proxies, faster manual yaw/steering response and low-friction frame contact using Rapier minimum combination; numerical ground support remains |
| `src/sim/Shooter.ts` | Normalize chassis aiming against the shared turn-rate scale, sample release uncertainty/spin and retain pass clearance and full-load shot history |
| `src/view/RobotView.ts` | Preserve exact prepared wheel/fork translations during terrain lean, steering and spin |
| `src/robot/defaults.ts` | Clarify that support defaults do not represent hardware suspension; numeric defaults unchanged |
| `src/sim/RigidSwerve.test.ts`, `src/view/RobotView.test.ts` | Registry-wide fixed-mount, loaded turning, braking, precision and airborne regressions |
| `docs/GAMEPLAY_TUNING.md` | Document accepted rigid-mount behavior and manual turning targets |
| `src/sim/FieldSimulation.ts` | Pass optional press target/minimum to the shared climber actuator |
| `src/sim/FuelSystem.ts` | Stable per-ID foam restitution estimates; original bodies, size and mass retained |
| `src/sim/ShotScatter.ts`, `src/sim/ShotScatter.test.ts` | Launch uncertainty/spin and physical statistical/rebound/full-load checks |
| `src/robot/cargoPacking.ts`, `src/robot/CargoPacking.test.ts` | Full-size close-packed seeds and boundary/capacity checks |
| `src/robot/robots/2910-reblitz/cargo.ts`, `src/robot/robots/2910-reblitz/definition.ts` | Requested 65-fuel packing and independent spread profile |
| `src/robot/robots/1690-kepler/definition.ts` | Requested 60-fuel packing and independent spread profile |
| `src/sim/Kepler.test.ts`, `src/sim/Shooter.test.ts`, `src/sim/MatchSimulation.test.ts`, `src/sim/SessionFeatures.test.ts` | Revised capacity and uncertainty assertions; scores follow actual processed fuel |
| `docs/SHOT_TUNING.md` | Source limitations, estimated profiles and capacity rationale |
| `src/sim/WallContact.test.ts` | Empty/full wall sliding, normal reversal and both real perimeter sides; no escape teleports or weakened boundaries |

All registered robots now retain rigid CAD module mounts, with faster manual turning (6.4 rad/s demand) and azimuth response (24 rad/s). The same follow-up is included on the separate Darwin preview branch. No changes to numeric support defaults, common runtime manifest, dependency/lock files, build tooling, allowlists, camera, match timing or per-team drive parameters. The moving-roof line is the likely overlap with parallel hopper work; preserve the incoming solver and apply only the optional ceiling offset. This follow-up adds the requested shared shot uncertainty, per-fuel rebounds and revised 65/60 capacities; the separate Darwin branch includes the same model with its own profile and capacity. Fuel mass and the local hopper solver are unchanged. Preserve parallel moving-shot, match-stop or hopper solver work when integrating rather than replacing it wholesale.

## Validation and limits

Final November 2 checks: `pnpm robot:branch --team=1678`; `pnpm test:robots` (9 files / 40 tests); `pnpm test:sim` (32 files / 199 tests), and `pnpm build:release` passes asset integrity, TypeScript/Vite and production-payload checks. Production retains the existing physics chunk-size advisory; no build budget was changed.

`Limestone.test.ts` exercises its drive target, real perimeter, pivot/controller edges, full-load containment/mass/body conservation, pause/restart, moving roof contact, stationary blue/red physical hub hits, full-load three-lane cadence, moving shots, passing, real bump/trench support, roof shot obstruction, own-tower capture/L1 assessment/hold/release and rejected wrong-side/off-rung/opponent captures. `LimestoneAssets.test.ts` checks the actual wheel axle frames, hood/kicker hierarchy and roller duplicate-face ratio. `JuicePress.test.ts` exercises real collection of 70 original bodies, full-load clearance, shooting/contraction, pause/reset and the distinction between intake expansion and deliberate tower capture. Registry-wide acceptance also covers preload, collection, reverse, release and immutable definitions for all three robots.

Focused isolated Chromium checks exercise selector → session → W/V/C events → Controls → alliance change → restart, with no page/network errors and original fuel IDs retained. Full-field drawing is disabled for the input check to avoid slow software-rendered field frames; separate real WebGL CAD renders check stowed/deployed poses, hood and vertical-stage articulation, bumper color and numbers. Browser check artifacts and raw CAD remain ignored.

The November 2 actual-CAD browser check crosses real bump geometry with zero drift in all eight wheel/fork mount translations and active whole-chassis lean. Limestone reaches about 6.36 rad/s in the empty flat-floor turning check. Tire proxies stay rigidly mounted; the established ray-based contact support remains a numerical approximation, not hardware suspension. Existing shot and L1-climb regressions continue passing.

The latest focused browser review filled all 65/60/70 slots through actual mouth collection and rendered the full CAD hoppers. After 35 Citrus shots, the stage contracted to approximately .079 extension while retaining 35 original fuel; actual Shift/release/C input checks passed without page errors. A subsequent read-only shell audit exposed near-coincident, differently triangulated roller surfaces. The rebuilt model now has exactly one long cylinder per affected intake/hood roller, with original measured dimensions checked by asset regressions. Focused real RobotView WebGL checks at multiple spin angles and actual intake/press motion completed with no application or asset errors; the real setup page still offers the Limestone selector. WildStang is deferred while the owner prepares its GLB.

The wall-contact follow-up passes empty/full sliding and reversing checks plus both real perimeter sides for all registered robots. Tire-force traction and collision envelopes remain active.

The model is decimated release CAD with simplified collider envelopes, not full mesh-contact or motor/chain/roller simulation. Performance values explicitly labeled estimates need driver/spec feedback. The central between-upright climb is not claimed: reconstructed bumpers block that tight approach; tested outside-rung approaches work. Bumper-inclusive source/reference is still useful to refine that envelope. The managed fixed-joint L1 support retains the project's upright chassis behavior rather than simulating a free twisting/swinging single-hook hang. The 70-fuel raised capacity, load-dependent press target and spread profile are fitted gameplay estimates; automatic real-team trench/lid sequences and detailed net contact are not calibrated. The live Onshape workspace may have changed after the pinned exports; that cannot be checked through the blocked direct connection. CAD rights review remains pending.

## Compatible PR integration

This branch now includes Darwin and the moving-shot/match-stop changes. Both robots remain selectable. Optional linkage samples coexist with the coupled hopper, automatic press and climbing fields; shared pose/storage and roof logic preserve both mechanisms. Registry, controls and CAD attribution include both teams. Shared integration additionally includes `docs/KEPLER.md`, `src/sim/MovingShotsAndStop.test.ts` and all Darwin integration points documented in its module README. Merge order: moving-shot/match-stop, Darwin, then Citrus. No main merge, force-push, dependency changes or asset regeneration were performed during conflict resolution. Prior full-suite/build results above predate this merge; current focused integration results are recorded in the PR.

Combined integration validation: 59 targeted tests across 8 files pass (both robot modules, shot scatter, disabled stopping and all-robot wall contact). `pnpm build:release` passes TypeScript, asset integrity and the 13-asset production payload. Full suites and another browser run were not repeated during this budget-limited integration.
