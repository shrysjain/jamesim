# Team 5000 Hammerheads — Icarus 2.0

A selectable CAD-backed 2026 REBUILT robot with two opposing rack-and-pinion intakes, the coaxial dye-rotor feeder, an adjustable-hood turret, and moving shots. It uses the shared 120 Hz simulation and original fuel bodies. No replacement ammunition, private score, new camera, or separate simulation was added.

## Reference and revision

The requested Autodesk share is the **Championship Icarus** link in the team's [official build thread](https://www.chiefdelphi.com/t/frc-5000-hammerheads-2026-build-thread-open-alliance/507502). Its `https://a360.co/4wuUiK0` redirect resolves to the exact contributor URL:

`https://gmail2245660.autodesk360.com/g/shares/SH90d2dQT28d5b6028119885f9f65ba749db`

This differs from the team's V1 and pre-Championship V2 share URLs. The official Championship STEP on [Google Drive](https://drive.google.com/file/d/1pD1Hule9rc5S2wxoWTjIMgEtEGykpZOK/view) is 458,013,644 bytes; its metadata was readable, but the connected download service rejects files over 268,435,456 bytes. The Autodesk viewer is also inaccessible in this environment.

The runtime therefore uses the team's own [published AdvantageScope CAD](https://github.com/hammerheads5000/2026Rebuilt/tree/279745f273441470f86b78dece9d9c8653db0e2c/AdvantageScope/Robot_2026): static model plus five original articulated components. All six meshes were last updated together in `7e117ff831a4b49074b28c8dd8d6fd21d59a4a0f` on July 9, 2026, after Championship. The [team's technical binder](https://logandelaar1.github.io/Tech-Binder/) calls the final architecture **Icarus 2.0** and links the exact Championship share. The CAD appearance was compared with its final-robot render. **Exact geometric equivalence with the 458 MB Championship STEP remains unverified.** Mechanisms retain the official post-Championship Icarus geometry. The embossed outer foam is replaced by four plain padding bars measured from its outline, as described below; this is not a byte-identical STEP conversion.

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

The 51 seeds are close-packed with at least .151 m separation, lie fully inside the expanded volume, and avoid the tower by a full fuel radius. They are ordered so the first eight preload centers also fit the retracted starting volume. Stored positions then evolve in shared sphere dynamics; seeds are not a frozen rendered stack. The two moving end walls constrain cargo during compression. Intake transfer and shooter feed are managed paths; the rotor is not a discrete paintball-like hook/collision simulation. The model has no embedded fuel meshes. The final binder explicitly describes **opaque SRPP hopper walls**; source materials are all opaque, so those walls have not been made artificially translucent.

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

Preparation verifies source hashes, welds Fusion seams at 10 µm, removes 798 hardware bodies, retains 321 source mesh bodies, replaces the single embossed foam body with four measured plain padding bars, and batches around real mechanism frames. Disconnected face soups use bounded spatial simplification when ordinary topology-preserving reduction cannot simplify their locked boundaries. Mechanism geometry is retained from CAD; the plain padding bars are the documented derived exception. The prepared model is 1,433,216 bytes, 334,619 triangles and 27 primitives, below the existing 6 MiB / 650,000 triangle / 160 primitive limits. The converter regenerates its runtime manifest; detailed reports and source CAD remain ignored and are excluded from production.

## Integration and verification

The branch normally merges current main `093d554e40e10f0da508fdeb21b2f1f534dcc201`, preserving the eight existing robot definitions, selector, legal starting-position map, current shot uncertainty, match-end hold, open-hopper spills/field contacts, physical indexer, juice press, climbing, wall response and rigid modules. The registry appends one import/key without reordering those entries.

The remaining shared additions are `opposedIntake` pose/collider transforms, a positive-X pickup region, mirrored transfer/reverse reactions, rear hopper-wall travel, the opposed-mouth bump-support reach, validation and Icarus action-name help/credit. Existing definitions preserve their single-mouth behavior. Finite turret stops, per-robot spread, obstacles/entry, wheel braking and rigid CAD support are now inherited from current main rather than reimplemented here. Main's broader shot-scatter regression file is retained unchanged.

The shared chassis-aim controller also retains one turn direction near the exact 180° wrap boundary, preventing early tire steering forces from reversing the aim demand every tick. This matches the separately validated contributor fix and keeps `DRIVE_RESPONSE.turnRate` normalization. Both-alliance real-field Re•Blitz passing tests preserve original projectiles. It does not change the Icarus turret solver.

Meaningful Icarus tests exercise both-alliance two-mouth collection/reverse, rejection of rapidly departing fuel, blocked-mouth path queries, reaction impulse, full 51-ID physical discharge, pause/restart/body/mass conservation, source cable stops, moving shots, both bump directions, loaded wall contact, independent real hood shafts, rigid CAD mounts, and a plain four-bar bumper without baked numbers. Definition tests also verify full-size packing and eight starting preloads within the retracted volume. The generic asset/definition/acceptance checks include Icarus automatically. Refreshed browser checks passed on the current-main search/details/selection flow, both alliances, saved controls, intake/reverse/shoot/V, pause/resume and restart; four CAD poses also confirmed plain blue/red padding without a baked number layer. Current validation results and historical checks are recorded separately in `sources.json`; old two-robot checks are not represented as current integration results.

Final current-main verification: `pnpm test:sim` passed **383 tests across 53 files**; `pnpm build:release` verified 25 runtime files (32.72 MiB) and 18 content-hashed production assets. The existing large bundle warning remains.
