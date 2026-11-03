# 1114 Simbotics · Simbot Tim (2026 REBUILT)

A selectable CAD-backed 2026 Simbot Tim with its four WCP Swerve X2 modules,
sliding rack intake, tall hopper, rolling floor/vertical feeder, fixed wide drum
and adjustable hood. The final competition robot omitted its earlier climber;
this implementation does not invent a turret or climbing capability.

## Sources and revision

The [requested Onshape assembly](https://cad.onshape.com/documents/7959d159451177786d52dd9a/w/535bc31b66b0cc442967f1d0/e/a263c1a625ed8cf2484ae82f)
is the exact link in the [official Team 1114 release](https://www.chiefdelphi.com/t/team-1114-simbotics-2026-simbot-tim-cad-release/522887).
The [official robot page](https://www.simbotics.org/robots/2026-tim/) confirms name,
season and code/CAD releases. The Onshape URL is a mutable workspace reference.
The supplied complete export, rather than an invented immutable Onshape version,
is pinned by SHA-256.

Seven binary upload parts were joined in numeric order using local byte copying.
The uploaded README and PowerShell were inspected as checksum/order data; neither
was executed. The result is `1114 Simbotics - S26-A000.glb`, 177,801,492 bytes,
SHA-256 `baff1897535f7ed692eacad69032fed7894623131762ea23ed157bf8a2ecb50c`.
Its GLB v2 header length matches the assembled file and the supplied checksum.
The `S26-A000` root contains complete `S26-IN-A200`, `S26-SH/BEL-A000`,
`S26-DT-A000` and `S26-FL-A000` assemblies: 3,357 nodes and 335 meshes.

The official [public robot code](https://github.com/Simbotics/2026-Simbot-Tim/tree/b02f50832cc0ca7694798f61d41cf230edfd62b8)
is pinned at `b02f50832cc0ca7694798f61d41cf230edfd62b8`.
Eight relevant source-file hashes are recorded in `assets/robots/1114-simbot-tim/sources.json`.
Raw inputs, inspection plots and conversion reports stay under ignored paths.
The earlier published derivative containing only the intake/hopper was **not**
used to replace absent drivetrain or shooter geometry. The complete upload
supersedes that research blocker.

## CAD and articulation

Native Y-up and +Z intake become the simulator's −X intake through one −90° Y
rotation and −0.223 m reference shift. The final hood rollers curve upward
toward native +Z as well: fuel exits toward simulator −X, over the intake.
The existing `yawOffset: Math.PI` contract represents this fixed reversed shooter. The actual four
module axle frames are inspected individually and normalized to the shared +Z
wheel axle. Module translations remain rigid in the frame, as on all robots.

The rack, carriage and upper pickup roller slide together. The lower P303
kicker bar and its P311 supports stay down on the frame while the rack moves.
The actual P322 polycarbonate wrap and P330 top cap move with the same intake
carriage. Rail guides and chassis supports stay on the chassis. The physical
side-wall colliders use that same slide pose, and the local cargo front boundary
follows it. The conservative side/front rim height fits the fully deployed shell;
the rear feeder tower remains fixed behind its open rear. All 46 fuel seeds
retain their original size and fit below the deployed rim. The main drum is separate
from the hood; each of the three real hood rollers has its own shaft center.
Floor/elevator rollers use separate centers as well, avoiding orbital cylinder
motion when Space is held. No fake mechanism arms or replacement CAD chassis are
used. Fixed/free roller animation is a managed approximation to rolling contact.

The source CAD omits bumpers. Four simple padding bars are explicitly supplemental
visual geometry, fitted to the official code's 0.76 × 0.92 m footprint. Exact
retained chassis CAD bounds are X −0.3120…0.3135 m and Z ±0.3810 m; the pads leave
clearance around that frame. Their 0.0635 m padding depth is estimated so the inner pad faces clear the source
frame on both axes. Their single bumper material changes with alliance.
There are no baked CAD number meshes; shared game labels supply team numbers.
The exterior `S26-IN-P322` shell is rendered at 24% opacity to reveal the hopper,
an intentional display choice rather than a source material-transparency claim.

Preparation removes 900 hardware occurrences, retains 743 CAD bodies, and detects
no embedded game pieces. Detail reduction uses topology-preserving 2 mm per-source and 4 mm batched
simplification, material batching and Meshopt compression. P322 and the .79 mm
P330 cap retain their original tessellation, including all 524 cap triangles.
The prior unbounded sloppy reduction could bridge thin faces into diagonal
holes and is removed. The runtime is
2,914,900 bytes, 602,880 triangles and 42 primitives, within the unchanged shared
6 MiB / 650,000 triangle / 160 primitive limits. Topology-preserving reduction can
remove small tooth/fastener detail; it preserves the actual major source bodies.

Regenerate from the ignored complete upload using:

```sh
node src/robot/robots/1114-simbot-tim/prepare.mjs
```

## Measurements and gameplay estimates

| Parameter | Setting and evidence |
| --- | --- |
| Module centers | ±0.24765 m longitudinal, ±0.3175 m lateral, corroborated by CAD and source 9.75/12.5 in tuner positions |
| Wheel radius | 0.0508 m, official tuner/source wheel model |
| Bumper footprint | 0.76 × 0.92 m, official code; supplemental pads as described above |
| Speed | 4.02 m/s, official CTRE tuner setting, not a new benchmark claim |
| Main shaft | [0.01757, 0.3485, 0] m after frame conversion; 0.0381 m drum radius from source geometry |
| Hood limits | 42–74°, official soft limits; CAD angle-to-launch mapping is fitted |
| Slide | 0.34417 m horizontal / 0.057 m vertical, estimated from the boot-zero/drop values, rack direction and required bumper clearance |
| Automatic shooting minimum | 6.4 / 13.55 of travel, normalized source endpoint estimate; manual stow still reaches zero |
| Empty mass/inertia | 64 kg / [4.4, 6.8, 4.1] kg·m², estimates |
| Drive response | 9.5 m/s² powered / 19 m/s² wheel braking, grip 1.05, gameplay estimates; body traction remains physical |
| Intake/fire rates | 38 intake/s and 18 shots/s, estimated targets, gated by physical collection and shooter readiness |
| Feed width | Three 150 mm lanes centered at −0.151, 0 and +0.151 m; CAD lacks the clearance for four simultaneous full-size lanes |
| Capacity | 46 fitted full-size non-overlapping sphere seeds, not a claimed real-robot rating; upper layers fit beneath the sliding shell's lowest deployed rim |

The intake IO starts its encoder at zero. The operator's alternate calibration
can assign 13.5 in, so absolute encoder values are not treated as an independently
measured stroke. The chosen slide clears the bumper with the real pickup roller
and agrees with the sloped CAD rack. Revisit travel when measured mate limits or
team feedback are available. `AgitateIntake` pulls toward 6.3 in but the subsystem
clamps setpoints to 6.4 in; shooting compression uses that latter minimum. The
source's earlier oscillatory state machine is commented out. Our fuel-dependent
compression is a managed gameplay fit, not a reproduction of all robot controls.

The official code's `ShootMoveLUT.calculate` returns a distance-only result before
its commented velocity/latency predictor. Consequently this definition requires
stopping to shoot. Its estimated per-shot spread still produces physical misses,
release tails and rebounds; no forced percentage of shots is awarded. The team's
reported accuracy improvement is context, not a guaranteed simulation hit rate.
The source nearest-range lookup uses 74.4° despite its 74° soft limit; the current
implementation keeps the explicit 74° software bound.

The hopper uses the shared local sphere solver, finite wall rims, visible wide
feed paths and original fuel body ownership. It can spill naturally while driven
hard. There is no private ammunition counter or replacement scoring path. AUTO
remains driver operated; controls stay WASD, J/L, Shift, Space, Q, V and R.

## Integration and checks

Based on a normal merge of current main `093d554`; all existing robots, searchable
selection, starting-line flow and the hidden Prismarine selection remain intact.
The registry receives one import/entry. The only new contract is optional
`intake.shootingMinExtension` in types/validation and automatic compression;
undefined preserves prior behavior. The narrowly scoped chassis-aim direction
hold at the 180° wrap is shared with the Valor contribution. It preserves current
main's turn-rate normalization, moving-shot prediction and aiming gains.

Focused checks cover non-overlapping seeds/bounds, actual GLB semantic nodes and
four modules, three independent hood shafts, both-alliance full-hopper physical
release, all three lanes, original IDs/bodies/mass, reset, shooting minimum,
manual stow, pause/reverse, legacy Re•Blitz compression, and real-field hub/pass
shots starting from opposite headings. Current focused result: 9 tests passed.
The pinned Node 26.13.0 / pnpm 10.20.0 release build passes asset integrity,
TypeScript/Vite and production-payload checks (25 source runtime files, 18
content-hashed assets). The existing Rapier bundle-size warning remains.
Parent browser checks inspected stowed/deployed/seeded-full/shooting/minimum-stop
CAD poses, including the fixed lower bar and full hopper. The current singleplayer
browser flow passed search/detail/select, blue and red practice, drive/turn inputs,
Shift/Space/Q/V, saved controls, pause/resume, R reset and return to setup without
page errors. Evidence is kept in ignored `.tools/tim-browser.json` and
`.tools/integrated-1114.json`.

Historical standalone validation before the feedback corrections below:

- `pnpm test:robots`: 152 tests across 25 files passed.
- `pnpm test:sim`: 375 tests across 51 files passed.
- Three additional prepared-CAD renderer checks passed afterward: the lower bar
  stays fixed throughout slide motion, every roller remains on its own shaft
  over a full revolution, and wheel/fork mounts remain rigid. No production
  implementation or model changed after the full suite.
- `pnpm build:release` verifies 25 runtime files / 34.48 MiB and 18 hashed assets.

Shared registry and About-credit lines overlap the other new robot branches;
retain every import, entry and credit when combining them. The Icarus opposed
intake fields and this robot's optional shooting stop are additive. The shared
180° aiming fix is byte-identical across the new branches. CAD rights remain
pending under the existing owner-authorized noncommercial v1 policy; code
licensing does not clear the CAD.

## Feedback corrections

The contributor reported a stationary polycarbonate hopper, diagonal top holes,
and backwards shooting. P322/P330 now follow the rack while the lower kicker
stays fixed down. Their thin CAD surfaces bypass both simplification passes;
all remaining reduction preserves topology. This corrects the original source
classification and does not replace the shell with procedural geometry.

The main shaft and final hood roller give a source release tangent of 45.76°.
Preparation calibrates the hood −28.24° about its actual shaft so the 74° maximum
launch and actual roller opening agree. The existing signed hood sweep then
rotates +32° in world Z as elevation drops to 42°. The fixed release now points
over the intake via `yawOffset: Math.PI`; main-drum and hood-roller spin signs
follow that contact direction. The fitted 90 mm free guide clears the last
contact instead of extending 210 mm through the wrong side of the hood.

Updated focused checks passed: nine mechanism/physics cases and five prepared-CAD
renderer cases. New regressions compare actual launched projectile velocity to
the final rendered roller tangent at distinct hub/pass elevations, verify the
shell and cap follow the intake, retain the fixed lower bar, preserve all 524
cap triangles, and fit starting preloads behind the sliding front wall.
Stowed/deployed/seeded-full/shooting/minimum-stop browser poses were recaptured
without page errors and reviewed for panel continuity. The seeded diagnostic
picture is not a cargo physics play test; both-alliance full-hopper physical
discharge/conservation is covered by the focused simulation cases.

These corrections touch only this robot's own files and runtime asset. No new
shared interface is required. Exact slide limits and real-world ballistic
calibration remain fitted estimates as documented above.
