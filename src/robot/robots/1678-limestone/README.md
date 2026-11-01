# 1678 Citrus Circuits · Limestone (2026 REBUILT)

Adds the `1678-limestone` selector entry, articulated release CAD, four-module swerve, a slapdown intake with coupled horizontal hopper extension, local cargo, a fixed three-wide drum/adjustable hood, and managed L1 climbing with either outer hook. Uses the existing match, controls, fuel ownership and scoring systems. Based on `origin/main` commit `0d64cbb`; no dependency on the separate moving-shot/match-stop PR.

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
| Managed climb | .159 m maximum lift, .20 m/s winch, .55 s deployment | Gameplay estimates in the shared hook/suspension model; retracts to simulated stow, not the team code’s 3 in Epsilon climb stop |
| Drum center | `[.28815, .25385, 0]` | CAD, relative to .223 m chassis reference |
| Drum contact radius | .0455 m | Tessellated tread envelope; nominal team drum is 3.5 in |
| Hood travel | 35° | Team 17.5–52.5° mechanism range |
| Projectile elevations | 37.5–72.5° | Gameplay fit using complementary hood angles; not a measured launch calibration |
| Three lanes | Z = −.17, 0, +.17 m | CAD drum width; simplified full-size fuel channels |
| Capacity | 32 fuel | Conservative gameplay estimate with two non-overlapping layers below the lowered lid; **not a claimed real maximum** |
| Intake / fire rate | 36 fuel/s / 24 shots/s nominal | Gameplay estimates; no user-supplied FRSim card or measured throughput available |
| Empty mass / inertia | 55 kg / `[2.9, 5.5, 3.0]` kg·m² | Estimates, not CAD mass properties or a scale reading |
| Acceleration / grip | 10 m/s² command / 1.05 | Gameplay estimates; shared tire/suspension/payload model remains active |
| Moving-shot rating | .90 | Explicit gameplay spread setting, not a measured 90% hit rate; shared physical release, no forced misses or in-flight correction |
| Bumpers | Estimated 3.25 in thick, 4.5 in high; .8509 m outer X/Z | Both published CAD inputs omit bumper solids; reconstructed and disclosed, not claimed as measured |

WASD and J/L retain the shared driver controls. Shift collects, Q reverses, Space aims and shoots/passes, V requests intake retraction/extension, C raises/lowers the climber and attached lid, R restarts. Bindings remain editable in Settings and visible in the Controls dialog. Active play retains the scoreboard-only interface.

At start the intake and linked horizontal slide deploy. V folds/retracts them together, subject to cargo clearance. Shift/Q temporarily extend for collection/reverse. Shooting compresses them as cargo empties. Cargo continues to move in the existing local sphere solver; seeds do not pin the stack. The lid's visual geometry, collision proxy and local cargo ceiling all follow the same vertical stage. Raising the lid increases physical headroom but deliberately does not invent a larger unverified capacity.

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

Download is offline preparation only; no Onshape, GitHub or original CAD request occurs during play. Without `--download`, the converter requires the verified inputs in ignored `assets/source/robots/1678-limestone/`. It writes the one allowlisted `public/assets/robots/1678-limestone/robot.glb`, its per-robot runtime record, and an ignored preparation report. It checks input hashes and disconnected-solid counts before articulation. The final asset is 1,889,552 bytes, 323,365 rendered triangles, 136 mesh primitives, embedded geometry/materials and Meshopt compression. No Draco or external textures/buffers are required.

The converter rotates source CAD into shooter +X/intake −X, bakes a collecting pose, and uses semantic `extras.mechanism` nodes. Existing CAD hood rollers/drum, slapdown rollers, moving hook tubes/lid, horizontal panels and stationary hardware are separated by connected solid and measured bounds. The fixed intake kicker stays on the chassis; hood rollers follow the hood; wheel axles normalize to +Z. No decorative fuel is embedded. The exported 45° MK5n steering pose is removed before the normal steering/spin animation is applied.

## Integration points and merge conflicts

This contribution needs narrowly scoped shared extensions because the pre-existing contract only toggled linear intakes and modeled Kepler's side-approach hook:

| Shared file | Change / likely conflict |
| --- | --- |
| `src/robot/registry.ts` | One import and keyed entry, preserving existing IDs/order; concurrent robot additions may touch this line |
| `src/robot/types.ts` | Optional coupled hopper/vertical ceiling travel, climber pose/collider part, optional approach axis and lateral hook offsets; reconcile concurrent contract additions field by field |
| `src/robot/poses.ts` | Vertical climber proxy transform; existing intake/hood transforms retained |
| `src/robot/validateDefinition.ts` | Validate the optional profile/roof data and climber collider part |
| `src/sim/RobotSimulation.ts` | Enable existing manual-retraction flag for pivot intake requests/controller edges; optional intake/hopper coupling; carry climber extension into the shared pose |
| `src/sim/SwerveChassis.ts` | Clamp/cache climber pose for articulated collider updates |
| `src/sim/HopperDynamics.ts` | Only optional moving-roof ceiling; no cargo-weight, friction, gravity or solver retuning |
| `src/sim/Climber.ts` | Optional head-on approach and either lateral hook; original capture ground/speed/rung checks and Kepler defaults retained |
| `src/App.tsx` | Show V help for manually retractable pivot intakes, correct Limestone climb guidance, capability text and CAD credit; no selector rewrite or active-play overlay |
| `THIRD_PARTY_NOTICES.md` | Citrus CAD/source-chain attribution with pending review status |

All other additions are under this robot's module, per-robot asset records and exact runtime GLB path. No changes to shared defaults, common runtime manifest, dependency/lock files, build tooling, allowlists, camera, match timing or existing robot tuning. The moving-roof line is the likely overlap with parallel hopper work; preserve the incoming solver and apply only the optional ceiling offset. This branch does not include the other branch's cargo-weight edits or moving-shot/match-stop changes.

## Validation and limits

Completed checks: `pnpm robot:branch --team=1678`; `pnpm test:robots` (7 files / 33 tests); `pnpm test:sim` (26 files / 165 tests); `pnpm build:release` (asset integrity, TypeScript/Vite and production payload all pass). Production retains the existing physics chunk-size advisory; no build budget was changed.

`Limestone.test.ts` exercises its drive target, real perimeter, pivot/controller edges, full-load containment/mass/body conservation, pause/restart, moving roof contact, stationary blue/red physical hub hits, full-load three-lane cadence, moving shots, passing, real bump/trench support, roof shot obstruction, own-tower capture/L1 assessment/hold/release and rejected wrong-side/off-rung/opponent captures. `LimestoneAssets.test.ts` checks the actual wheel axle frames and hood/kicker hierarchy. Registry-wide acceptance also covers preload, collection, reverse, release and immutable definitions for all three robots.

Focused isolated Chromium checks exercise selector → session → W/V/C events → Controls → alliance change → restart, with no page/network errors and original fuel IDs retained. Full-field drawing is disabled for the input check to avoid slow software-rendered field frames; separate real WebGL CAD renders check stowed/deployed poses, hood and vertical-stage articulation, bumper color and numbers. Browser check artifacts and raw CAD remain ignored.

The model is decimated release CAD with simplified collider envelopes, not full mesh-contact or motor/chain/roller simulation. Performance values explicitly labeled estimates need driver/spec feedback. The central between-upright climb is not claimed: reconstructed bumpers block that tight approach; tested outside-rung approaches work. Bumper-inclusive source/reference is still useful to refine that envelope. The managed fixed-joint L1 support retains the project's upright chassis behavior rather than simulating a free twisting/swinging single-hook hang. Lid capacity, automatic real-team trench/lid sequences and detailed net contact are not calibrated. The live Onshape workspace may have changed after the pinned exports; that cannot be checked through the blocked direct connection. CAD rights review remains pending.
