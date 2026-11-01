# Stage 4 plan: one complete fuel-handling robot

Status: approved. Gates 1–4 are complete for review. See `REBLITZ_ASSET_GATE.md`, `INTAKE.md`, `SHOOTER.md`, and `PRACTICE.md` for the implemented geometry, mechanisms, checks, and calibration limits. One robot can now collect, carry, shoot/pass, register hub entries, return the same fuel, and repeat. Climbing remains separate. `MATCH.md` describes the subsequent solo timed fuel-match implementation and unimplemented competition rules.

## Robot choice and asset gate

Recommend **2910 Re•Blitz** as the first detailed robot. It provides a direct comparison with the FRSim robot used during development, plus a team-published CAD assembly, technical binder, and code reference:

- [Team CAD/binder release](https://www.chiefdelphi.com/t/2910-cad-and-tech-binder-release-2026/521705)
- [Re•Blitz Onshape CAD](https://2910.onshape.com/documents/dfb391aac173a4555d00a5b5/w/3dc64f602735252892b0e47b/e/6c654da4eb6b1710fb0900bd)
- [Team robot code](https://github.com/FRCTeam2910/2026CompetitionRobot-Public)

First prove export/import of that exact robot revision. Inventory the actual moving assemblies, shooter lanes, pivots, muzzle positions, intake mouth, and deployed/stowed envelopes. Establish mass, approximate inertia, capacity, mechanism limits, and throughput from the binder/CAD/video/code, labeling estimates. Do not infer shot performance from CAD alone.

If export or assembly cleanup is disproportionately costly, use the [WCP 2026 Competitive Concept](https://wcproducts.com/collections/viewall/products/2026-wcp-competitive-concept), which provides STEP, Onshape, BOM, code, and build documentation. Its [STEP archive](https://wcproducts.info/files/frc/cad/mcc/2026_WCP_CC.zip) is directly downloadable. The [REV Starter Bot](https://docs.revrobotics.com/frc-kickoff-concepts) is another documented swerve/intake/conveyor/shooter reference.

Keep source files in `assets/source/robots/`, prepared GLB and definitions in `public/assets/robots/`, and provenance alongside them. Preserve animated assemblies and pivot frames while removing hardware and batching static surfaces. Author simple compound colliders for the actual frame, bumpers, and moving structures. Retain open ball passages. Record redistribution terms before publishing derived assets. No runtime CAD parsing.

## Simulation model

Use physical external fuel, bounded internal transfer/storage, and physical projectiles. A stable fuel ID follows every ball through loose → transferring → stored → feeding → airborne → hub transit → loose. Every ID has exactly one owner/state, and each transition reuses the existing body rather than creating replacement ammunition.

### Intake

Deploy/retract at a finite rate. The intake has a physical envelope and a directional capture region at its actual rollers. Capture requires an active intake, a reachable ball, a valid relative approach, free capacity, and available transfer throughput. Check field/robot obstruction so collection cannot reach through a wall. Gather candidates during queries and commit transitions afterward.

Animate the transfer over the bumper into the hopper. During this controlled internal transfer, disable the loose rigid body and assign its ID to the robot. Full/off/reversing intakes produce the corresponding physical behavior; reverse releases held fuel through the intake at a bounded rate. Ordinary contact still pushes uncaptured balls.

### Hopper and feed

Maintain capacity, travel time, feed availability, and lane occupancy. Render stored balls in deterministic robot-local slots or packing, with the visible count matching inventory. Their loose physics bodies remain disabled while carried. Add their mass and approximate center-of-mass contribution to the robot once, avoiding double-counting disabled balls. Define spill/ejection behavior for overturning.

This first model does not solve every compressed foam ball between rollers. Detailed physical routing/deformation and emergent jams are a separate fidelity feature with a separate performance cost. Do not invent random jams as a substitute.

### Shooter

Model flywheel speed, spin-up, load/recovery after shots, feed rate, hood limits and slew, and all lanes present on the selected robot. Begin integration with one lane, then configure the complete mechanism. An empty/not-ready/blocked lane cannot release a shot.

Reactivate the same fuel body at the actual muzzle, outside the robot collider. Launch velocity includes chassis translation, angular point velocity (`ω × muzzle offset`), and exit velocity transformed by the full robot/hood orientation. Keep gravity, drag calibration, CCD, and physical field contacts after release. Optional dispersion must be small, explicit, and seeded.

Calibrate muzzle speed versus flywheel setting and hood angle using reference behavior plus range trials. An aim assist may select a physical hood/speed solution within mechanism limits; balls follow their launched trajectory. Start with stationary shots, then moving shots. A turret is implemented only if the selected robot has one.

### Hub and practice loop

Detect a valid downward passage inside the hub opening, with one event per ball entry. Add a clearly labeled practice hit counter and a return path through the field's outlet. Preserve fuel IDs during hub transit and recycling. Active/inactive hub scoring, match timers, and full rules remain the next stage.

## Code changes

| Area | Planned responsibility |
| --- | --- |
| `RobotDefinition.ts` + asset JSON | Dimensions, mass/inertia, collision shapes, mechanism pivots/limits, capacity, lanes, tuning, and provenance |
| `RobotSimulation.ts` | Own chassis + intake/hopper/shooter state; receive explicit driver commands; expose render snapshots |
| `FuelSystem.ts` | Stable IDs, ownership, body activation, capture/release, reset, and conservation |
| Mechanism modules | Fixed-tick actuation, transfer/feed timing, flywheel recovery, and launch calculation |
| `FieldSimulation.ts` | Pre-physics commands/forces and post-physics contact/capture/hub processing; retain shared headless execution |
| `SwerveChassis.ts` | Accept robot-specific geometry, module positions, mass/inertia, and payload changes instead of fixed prototype constants |
| `RobotView.ts` | Load the optimized robot, animate assemblies, and render carried fuel from simulation state |
| `FieldViewer.ts` | Input adapter, visual synchronization, and the existing follow/inspection cameras |
| `App.tsx` | Small fuel/readiness HUD; mechanism tuning and visualization in Debug |

The implemented fuel registry and renderer now track loose, airborne, robot-owned, and hub-transit states for all 504 reusable bodies. Keep physics and ownership out of React and the renderer. Use a small typed entity/state model; an ECS or multiplayer framework is unnecessary here.

Approved controls: WASD translates, J/L turns, **Shift held deploys and runs intake**, **Space held requests aim and shoot**, and **Q held reverses/ejects**. These replace the prototype's Shift precision and Space brake bindings as mechanisms are introduced. R respawns and V returns to the follow camera. Debug free flight may still use Q/E for camera elevation because robot input is disabled in that mode.

The shooter has no turret. While Space is held, a bounded chassis yaw controller must align the real robot before feeding. Inside its alliance zone, aim at its hub. Outside it, select the nearest reachable point inside the alliance zone for passing (slightly inset from the boundary to let the fuel land inside). Respect chassis turn rate, hood/flywheel readiness, blocked muzzles, and physical projectile trajectories. Re-evaluate aim as the robot moves and crosses the zone boundary; do not teleport heading or redirect launched balls. Driver translation remains available, while the aim controller owns yaw during the shot request. Releasing Space cancels the feed request. Define and verify the field's alliance-zone boundary against official geometry before implementing target selection.

World reset restores all fuel and clears inventory; robot-only respawn retains its held IDs. No free ammunition or silent deletion.

## Implementation order and focused checks

1. **Asset/definition proof:** import the chosen robot, preserve moving assemblies, fit physical proxies, and verify stowed/deployed clearances on bumps and under trenches. Recalibrate the chassis for its actual dimensions and payload.
2. **Fuel ownership + intake/storage:** collect visibly, enforce capacity and transfer rate, reverse/eject, and reset cleanly.
3. **Shooter bench:** one physical launch, then repeated feeds, recovery, hood settings, complete lanes, and stationary/moving range checks.
4. **Continuous practice:** real hub entry detection and return; drive–collect–carry–shoot–repeat using the normal play view.

Verify the changed behavior at each gate: conservation, capture boundaries/obstruction, full/empty handling, launch transforms/CCD, exactly-once hub entry, and a few end-to-end browser cycles. Run relevant terrain/drive checks when robot geometry or payload changes. Profile a loaded robot shooting into the full field once the cycle works. Avoid rerunning unrelated checks for cosmetic edits.

Climbing, match rules, more robots, and multiplayer stay separate. This delivers a complete fuel-handling robot; climbing remains its own part of the broader complete-robot milestone.
