# Orbit 1690 Kepler integration

Kepler is selectable in Session for timed matches and free practice, on either alliance and at every supported spawn. 2910 remains the direct-start default. The existing physics, fuel ownership, match timing and scoring systems are shared; there is no separate Kepler simulator.

## CAD provenance

The supplied [official Onshape document](https://orbit1690.onshape.com/documents/d09a47dbfc1b125f63a78ac7/w/d71d2275472653904f9b717a/e/03166dd8363262636c9f6b66) is linked by the team's [May 12 CAD release](https://www.chiefdelphi.com/t/frc-orbit-1690-2026-robot-cad-release/520673). Direct Onshape access was unavailable in this environment. The prepared runtime model uses the public tessellated components at commit `344501f464477cb93517a7b5344b43d7ee9474a7` of [TylerHandel/rebuilt-sim-2026](https://github.com/TylerHandel/rebuilt-sim-2026/tree/344501f464477cb93517a7b5344b43d7ee9474a7/cad). Its CAD README identifies the same official document and traces the meshes to the team's Closed/Open Parasolid release through STEP tessellation. This is a pinned release, not a live export of subsequent workspace edits.

`assets/kepler-cad-sources.json` records each input URL, SHA-256 and byte length. Raw CAD-derived inputs and conversion reports remain ignored. Only the prepared runtime GLB is allowlisted. CAD colors and the main structural, polycarbonate, carriage, turret, hood, gear and swerve geometry are preserved. The source mesh pack omits fasteners and several rolling surfaces: simple rollers, compliant wheels, cross-feed belt surfaces and bumpers supplement the original CAD at measured axle positions. The model is not a fully detailed original assembly and has no team textures/decals.

The mesh export's mechanism measurements were used as reference data. No reference simulator implementation was copied into the application. Our converter, hierarchy, simulation integration and missing-surface geometry are implemented here. Pending asset review remains pending; public accessibility does not establish redistribution rights.

To recreate the prepared model with Node 26 and dependencies installed:

```sh
pnpm assets:kepler --download
```

Without `--download`, conversion uses existing local inputs and verifies their recorded hashes. Conversion changes require updating the corresponding output hash/size in `assets/runtime-manifest.json`; `pnpm build:release` verifies them.

## Frames and behavior

The exported meshes use X toward the intake, Y up, Z across the chassis, with the carpet at Y=0. Jamesim uses intake −X, shooter neutral +X and a chassis reference .223 m above the carpet. The chassis/carriage rotate 180° about Y. The turret export's −23.99° CAD pose is normalized independently about its bearing. Its neutral shot points +X; physical aim rotates the entire offset flywheel/muzzle about the bearing, not about the flywheel axle. The hood remains a child of that turret.

| Parameter | Implementation / evidence |
| --- | --- |
| Frame | 25 × 29 in, confirmed in the team's reveal discussion and CAD-derived dimensions |
| Bumper envelope | .7874 × .889 m; 3 in allowance on every frame edge |
| Wheel/module centers | 4 in wheel; centers ±.2505 X, ±.3013 Z |
| Carriage travel | 312 mm out and 69.1 mm down, from Closed/Open CAD comparison |
| Kicker | Falls 163° once after deployment and stays down until restart; team CAD discussion confirms passive behavior |
| Turret bearing axis | Runtime [.134, −.223, .1872] relative to the chassis reference |
| Flywheel | 50.2 mm radius; axle offset 70 mm from turret axis at 464 mm above carpet |
| Hood | CAD steep end 82.47°; lower limit 35° is an estimate |
| Capacity | 60 full-size 150 mm fuel, managed close packing in three layers; gameplay estimate, not a measured team capacity |
| Intake/fire rate | 16 / 8 fuel per second nominal, gameplay estimates |
| Mass/inertia, drive tuning | Estimates/shared drive tuning; not measured Kepler performance |
| Climb | Team confirms L1 in the [reveal discussion](https://www.chiefdelphi.com/t/orbit-1690-2026-robot-reveal-kepler/515277?page=2). Managed tower joint limited to .212 m lift; winch rate .15 m/s is an estimate. Support tether visualizes the constraint; it does not claim to reproduce a fully rigged CAD winch. |

Shift runs intake, Q reverses, Space aims/shoots/passes. Kepler can intake and shoot simultaneously. V toggles its carriage independently of shooting; cargo limits retraction, and intake/reverse requests extend it. The hopper's fixed cargo positions do not translate with the carriage. Eight preloads fit inside the stowed chassis envelope. The passive kicker remains down after subsequent carriage retractions. All actions use the existing rebindable keyboard/controller mappings.

Climb uses the current tower corridor: stop near your own tower center, facing it, and hold the Climb binding. It requires a ray hit on an actual tower collider. The joint holds while actuators are disabled for assessment. Lower reverses and releases at the bottom. Kepler cannot reach L2 or L3 through its configured lift. This remains a managed support approximation, with no detailed hook capture, rope dynamics or articulated CAD climb animation.

## Validation

`src/sim/Kepler.test.ts` checks packing clearance/non-overlap, repeated switching and both alliances, inclined intake motion and passive-kicker reset, physical collection/reverse, simultaneous collection/shooting, offset muzzle rotation, stationary/moving physical hub hits, wider-chassis wall support, L1 scoring/assessment and lowering/release. Existing regression tests continue to cover High Tide, 2910, controls and match rules.

An isolated browser check selects Kepler → High Tide → 2910 → Kepler, verifies only the chosen model is visible and tests V through real keyboard events against the animated CAD carriage. Drawing is disabled in that UI flow for the software-rendered cloud browser. A separate real WebGL render checks the prepared CAD; this does not establish full-field frame rate on the user's Windows/GPU setup.
