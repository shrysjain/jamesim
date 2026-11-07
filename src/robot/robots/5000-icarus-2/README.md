# Team 5000 Hammerheads — Icarus 2.0

A selectable CAD-backed 2026 REBUILT robot with two opposing rack-and-pinion intakes, the coaxial dye-rotor feeder, an adjustable-hood turret, and moving shots. It uses the shared 120 Hz simulation and original fuel bodies. No replacement ammunition, private score, new camera, or separate simulation was added.

## Reference and revision

The requested Autodesk share is the **Championship Icarus** link in the team's [official build thread](https://www.chiefdelphi.com/t/frc-5000-hammerheads-2026-build-thread-open-alliance/507502). Its `https://a360.co/4wuUiK0` redirect resolves to the exact contributor URL:

`https://gmail2245660.autodesk360.com/g/shares/SH90d2dQT28d5b6028119885f9f65ba749db`

This differs from the team's V1 and pre-Championship V2 share URLs. The official Championship STEP on [Google Drive](https://drive.google.com/file/d/1pD1Hule9rc5S2wxoWTjIMgEtEGykpZOK/view) is 458,013,644 bytes; its metadata was readable, but the connected download service rejects files over 268,435,456 bytes. The Autodesk viewer is also inaccessible in this environment.

The runtime therefore uses the team's own [published AdvantageScope CAD](https://github.com/hammerheads5000/2026Rebuilt/tree/279745f273441470f86b78dece9d9c8653db0e2c/AdvantageScope/Robot_2026): static model plus five original articulated components. All six meshes were last updated together in `7e117ff831a4b49074b28c8dd8d6fd21d59a4a0f` on July 9, 2026, after Championship. The [team's technical binder](https://logandelaar1.github.io/Tech-Binder/) calls the final architecture **Icarus 2.0** and links the exact Championship share. The CAD appearance was compared with its final-robot render. **Exact geometric equivalence with the 458 MB Championship STEP remains unverified.** Mechanisms retain the official post-Championship Icarus geometry. The embossed outer foam is replaced by four plain padding bars measured from its outline, as described below; this is not a byte-identical STEP conversion.

Robot code is pinned at `279745f273441470f86b78dece9d9c8653db0e2c`; binder source is pinned at `17ed028157d5f5848c4e781f1fe7dae90f8ae4de`. Input URLs, sizes and SHA-256 hashes are in `assets/robots/5000-icarus-2/sources.json`. CAD redistribution review remains **pending** under the owner's existing noncommercial v1 publication authorization; a software license is not asserted to clear CAD rights.

## Controls and behavior

Normal saved/rebindable controls apply: WASD drive, J/L turn, Shift intake, Space align/shoot/pass, Q reverse, V toggle intake extension, N switch intake side, R restart, Escape pause/controls/settings. The Controls dialog explains the two-mouth behavior and displays the actual saved keys.

Both carriages begin retracted. Play deploys only Primary (the setup map arrow, local −X). N selects Opposite (+X); the previous carriage fully retracts before the selected side extends. The gold arrow and a small Icarus-only side status display identify the selection and actual saved key. N is rebindable; controller face button 3 is its default controller binding. Shift, Q and V operate only the selected side. Space compresses that side as cargo empties; Shift/reverse keep the established collection override. Releasing Space extends the selected side unless V requested retraction. The other side remains closed, including its colliders, pickup gate and hopper end wall.

A side switch is refused while more than eight fuel remain, with an explicit “Empty to 8 fuel before switching” message; it never folds a loaded side just to change direction. Eight is the existing shared compact-packing limit, conservatively verified here: all eight preload spheres extend at most .253 m from the chassis center, clearing both closed walls at ±.317044 m and the central feeder. It is not a measured real-robot controller limit. Reset selects Primary; a respawn that retains cargo preserves its selected side.

The native CAD side intakes are normalized from ±Z to simulator ±X by a whole-robot 90° yaw. On a swerve drive this is a reference-frame choice. The primary intake arrow points toward −X, with the second mouth on +X. Intake and opposed-intake colliders and rendered CAD use the same `partTransform` function. Collection checks departing velocity and an unobstructed field path separately at the selected open mouth, and captures each eligible original fuel at most once. Reverse reactions and payload mass are accounted once.

The dye-rotor hook, vertical wheel stack, top feeder roller, hood rollers, flywheels and all four swerve forks/wheels use separate real CAD shaft frames. The supplied hood is already at 83.76° elevation. Preparation preserves that source pose; the renderer applies only the difference between requested elevation and 83.76°, avoiding a second −6.24° tilt. A regression compares the actual prepared drum/upper-roller exit tangent with the shared physical launch rotation at minimum, midpoint and maximum elevation with three turret yaws. The two hood roller rows are classified by **original shaft height before hood rotation**; otherwise both can be incorrectly merged into one orbiting cylinder. Swerve CAD stays rigid within the chassis, while numerical terrain support and the existing bump-only body lean remain.

## Measurements and simulator estimates

| Quantity | Value and evidence |
| --- | --- |
| Bumper footprint | .828875 m along simulator X × .892375 m across Z; actual CAD 32.625 in × 35.125 in, matching the binder |
| Wheel/module centers | ±.263525 m X and ±.28575 m Z; source code 20.75 in × 22.5 in module spacing after frame normalization |
| Prepared wheel radius | .0508 m from CAD; the code's worn/calibrated radius of 1.985 in does not shrink the mesh |
| Intake slide | 11.5 in deployed, .2 in stowed, 21° below horizontal; travel .267956254 m X and .102858769 m Y from official constants/visualizer |
| Chassis speed | 5.85 m/s from official `TunerConstants` |
| Command acceleration/grip | 10.0584 m/s² and 1.05, simulator estimates; the code's 25 m/s² command ceiling is not claimed as measured traction |
| Optional wheel braking | 20.1168 m/s², an estimated Icarus-only wheel deceleration. Powered acceleration stays 10.0584 m/s²; the separate stop/reverse response prevents delayed back-out after wheel spin against a wall. |
| Empty running mass | 66 kg estimated: 114.9 lb robot + 17.9 lb bumpers from the binder, plus an estimated 5.8 kg battery; approximate diagonal inertia 4.0 / 7.2 / 4.3 kg·m² |
| Capacity | 50 nonoverlapping 150 mm spheres with one side open and the other closed, fitted around the actual stepped bowl and feeder; no measured real-team capacity claim. |
| Hopper | ±.585 m X, .337 m half-width, measured bowl floor −.137275 m and platform −.05155 m; .322 m roof envelope, with actual circular feeder/roof contacts |
| Shooter axes | Flywheel center [.096721269, .260524992, 0], turret bearing [0, .2883, 0] relative to the .223 m chassis reference; original wheels 3 in diameter |
| Hood/elevation | Source hood 6.24–47° from vertical maps to 83.76–43° elevation, following the team visualizer |
| Turret cable range | Latest code −250..195° (445°), transformed to −160..285° after independent neutral yaw; the binder says 420°, so source versions differ |
| Feed/intake rates | 12 shots/s, 38 fuel/s total, .28 s minimum feeder transit, 5 rad/s turret response: gameplay estimates, not measured rates |
| Passing | 12.6 m source passing-map endpoint; physical arc/clearance/readiness still gate launch |
| Shooting uncertainty | Estimated yaw standard deviation .028 rad, elevation .032 rad, speed fraction .032, .08 wider-tail probability, nominal 28 rad/s backspin; moving rating .90 increases dispersion rather than guaranteeing a 90% hit rate |

The 50 seeds are fitted with at least .1502 m spacing and full 150 mm diameter.
They fit the one-open-side volume; the first eight also fit both closed walls.
`cargo.ts` records the measured recessed bowl, rectangular raised platform,
round rotor/feeder, thin upper posts and turret base. The lower roof uses its
actual .22225 m circular opening cropped to the source rectangular sheet,
instead of four conservative square-hole rails. The former full-height central
box excluded empty air. The bowl floor is measured at −.137275 m, the platform
at −.05155 m; the flexible net outside the frame retains its conservative
−.08 m floor estimate because its full shape is absent from the published CAD.
`pack.py` reproduces the offline NumPy gravity-grid fit; no Python runs in play.

Stored positions evolve under the shared sphere solver. Estimated restitution
.22, friction .15 and linear damping .35/s preserve incoming contact momentum
and allow impacts, acceleration and braking to redistribute cargo. Fuel mass
and chassis payload accounting are unchanged. Each end wall follows its own
carriage; either selected intake can fill the same cavity. Intake transfer and
shooter feed remain managed paths; the rotor is not a discrete hook/collision
simulation. No embedded fuel meshes exist. The binder describes **opaque SRPP
hopper walls**; their source opacity is retained.

The real dual intakes have sewn half-box mesh nets that are not fully modeled in the published meshes. The internal collision envelope approximates that containment. Small interior details and decals are omitted during preparation. The source `Bumpers:1/Body1 (1):1` contains both black foam and embossed white numbers; only that outer foam body is replaced by four flat padding bars fitted to its measured .828875 × .892375 × .128397 m envelope. Their .0524875 m thickness comes from the difference between the outer foam and backer bounds. The actual `Body19:1` backer and all frame/mechanism CAD remain. These derived padding bars approximate the wrap and remove baked glyphs, leaving the shared game labels as the only team numbers. Bumper materials still change with alliance.

Climbing is disabled. Although the public code retains older climber constants, this final mesh/binder does not establish a supported vertical side-hook L1 assembly. No fake climber or unsupported L2/L3 capability is advertised.

## Reproducing CAD preparation

Place the hash-matching original files from the pinned official repository under ignored `assets/source/robots/5000-icarus-2/official/` using their original `model.glb`, `model_0.glb` … `model_4.glb` names. Run with Node 26 and pinned pnpm 10.20.0:

```sh
node src/robot/robots/5000-icarus-2/prepare.mjs
pnpm robot:branch --team=5000
pnpm test:robots
pnpm test:sim
pnpm build:release
```

Preparation verifies source hashes, removes 798 hardware bodies, retains 321 source mesh bodies, replaces the single embossed foam body with four measured plain padding bars, and batches around real mechanism frames. The exposed Super Structure, both Intake SRPP plate meshes, the lower `top plate shell - FusionComponent`, and the unnamed upper roof under `Top Plate:1` retain their original triangle topology. The last part is protected by CAD ancestry, not an assumed display name. Their face normals are rebuilt without smoothing through CAD edges; a prepared-model regression checks the resulting planar surfaces. Other CAD detail uses bounded simplification, with separate NORMAL accessor ownership for recomputed normals. Reflected baked occurrences keep correct triangle winding. These changes repair the observed conversion shading artifact; raw source normals were independently checked and are not claimed corrupted. Mechanism geometry is retained from CAD; the plain padding bars are the documented derived exception. The prepared model is 4,125,176 bytes, 629,533 triangles and 32 primitives, below the existing 6 MiB / 650,000 triangle / 160 primitive limits. The converter regenerates its runtime manifest; detailed reports and source CAD remain ignored and are excluded from production.

## Integration and verification

The branch normally merges current main `093d554e40e10f0da508fdeb21b2f1f534dcc201`, preserving the eight existing robot definitions, selector, legal starting-position map, current shot uncertainty, match-end hold, open-hopper spills/field contacts, physical indexer, juice press, climbing, wall response and rigid modules. The registry appends one import/key without reordering those entries.

The remaining shared additions are `opposedIntake` pose/collider transforms, a positive-X pickup region, mirrored transfer/reverse reactions, rear hopper-wall travel, the opposed-mouth bump-support reach, validation and Icarus action-name help/credit. Existing definitions preserve their single-mouth behavior. Finite turret stops, per-robot spread, obstacles/entry, wheel braking and rigid CAD support are now inherited from current main rather than reimplemented here. Main's broader shot-scatter regression file is retained unchanged.

The shared chassis-aim controller also retains one turn direction near the exact 180° wrap boundary, preventing early tire steering forces from reversing the aim demand every tick. This matches the separately validated contributor fix and keeps `DRIVE_RESPONSE.turnRate` normalization. Both-alliance real-field Re•Blitz passing tests preserve original projectiles. It does not change the Icarus turret solver.

Meaningful Icarus tests exercise both-alliance selected-mouth collection/reverse, rejection of rapidly departing fuel, blocked-mouth path queries, reaction impulse, full 50-ID physical discharge, pause/restart/body/mass conservation, source cable stops, moving shots, both bump directions, loaded wall contact, independent real hood shafts, rigid CAD mounts, and a plain four-bar bumper without baked numbers. Definition tests also verify full-size packing and eight starting preloads within the retracted volume. The generic asset/definition/acceptance checks include Icarus automatically. Refreshed browser checks passed on the current-main search/details/selection flow, both alliances, saved controls, intake/reverse/shoot/V, pause/resume and restart; four CAD poses also confirmed plain blue/red padding without a baked number layer. Current validation results and historical checks are recorded separately in `sources.json`; old two-robot checks are not represented as current integration results.

Historical verification before the exclusive-intake/surface fixes: `pnpm test:sim` passed **383 tests across 53 files**; `pnpm build:release` verified 25 runtime files (32.72 MiB) and 18 content-hashed production assets. The existing large bundle warning remains.

Before the loose-cargo correction, feedback fixes passed 27 focused tests across four files (`src/controls.test.ts` and the Icarus folder), including actual continuous collection to full capacity and original-ID discharge from each selected side, exclusive sequencing, blocked loaded switching, pause/reset/respawn, saved-key conflicts, and prepared panel face normals. `pnpm build:release` passed asset integrity, TypeScript/Vite and production payload checks. Default N and a saved X binding both passed setup/control hints and live Opposite selection in the browser without page errors. The final actual CAD was inspected stowed, deployed, full, and with turret/hood movement; the roof and slide surfaces shade uniformly without the reported diagonal patches. The final HTTP GLB was verified against the prepared file hash. The full combined suite is run by the preview integration; the earlier 383-test result above is historical.

Additional shared integration points for this refinement are `src/controls.ts`, its tests, `src/view/FieldViewer.ts`, `src/view/RobotView.ts`, `src/components/SetupScreen.tsx` and `src/style.css`. `RobotPose.opposedIntake` independently drives transforms, collider updates, bump reach and the rear hopper wall. The controls action is optional at runtime for other robots; UI hints/status appear only for opposed intakes. The small live side indicator is explicitly requested by this feedback and does not introduce a general gameplay HUD.

## Loose-cargo verification

The updated geometry and 50-slot capacity passed 27 existing robot/control cases
across four files, plus two continuous-intake/motion cases, one for each selected
mouth. Both acquired the full load, retained at least 43 after settling and
moved their original spheres under acceleration/braking. Pause/reset and body
identity are checked as well. Shared profile/contact regression cases pass in
the combined preview. The runtime GLB is unchanged. Additional shared integration
points are `hopperGeometry.ts`, optional hopper types/validation, contact impulses
in `HopperDynamics.ts`, arrival momentum in `RobotSimulation.ts`, and the reusable
`testing/hopperMotionAcceptance.ts` test helper. Earlier capacity/validation
records in source metadata are historical.

The refreshed Node 26 / pnpm 10.20.0 release build passes asset integrity,
TypeScript/Vite and production-payload checks (18 hashed assets). The existing
large Rapier bundle warning remains.

## Independent PR integration

All three new robot contributions share common ancestors for optional mechanism
code (`56a2273`, `191c137`), including hopper contacts, transfer/feeding clearance,
opposed intake controls/view hints, slide compression and aim stability. Each
branch adds only its own robot definition/model. Registration and credits are
split onto separate contributor lines while preserving original robot IDs and
relative order. All 24 merge orders of the three robots plus existing tuning
PR #11 onto main `4154227` passed and produced the same final tree. The source
record's `integrationFiles` lists every shared path; PR descriptions disclose
them. The refreshed standalone release build passes. Recheck future edits.


## Visible retaining fabric

Source-confirmed retaining nets now have fitted open-weave rendering that follows the existing hopper bounds. The already-enclosed cargo contacts are retained; capacity, mass and CAD payload do not change. Icarus covers only its intake bays and leaves the rigid center roof/turret uncovered. Shapes and weave dimensions are estimates, not an exact cloth reconstruction. See [retaining-net notes](../../../../docs/RETAINING_NETS.md).
