# Orbit 1690 Kepler integration

Kepler is selectable on the singleplayer setup screen for timed matches and free practice, on either alliance. 2910 is the default selection. The existing physics, fuel ownership, match timing and scoring systems are shared; there is no separate Kepler simulator.

## CAD provenance

The supplied [official Onshape document](https://orbit1690.onshape.com/documents/d09a47dbfc1b125f63a78ac7/w/d71d2275472653904f9b717a/e/03166dd8363262636c9f6b66) is linked by the team's [May 12 CAD release](https://www.chiefdelphi.com/t/frc-orbit-1690-2026-robot-cad-release/520673). Direct Onshape access was unavailable in this environment. The prepared runtime model uses the public tessellated components at commit `344501f464477cb93517a7b5344b43d7ee9474a7` of [TylerHandel/rebuilt-sim-2026](https://github.com/TylerHandel/rebuilt-sim-2026/tree/344501f464477cb93517a7b5344b43d7ee9474a7/cad). Its CAD README identifies the same official document and traces the meshes to the team's Closed/Open Parasolid release through STEP tessellation. This is a pinned release, not a live export of subsequent workspace edits.

`assets/kepler-cad-sources.json` records each input URL, SHA-256 and byte length. Raw CAD-derived inputs and conversion reports remain ignored. Only the prepared runtime GLB is allowlisted. CAD colors and the main structural, polycarbonate, carriage, turret, hood, gear and swerve geometry are preserved. The source mesh pack omits several rolling surfaces: simple rollers, compliant wheels, cross-feed belt surfaces and bumpers supplement the original CAD at measured axle positions. The model is not a fully detailed original assembly and has no team textures/decals.

The mesh export's mechanism measurements were used as reference data. No reference simulator implementation was copied into the application. Our converter, hierarchy, simulation integration and missing-surface geometry are implemented here. Pending asset review remains pending; public accessibility does not establish redistribution rights.

To recreate the prepared model with Node 26 and dependencies installed:

```sh
pnpm assets:kepler --download
```

Without `--download`, conversion uses existing local inputs and verifies their recorded hashes. Conversion changes require updating the corresponding output hash/size in `assets/robots/1690-kepler/runtime.json`; `pnpm build:release` verifies the aggregated payload.

## Frames and behavior

The latest user-supplied FRSim spec card supersedes the initial capacity/rate/drive estimates. It is a simulator gameplay target, not an independent measurement of the real robot.

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
| Capacity | 50 full-size 150 mm fuel in the existing non-overlapping packing; the supplied card says approximately 50 |
| Intake/fire rate | 40 / 13 fuel per second nominal, from the supplied FRSim card; pipelined feeder transit preserves the single-lane rate while showing the ball path |
| Speed / acceleration | 14.4 ft/s (4.38912 m/s), 33 ft/s² (10.0584 m/s²), from the supplied FRSim card |
| Nominal empty push | 130 lbf (578.27 N); grip calibrated against the estimated 54 kg empty mass; payload and actual contact loads still affect traction |
| Moving-shot accuracy | Card rating 95%; motion-dependent launch-angle/wheel-speed uncertainty is scaled by 1/.95, with a 60 ms motion estimate. This is an interpretation of the rating, not a claim of a 95% hit rate across all distances and driving conditions. No forced misses or trajectory correction after release. |
| Passing reach | 32 ft (9.7536 m), checked from chassis center to the selected pass landing point; 2910 retains its 33 ft default |
| Mass/inertia | Estimates, not measured Kepler performance |
| Climb | Team confirms L1 in the [reveal discussion](https://www.chiefdelphi.com/t/orbit-1690-2026-robot-reveal-kepler/515277?page=2). Managed tower joint limited to .212 m lift; winch rate .30 m/s is a gameplay estimate. The original CAD sliding stage, triangular hook and carriage hardware are separated from their batched body meshes and animated vertically. A 300 mm stroke is a gameplay estimate; the support joint is not a detailed compliant contact model. |

Shift runs intake, Q reverses, Space aims/shoots/passes. Kepler can intake and shoot simultaneously. V toggles its carriage independently of shooting; cargo limits retraction, and intake/reverse requests extend it. Stored cargo uses local sphere physics with gravity, collisions and chassis inertia. The moving carriage wall pushes fuel into the remaining volume; positions are no longer locked to cargo slots. Eight preloads fit inside the stowed chassis envelope. The passive kicker remains down after subsequent carriage retractions. All actions use the existing rebindable keyboard/controller mappings.

C toggles the CAD hook stage up/down. Deploy it, approach beside your own tower along the low rung and stop with the hook aligned to engage. Toggle C to retract and winch into L1; toggle again to lower/release. The physical support joint holds through assessment. Kepler cannot reach L2/L3. This is a managed gameplay model using the original CAD geometry, not a detailed compliant hook or exact winch simulation.

## Validation

`src/sim/Kepler.test.ts` checks card-specific wheel acceleration, sustained speed and single-lane fire/intake throughput, nominal traction, capacity cutoff, per-robot passing limits, packing clearance/non-overlap, repeated switching and both alliances, inclined intake motion and passive-kicker reset, physical collection/reverse, simultaneous collection/shooting, offset muzzle rotation, stationary/moving physical hub hits, wider-chassis wall support, L1 scoring/assessment and lowering/release. The full-hopper moving/turning case requires at least 48 of 50 physical hub hits at the fixture’s modest translation and turn commands. That is a regression bound for that scenario, not a universal percentage guarantee. Regression tests also cover 2910, controls and match rules.



## Current player controls and cleanup

Stage 19.5 supersedes the earlier hold-to-climb description and 50 ms feed transit. C raises/lowers the hook; deploy, engage your tower, and toggle again to winch into L1. A further toggle lowers/releases. The converter separates nine original CAD solids into a sliding climber node; fixed rails remain on the chassis. Space compresses the intake as cargo empties; Shift/reverse extends it. The feeder is pipelined through floor/cross-feed/lift waypoints so original balls remain visible before physical launch. See [stage 19.5](STAGE_19_5.md) for limitations.

The user-supplied [reveal video](https://www.youtube.com/watch?v=yW90nd563wI) and photos clarified the climber location and vertical actuation. `scripts/rig-kepler-climber.mjs` identifies connected solids by measured bounds, preserving their geometry and materials. Runtime loading requires the articulated node so a stale static model fails visibly instead of silently ignoring C.
