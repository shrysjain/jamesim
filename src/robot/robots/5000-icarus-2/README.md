# Team 5000 Hammerheads — Icarus 2.0

A selectable CAD-backed 2026 REBUILT robot with two opposing rack-and-pinion intakes, the coaxial dye-rotor feeder, an adjustable-hood turret, and moving shots. It uses the shared 120 Hz simulation and original fuel bodies. No replacement ammunition, private score, new camera, or separate simulation was added.

## Reference and revision

The requested Autodesk share is the **Championship Icarus** link in the team's [official build thread](https://www.chiefdelphi.com/t/frc-5000-hammerheads-2026-build-thread-open-alliance/507502). Its `https://a360.co/4wuUiK0` redirect resolves to the exact contributor URL:

`https://gmail2245660.autodesk360.com/g/shares/SH90d2dQT28d5b6028119885f9f65ba749db`

This differs from the team's V1 and pre-Championship V2 share URLs. The official Championship STEP on [Google Drive](https://drive.google.com/file/d/1pD1Hule9rc5S2wxoWTjIMgEtEGykpZOK/view) is 458,013,644 bytes; its metadata was readable, but the connected download service rejects files over 268,435,456 bytes. The Autodesk viewer is also inaccessible in this environment.

The runtime therefore uses the team's own [published AdvantageScope CAD](https://github.com/hammerheads5000/2026Rebuilt/tree/279745f273441470f86b78dece9d9c8653db0e2c/AdvantageScope/Robot_2026): static model plus five original articulated components. All six meshes were last updated together in `7e117ff831a4b49074b28c8dd8d6fd21d59a4a0f` on July 9, 2026, after Championship. The [team's technical binder](https://logandelaar1.github.io/Tech-Binder/) calls the final architecture **Icarus 2.0** and links the exact Championship share. The CAD appearance was compared with its final-robot render. **Exact geometric equivalence with the 458 MB Championship STEP remains unverified.** This is official post-Championship Icarus geometry, not a fabricated replacement or a claimed byte-identical STEP conversion.

Robot code is pinned at `279745f273441470f86b78dece9d9c8653db0e2c`; binder source is pinned at `17ed028157d5f5848c4e781f1fe7dae90f8ae4de`. Input URLs, sizes and SHA-256 hashes are in `assets/robots/5000-icarus-2/sources.json`. CAD redistribution review remains **pending** under the owner's existing noncommercial v1 publication authorization; a software license is not asserted to clear CAD rights.

## Controls and behavior

Normal saved/rebindable controls apply: WASD drive, J/L turn, Shift intake, Space align/shoot/pass, Q reverse, V toggle intake extension, R restart, Escape pause/controls/settings. The Controls dialog explains the two-mouth behavior and displays the actual saved keys.

Both carriages begin retracted and extend on starting play. Shift runs both intake roller stacks; Q reverses both and releases the same held IDs through a clear outlet on the nearer side. V retracts/extends both, subject to cargo clearance. While Space is held, the two hopper boundaries compress as fuel empties; intake/reverse overrides extension. Releasing Space extends them unless the driver manually requested retraction. The single shared extension scalar deliberately couples the two carriages; the real robot's independent/automatic leading-side selection is not reproduced.

The native CAD side intakes are normalized from ±Z to simulator ±X by a whole-robot 90° yaw. On a swerve drive this is a reference-frame choice. The primary intake arrow points toward −X, with the second mouth on +X. Intake and opposed-intake colliders and rendered CAD use the same `partTransform` function. Collection checks departing velocity and an unobstructed field path separately at each mouth, but captures each eligible original fuel at most once. Reverse reactions and payload mass are accounted once.

The dye-rotor hook, vertical wheel stack, top feeder roller, hood rollers, flywheels and all four swerve forks/wheels use separate real CAD shaft frames. The two hood roller rows are classified by **original shaft height before hood rotation**; otherwise both can be incorrectly merged into one orbiting cylinder. Swerve CAD stays rigid within the chassis, while numerical terrain support and the existing bump-only body lean remain.

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
| Capacity | 51 nonoverlapping 150 mm spheres, estimated from the simplified expanded internal volume after excluding the central feeder; no real-team capacity claim |
| Hopper | ±.585 m X, .337 m half-width, local floor −.08 m and ceiling .322 m; contact envelope estimated from CAD/net packaging, with an excluded central tower |
| Shooter axes | Flywheel center [.096721269, .260524992, 0], turret bearing [0, .2883, 0] relative to the .223 m chassis reference; original wheels 3 in diameter |
| Hood/elevation | Source hood 6.24–47° from vertical maps to 83.76–43° elevation, following the team visualizer |
| Turret cable range | Latest code −250..195° (445°), transformed to −160..285° after independent neutral yaw; the binder says 420°, so source versions differ |
| Feed/intake rates | 12 shots/s, 38 fuel/s total, .28 s minimum feeder transit, 5 rad/s turret response: gameplay estimates, not measured rates |
| Passing | 12.6 m source passing-map endpoint; physical arc/clearance/readiness still gate launch |
| Shooting uncertainty | Estimated yaw standard deviation .028 rad, elevation .032 rad, speed fraction .032, .08 wider-tail probability, nominal 28 rad/s backspin; moving rating .90 increases dispersion rather than guaranteeing a 90% hit rate |

The 51 seeds are close-packed with at least .151 m separation, lie fully inside the expanded volume, and avoid the tower by a full fuel radius. Stored positions then evolve in shared sphere dynamics; seeds are not a frozen rendered stack. The two moving end walls constrain cargo during compression. Intake transfer and shooter feed are managed paths; the rotor is not a discrete paintball-like hook/collision simulation. The model has no embedded fuel meshes. The final binder explicitly describes **opaque SRPP hopper walls**; source materials are all opaque, so those walls have not been made artificially translucent.

The real dual intakes have sewn half-box mesh nets that are not fully modeled in the published meshes. The internal collision envelope approximates that containment. Small interior details and decals are omitted during preparation; team numbers are supplied by the existing alliance-colored bumper system.

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

Preparation verifies source hashes, welds Fusion seams at 10 µm, removes 798 hardware bodies, retains 322 source mesh bodies, and batches around real mechanism frames. Disconnected face soups use bounded spatial simplification when ordinary topology-preserving reduction cannot simplify their locked boundaries. No geometry is synthesized. The prepared model is 1,433,012 bytes, 334,907 triangles and 24 primitives, below the existing 6 MiB / 650,000 triangle / 160 primitive limits. The converter regenerates its runtime manifest; detailed reports and source CAD remain ignored and are excluded from production.

## Integration and verification

The registry adds one import/key. Optional shared contracts add `opposedIntake`, an opposed pickup region, rear hopper-wall travel, measured tower obstacles/entry, finite turret travel and a per-robot uncertainty profile. Existing definitions retain their default single-mouth collection, spread and turret behavior. The rigid CAD module and low-friction wall contact fixes reuse the already-reviewed approach from other robot branches. They preserve the existing numerical ground support and tire traction. Relevant shared integration files are listed in `sources.json`; merging alongside other robot PRs must retain both registry entries and optional fields.

Meaningful tests exercise both-alliance two-mouth collection/reverse, rejection of rapidly departing fuel, blocked-mouth path queries, reaction impulse, full 51-ID physical discharge, pause/restart/body/mass conservation, source cable stops, physical moving shots, both bump directions, loaded wall contact, distinct real hood shafts, and rigid CAD mounts. The generic robot asset/definition/acceptance checks also include Icarus. Focused browser QA checked stowed/deployed/full/turret poses, blue/red bumpers, selection, normal controls, pause/resume and restart. Node 26.13.0 and pnpm 10.20.0 validation passed: `pnpm test:robots --maxWorkers=1` (32 tests / 7 files), `pnpm test:sim` (169 tests / 28 files), and `pnpm build:release` (19 source runtime files, 12 hashed production assets). The existing Rapier bundle-size warning remains. `sources.json` records logs and the source/runtime hashes.
