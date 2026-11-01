# Re•Blitz asset and fit gate

Gate 1 is complete for review. Runtime uses the prepared Re•Blitz CAD and robot-specific collision geometry. Intake, ammunition, and shooting behavior belong to later gates.

## Source snapshot

The [team release](https://www.chiefdelphi.com/t/2910-cad-and-tech-binder-release-2026/521705) links the Re•Blitz assembly and technical binder. References are retained under `assets/source/robots/2910-reblitz/`, with URLs, checksums, and code revision in `sources.json`.

- CAD: document `dfb391aac173a4555d00a5b5`, workspace `3dc64f602735252892b0e47b`, top-level assembly `6c654da4eb6b1710fb0900bd`; public release branch.
- Technical binder: 13 pages, downloaded from the team release.
- Team code: commit `921c85bf725fbd9c488eb7d557e0e065640da095`. The reference code's MIT license is retained. This does not establish licensing for the CAD or binder.

## Confirmed architecture

| Assembly | Evidence | Import/animation requirement |
| --- | --- | --- |
| Drivebase | Binder p. 8: 27.5 × 27 in frame, Mk5n R1 modules, lowered frame, bellypan | Fixed frame/electronics; four steer and wheel-roll frames; fit bumper and bellypan proxies without sealing the intake route |
| Intake | Binder p. 9: front over-bumper slap-down, 2 in main roller plus two 1.25 in lower rollers | One deployment pivot; separate roller rotation groups; deployed rails and bash bar collide with the field |
| Hopper | Binder p. 11: translucent single-piece hopper, intake-driven initial deployment, sliding supports and deployed latch | Sliding hopper assembly with a one-way first deployment; transparent panels and visible carried fuel |
| Feeder | Binder p. 10: 15° inclined floor, ten 1.25 in rollers, compliant indexing roller | Fixed ball passage and rotating roller groups; four-wide feed abstraction in gate 2/3 |
| Shooter | Binder pp. 7, 10: four balls wide, 4 in drum, 6 in flywheel, adjustable hood | Fixed chassis heading; four release lanes; hood pivot, drums/flywheels and linked hood motion preserved |

The source CAD places the intake at source −Y and the shooter at source +Y. Runtime uses the shooter end as local +X, up as +Y, and source +X as local +Z. The transform is `(sourceY, sourceZ − 0.21665, sourceX)` in meters; the body reference rests at about 0.223 m above carpet. This corrects the ambiguous front/back wording in the binder. No scaling was applied.

## Reference numbers and confidence

- Team `ReBlitz.java`: wheel radius 2 in (0.0508 m), module center spacing 22.25 × 21.75 in (0.56515 × 0.55245 m), configured maximum drive speed 4.96 m/s. Confirm module positions against CAD. Comments referring to Mk4i gear ratios appear stale relative to the binder's Mk5n description.
- Team `Constants.java`: hood actuator range 0–37° and intake actuator range 0–114.3°. These are mechanism coordinates; they are **not** the projectile elevation or an established CAD pivot transform.
- Team `Constants.java` lists 35.625 in square bumper dimensions and 150 lb robot weight for simulation. Neither is accepted as a CAD measurement or weigh-in. Keep mass/inertia estimates explicit and reconcile the frame's unequal dimensions against the exported bumper geometry.
- Binder p. 10 reports sustained maximum throughput of 34 balls/s with a full hopper. Use as a future calibration reference, not a guarantee of every shot's feed interval.
- Binder requirements list storage targets, with grey entries explicitly marked unmet. Establish capacity from the actual hopper/validated packing before selecting a simulator capacity; do not turn an aspirational requirement into a measured specification.

## Acceptance before gate 2

1. Export and retain a complete assembly in an open format, including the intended configuration. No scaling to force a fit.
2. Identify stable moving subassembly names/IDs and preserve pivots, axes, roller groups and hopper travel in the prepared GLB.
3. Record measured bumper envelope, resting height, module locations, intake and hopper envelopes, hood travel and release positions. Mark estimates and unresolved source disagreements.
4. Load the optimized asset in the existing local game view. Expose assembly/pose inspection in Debug; keep the agreed follow camera.
5. Fit simple physical proxies with open fuel paths. Verify the relevant bump, trench and floor-ball cases after geometry changes, plus one browser visual check.

## Completed fit and checks

- Two complete, unmodified medium-resolution GLBs are retained: collecting and starting configurations. The source collecting file is 137,633,780 bytes; SHA-256 `f1b4e4b05d99ca56d675e119e185aaa7bedb825cb78d559b2d52c7f039f702f6`.
- Measured bumper envelope: **0.8509 × 0.85725 m**. Module centers: local X ±0.282575 m, Z ±0.276225 m. Physical bumper bottom is about 40 mm above carpet, spanning the fuel center; bellypan clearance is about 40 mm.
- Comparing transforms of independent matching parts in both exports establishes **0.29845 m hopper translation**, **114° intake rotation**, and an intake pivot at local `[-0.27305, -0.0467875, 0]`. The 114° CAD travel differs slightly from the software's 114.3° setting; use the CAD value for geometry.
- Both exports keep the same hood pose. The hood frame is centered on the drum axle at `[0.282575, 0.25325, 0]`; the inspection slider uses the software's 37° range. Converting actuator position to physical shot elevation remains gate 3 calibration.
- Runtime preserves intake, hopper, hood, four module forks/wheels, intake rollers, feeder rollers, hood rollers, drum and flywheel frames. Small hardware and CAD origin cubes are omitted. Surfaces are batched by mechanism and material, with geometric simplification and Meshopt compression. Translucent hopper panels and blue bumpers are render materials; originals remain intact.
- Compound proxies cover bumpers, bellypan, side structures, hopper panels, intake rails/bash bar, and the hood. They leave open upper ball passages. Ray tire support still owns floor contact; fuel-only wheel proxies avoid duplicate support. Bellypan friction is low to allow sliding over the bump. No artificial pose/velocity override is used while driving.
- Debug has three pose sliders. Pose changes update render geometry and physical proxies, including while paused. These are inspection tools; the hopper's one-way deployment behavior comes in gate 2.
- The focused driving suite passes **20 checks**, covering steering, speed/braking API, airborne behavior, fuel pushing, field walls/supports, both slow bump lanes on both alliances, full-input straight/angled bumps, and starting/collecting poses under all four trench arms. The full-input bump check permits 2.5 seconds to cross/land, accommodating speed loss from the lower CAD bellypan while retaining tilt/height bounds.
- Safari loaded the local game and verified the model, measured pose endpoints, and collider overlay. Production build passes. No broad performance claim is made from these smoke checks.

Capacity, fuel slots, muzzle release positions, intake throughput, flywheel response, payload inertia, and shot calibration are intentionally not fabricated from this asset gate. The empty 56 kg mass and inertia are retained simulation estimates; the 150 lb code constant is not a weigh-in. Gates 2/3 will establish the remaining gameplay quantities against this geometry.

Next gate: fuel ownership, intake, storage, and reverse. Do not start it until gate 1 review.
