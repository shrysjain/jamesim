# 6800 Valor — Downpour (2026)

The contributor's **VR26A-0000 Main** export implements the Downpour drum-shooter
revision linked in the requested Onshape workspace. It is selectable through the
normal registry, uses four physical shooting lanes and has a pivoting intake,
sliding horizontal hopper and adjustable hood. It shares the existing fixed-step
simulation, fuel ownership, chassis aiming, controls, scoring and match lifecycle.

## Sources and exact revision

- [Requested Downpour CAD](https://cad.onshape.com/documents/15cd41462dc24ff986a4e549/w/1b79a7ae373e0026664ccfff/e/8fdecbfb5ab3c774cb6a4551)
- [Team CAD release](https://www.chiefdelphi.com/t/frc-6800-valor-2026-robot-cad-release/520715)
- [Team mechanism/code discussion](https://www.chiefdelphi.com/t/frc-6800-valor-2026-robot-cad-release/520715?page=2)
- [Team technical packet](https://drive.google.com/file/d/11rQrMwCIseY18JbKFytGLXSd__x1JP1S/view)
- [Team code](https://git.valor6800.com/valor6800/2026/robot)

The official release links the exact requested workspace for Downpour. Drizzle,
the earlier Manor robot, uses a different workspace and is not substituted here.
The mutable workspace has no supplied immutable version/microversion. The actual
export is pinned by its **127,464,908-byte** length and SHA-256:
`02d163b47e2c0a828ba832370d32d65d3dd61f065f283ba011ad4e754adbcc46`.

Five uploaded binary segments were joined in numeric order. GLB v2 magic, declared
length and the contributor's expected SHA-256 matched. The uploaded PowerShell
was inspected as data and never executed. Raw CAD and conversion reports remain
ignored under `assets/source/robots/6800-downpour/`.

Direct Onshape access remains blocked by this environment's network policy;
that is not evidence that the team disabled exports. The user-provided geometry
is the source of the runtime model. Its complete root hierarchy contains States
Hopper, Hotdog Rollers, Chassis, Intake and Shooter assemblies, agreeing with the
documented drum rebuild. No claim is made that it is the live workspace's newest
state or identical to every earlier packet illustration.

The packet **States Pages to print.pdf** was inspected through the Google Drive
connector's readable extraction. Provider metadata reports 26,550,129 bytes,
modified `2026-04-13T23:00:56Z`. The extraction hash in `sources.json` verifies the
text excerpt, not the raw PDF, which was not downloaded. Its District Championship
chapters identify a four-wide drum rebuild; they supersede the secondary
research dashboard's unverified elevator/arm summary for this revision.

## Team figures versus CAD measurements

The April District Championship packet reports a 25.5 in acquisition width,
powered 2 in roller, static 1 in crash-bar tube, 69:1 pivot reduction, hopper volumes
of 4,613.4/8,683.9 in³, four-fuel-wide transfer, three shooter/two feeder X60s,
80° total hood travel and a two-hook pivoting climber. These are team-stated
specifications, not measured simulator performance. Its 1580:21 hood ratio and a
later May 790:11 ratio are kept as dated records; no silent reconciliation or
absolute launch-angle range is inferred from them.

The export supplies the actual .6858 m square frame, approximately .8432 m square
bumper envelope and module centers at native XZ ±.2794 m. Native Y is up and +Z faces
the intake; preparation maps coordinates to `(-Z,Y-.223,X)`. Runtime +X shoots,
−X intakes and Z spans the roller length. The model's carpet is native Y=0.

Measured native pivots/shafts include:

| Part | Native center (m) |
| --- | --- |
| Intake pivot | `(0,.19131,.3032)` |
| Powered intake roller | `(0,.21824,.59221)` |
| Lower static tube | `(0,.08188,.49177)` |
| Upper static crash bar | `(0,.27473,.61171)` |
| Drum/hood pivot | `(0,.47449,-.26035)` |
| Hood roller 1 | `(0,.55767,-.06855)` |
| Hood roller 2 | `(0,.60024,-.09334)` |

The last hood roller gives an approximately 53.1° terminal tangent. The converter
bakes 24.9° about the measured drum axis to the shared 78° neutral pose. The
40–78° operational range is an estimated fit within the documented 80° total
travel, not a team-published pair of absolute stops. The hood collider receives
the same neutral transform so it cannot block the corrected muzzle artificially.

## Gameplay and mechanism behavior

At setup/reset the intake is folded and the horizontal hopper is in. Starting
play deploys them through the existing shared actuator timing. Toggle intake
extension folds the pivot as cargo permits; Intake and Reverse/eject extend it.
The expanding hopper remains out after deployment. This uses the retained
single intake/hopper mechanism family rather than simulating every guide/link
constraint. Holding Aim/shoot/pass automatically folds the pivot as fuel empties;
releasing it extends the intake again unless manually stowed. Both manual and
automatic folding use the same cargo-limited physical actuator. Holding Intake
while shooting retains the existing simultaneous-collection priority and keeps
it extended; Reverse/eject also extends it.

Both original 1 in tubes are static on the intake assembly. The powered roller
spins around its own measured shaft; the lower and upper tubes never receive
roller spin. Actual fixed mounts, cycloidal housings and the low pivot motor
remain attached to the chassis. Each hood roller has its own measured axis.

Four lane centers at Z `[-.2286,-.0762,.0762,.2286]` span the actual drum. Owned
fuel follows explicit waypoints above the roller floor and behind the three
measured feeder shafts. The optional `feedAcrossLanes` contract preserves each
release column rather than funneling all four streams through Z=0. The physical
projectiles leave through the shared muzzle and retain their original IDs and
bodies; no replacement ammunition or private scoring is introduced.

Downpour stops to shoot and uses chassis aim. Reverse-direction shooting was
an inconsistent experiment according to the team release, so it is not enabled.
Shared passing remains available. At the exact 180° aiming tie, the shared
shooter holds its chosen turn direction until clear of the wrap boundary. This
prevents initial swerve steering forces from reversing aim every tick; physical
passing tests cover Downpour and the original Re•Blitz. No identified hook assembly
was found in the
inspected export hierarchy and batched surfaces. The team packet describes a
real pivoting climber, but this implementation does not falsely enable the
existing vertical side-hook profile or imply that the actual team lacked one.

Estimated gameplay values: 56 kg empty mass, inertia `[3.2,5.9,3.6] kg·m²`, 4.8 m/s,
10 m/s² wheel command, grip 1.05, 42 fuel/s intake,25 fuel/s nominal fire rate,
.30 s feed transit and 10 m passing reach. Cadence remains gated by aim, spin-up,
hood, stability and clear exits. No measured BPS or motor-limit model is claimed.

Capacity 48 uses nonoverlapping 150 mm sphere seeds, three staggered layers and
the shared local hopper dynamics. It accounts for the measured extended hopper
plus the documented expandable top net; the packet's volume is not naively
divided into a ball count. The net itself is an estimated containment envelope,
not individually simulated strands. The front contact plane is now X=-.6395,
about 1 mm inside the measured polycarbonate inner face at X=-.6405245. The old
-.65 plane let fuel surfaces cross that plate by almost 10 mm. Full-size seed
spacing is adjusted by less than 1 mm to fit the corrected contact envelope;
capacity remains 48. Manual and shooting retraction are cargo-limited. Held fuel
continues to contribute mass/inertia once through the existing system.

Shot spread is an estimate: yaw .032 rad, elevation .035 rad, speed fraction .035,
flyer chance .10 and backspin 28 rad/s. The reused optional uncertainty model adds
launch variations and occasional wider tails. It does not choose forced misses,
correct flight after release or claim a hit percentage derived from TBA or
Statbotics. Existing robots without an explicit profile keep their old launch
path; no unrelated accuracy tuning is included here.

## Reproduce the prepared model

With the verified export at the ignored source path and pinned dependencies:

```sh
node src/robot/robots/6800-downpour/prepare.mjs
pnpm robot:branch --team=6800
pnpm test:robots
pnpm test:sim
pnpm build:release
```

The model currently has 2,679,448 bytes, 640,052 triangles and 38 primitives. The
converter preserves 398 CAD bodies and derives four plain padding bars and omits 1,274 hardware/origin-detail bodies. No
embedded fuel bodies were identified in this export. It reconnects exporter
face boundaries at 10-micron tolerance, simplifies the original surfaces and
batches around real mechanism frames. It preserves palette colors and makes
exterior hopper polycarbonate 24% opaque. Only the lettered foam is replaced: four plain boxes retain the measured source
padding envelopes while original bumper wood and mounts remain CAD. The shared
renderer supplies the only bumper numbers, following the current authoring rule.

The four simplified WCP X2 module occurrences contain their wheel/fork surfaces
in one batched body. Preparation separates the actual triangles at the measured
wheel cylinders and lower fork envelope, leaving fixed plates/motors on the
chassis. It normalizes each occurrence's own exported axle; two were turned 90°
relative to the other two. The renderer keeps all four axle roots rigid inside
the frame while retaining steering and wheel rotation.

## Shared integration and validation

Integrated base `origin/main`: `093d554` (initial source branch began at
`0d64cbb`). A normal merge preserves the current roster, searchable selection,
starting-line validation, climber/juice-press contracts, spill physics and launch
profiles. Robot-owned folders hold geometry, configuration, provenance and tests.
The final shared delta against that integrated base is:

- `registry.ts`: one import/key, preserving every existing ID and order.
- `Shooter.ts`: the narrow 180° chassis aiming correction described above;
  current turn response, turret behavior and motion prediction remain intact.
- `App.tsx`: binding-independent Downpour control help and CAD credit.

The capability helper, wide feed paths, uncertainty model, rigid modules and
wall-contact material fix are now supplied by main. Their integrated versions
are retained rather than replaced by the initial branch's copies.

Asset/build manifests are discovered through this robot's own runtime record;
no common manifest, payload allowance or build configuration changes are made.
Shared lines overlap related robot PRs and must retain compatible optional
fields/guards rather than restore an older core file wholesale.

Historical integrated-base validation with Node 26.13.0 and pnpm 10.20.0, before the roller/hardware refinement below:

- `pnpm test:sim`: 380 tests across 53 files passed, including the current
  registered roster, Downpour's full 48-fuel discharge through all four lanes,
  body/ID and mass conservation, above-floor feed paths, pivot controls,
  pause/reset, loaded wall slide/back-away and real CAD articulation.
- Actual-field cases verify hub entry and processing after stopping, plus
  physical passing from a 180° turn for Downpour and Re•Blitz.
- `pnpm build:release`: integrity, TypeScript/Vite and production payload checks
  passed. Twenty-five runtime source files total 33.27 MiB; eighteen hashed build
  assets. The existing Rapier chunk-size warning remains.
- The final isolated browser inspected stowed/deployed/seeded-full/shooting/
  partial CAD poses with plain padding, then checked the current searchable
  robot picker, detail/select, both-alliance practice, W/L/Shift/Space/Q/V,
  saved-key help, pause/resume and R restart. No page errors were recorded.

Earlier standalone robot checks (31 tests / 8 files) and the initial 165-test
simulation pass belong to the original two-robot base, before main advanced;
those are retained as historical results in the source record. The final suite
above includes all current robot contract and asset checks. Ignored `.tools/`
logs/screenshots retain local evidence; original CAD and QA stay out of Git.

CAD redistribution remains pending under the repository's owner-authorized
noncommercial v1 policy. Public attribution and an unrelated code license are
not treated as CAD clearance. Raw source, QA pages and reports remain ignored.

User-feedback follow-up: automatic Space folding, both-alliance partial/full
discharge, actual prepared-polycarbonate clearance, accelerated full-hopper
wall contact, pause/reset and the existing CAD articulation checks are covered
by 15 focused tests across three files. Shared/core full validation and combined
preview browser checks are coordinated by the integration task. The runtime
GLB was unchanged by that earlier contact/actuation correction.

## Roller and floating-drive-hardware repair

The powered intake uses the contributor's original 464-triangle tube, with its
50.8 mm circular outside diameter, 580.8 mm length and original curved/end normals.
The converter now protects this surface, both static bar tubes, shooter drums,
exposed drive parts and their support plates from position-only simplification.
Bounds use all eight transformed corners, including for rotated occurrences.

The former hardware filter removed the real intake pulleys while retaining their
belts. Both 26T pulleys, both printed 32T hubs and both fixed 18T pivot pulleys now
remain assembled with their original mounts. The 26T shafts follow the 32/26
roller ratio. Both milled and printed hood-hub pairs now belong to their actual
Back Roller nodes, so they follow hood movement and spin instead of staying
behind on the chassis. No procedural replacement roller or gear was added.

Current focused evidence: **17 tests across three files passed**, including the
original tube radius/normals and support/shaft attachment through folding, hood
movement and spin. A fresh isolated browser checked stowed, deployed, partial
fold, intake close-up and hood close-up poses without page errors.
`pnpm build:release` passed 25 runtime files (33.91 MiB), TypeScript/Vite and
18 hashed production assets. The existing large bundle warning remains.
Ignored evidence is in `.tools/roller-gears-*`. The parent integration validates
the complete combined roster; earlier broad test counts above are historical.

This remains the shared pivot/intake mechanism family. Belts are retained on
their source assembly; belt deformation, cycloidal internals and drive-train
compliance are not individually simulated.

## Retraction contacts and independent PR integration

Stored fuel now contacts seven conservative boxes around the source intake's
powered roller, two fixed tubes, two crossbars and two side plates. They use the
same `partTransform` pivot and angle as the rendered CAD at every fixed step.
Field-only mechanism colliders did not previously contact owned local fuel.
The boxes include roughly 1 mm of clearance around measured major surfaces;
they do not model every tooth or cutout. Capacity stays 48 and fuel mass is unchanged.

Feeding fuel also yields to these moving intake contacts; static feeder envelopes
remain excluded from that managed path so normal internal feeding still works.
Three new cases check every held sphere against all seven contacts throughout
full-load automatic shooting, a manual partial-load fold and the last incoming
physical transfer, retaining original
IDs/bodies, all 48 physical releases, pause/reset behavior in existing cases and
correct payload mass. The final robot/contact coverage is 32 cases across six
files, included in the 474-case all-PR integration run. Runtime CAD bytes/hash are unchanged by this contact correction.

The three contributions share optional mechanism code through common merge
ancestors, with their registrations and credits on separate lines. Each branch
still owns only its own added robot definition/model. Shared changes include the
registry format, types/validation/poses, local hopper solver/geometry, transfer
and feeder contacts, optional opposed-intake controls/view hints and shared aim/
compression behavior. These are disclosed in each PR; the complete current shared
path list is generated from its diff against main. Existing robot IDs/order are
retained relative to one another. The new robots can therefore be merged in any
order without discarding registration, credits or mechanism behavior.


## Visible retaining fabric

Source-confirmed retaining nets now have fitted open-weave rendering that follows the existing hopper bounds. The already-enclosed cargo contacts are retained; capacity, mass and CAD payload do not change. Icarus covers only its intake bays and leaves the rigid center roof/turret uncovered. Shapes and weave dimensions are estimates, not an exact cloth reconstruction. See [retaining-net notes](../../../../docs/RETAINING_NETS.md).
