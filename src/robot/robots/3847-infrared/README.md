# 3847 Spectrum — Infrared, 2026 Final Machine

The contributor explicitly selected **FM (Final Machine)** rather than PM on November 2, 2026. The original reference is [this Onshape document/tab](https://cad.onshape.com/documents/363f51f69b0f6094e6657347/w/2da37c11ab641d1d095c37e0/e/3373ed9eb771d6e08a7d8782). Spectrum's [2026 season page](https://spectrum3847.org/seasons/2026/) identifies this document with Infrared. Direct access to that particular element was unavailable; it is **not claimed to be an exact element match**. Instead, this contribution uses Spectrum's own explicitly labeled Final Machine exports, approved by the contributor.

## Reproducible CAD

Official [2026-Spectrum Robot_FM exports](https://github.com/Spectrum3847/2026-Spectrum/tree/8be90a6c1044d9433f6f7ade9dd0857871f7579b/advantagescope-custom-assets/Robot_FM), commit `8be90a6c1044d9433f6f7ade9dd0857871f7579b`: `model.glb` is the chassis, `model_0.glb` the intake carriage, and `model_1.glb` the hood. Sources/hashes are in `assets/robots/3847-infrared/sources.json`. Keep these inputs in ignored `assets/source/robots/3847-infrared/`; run:

```sh
node src/robot/robots/3847-infrared/prepare.mjs
```

The converter verifies every input hash, bakes world matrices once, removes origin cubes/small hardware and identical duplicate occurrences (the source repeats several motors). It retains actual frame, bumpers, wheels, forks, hopper panels, carriage, feeder and hood geometry. Material batching, simplification and Meshopt stay within unchanged shared budgets. No decorative fuel or substituted mechanism meshes are added. The original Y-up assembly has intake toward +Z; a −90° Y rotation maps it to simulator −X. The reference is .223 m above carpet. Module axles normalize to +Z once. The runtime retains full collision support; swerve mounts are rigid, with numerical terrain support rather than hardware suspension.

## Supported behavior and controls

WASD drives, J/L turns, Shift collects, Q reverses, Space aligns/shoots/passes, V toggles the carriage, and R restarts. Both alliances recolor the actual bumper fabric. The selector discovers the definition through its registry entry.

The 12-inch carriage deploys automatically; its hopper front and actual roller move together. Shooting compresses it as cargo clears, while intake/reverse extends it. V retraction is constrained by occupied volume. The fixed hopper and published roller bed stay attached to the frame, matching the team's component export split. The real CAD hood rotates about its axle; the shooter remains chassis-aimed. There is no turret or climber in this complete FM export; early-season XM turret/climb plans are not advertised as FM capabilities.

Original fuel IDs travel through the bed and vertical feeder into two lanes before physical release. Seed positions initialize local sphere dynamics rather than pinning balls. Payload is counted once. Moving shooting compensates chassis velocity but includes seeded angle, speed and spin uncertainty; rim contacts and misses remain physical. No post-launch guidance or forced hit/miss selection.

## Measurements, estimates and limits

- CAD bumper envelope: approximately .83089 m long × .8395 m wide; modules ±.276225 m; actual nominal 4-inch wheels (.0508 m radius).
- [SwerveConfig.java](https://github.com/Spectrum3847/2026-Spectrum/blob/8be90a6c1044d9433f6f7ade9dd0857871f7579b/src/main/java/frc/robot/subsystems/swerve/SwerveConfig.java): 21.75-inch track/wheelbase and theoretical 5.12 m/s. The physical CAD wheel radius is used instead of code's wear-adjusted 1.964-inch radius. Acceleration 10 m/s² and grip 1.05 are gameplay estimates.
- [RobotSim.java](https://github.com/Spectrum3847/2026-Spectrum/blob/8be90a6c1044d9433f6f7ade9dd0857871f7579b/src/main/java/frc/robot/RobotSim.java): 12-inch intake translation, hood pivot at −11 inches / 19.237 inches high in WPILib coordinates, and two lanes ±5.5 inches. This is dimensional evidence; no upstream simulation implementation was copied.
- [Hood.java](https://github.com/Spectrum3847/2026-Spectrum/blob/8be90a6c1044d9433f6f7ade9dd0857871f7579b/src/main/java/frc/robot/subsystems/hood/Hood.java): .024–.137 mechanism turns. Using the team's complementary-angle convention gives roughly 81°–40.68° launch elevation. The neutral CAD hood is 9°; guide clearance .17 m is a fitted exit envelope, not a measured trajectory calibration.
- Flywheel axle (.2723, .4888, 0 world height) and .0389 m tread radius are CAD fits. Feed waypoints fit the hopper-facing side of the vertical rollers; flexible fuel compression and individual feeder roller contacts remain managed handoffs.
- Empty mass 58 kg and inertia [3.3, 6.0, 3.7] kg·m² are estimates. Capacity **32** is a conservative two-layer fit of full-sized non-overlapping fuel in the retained envelope, not a claimed team spec. The simplified sloped floor interpolates the roller bed; no soft fabric/contact simulation.
- Intake 35 fuel/s, nominal combined firing 15 fuel/s, 9 m passing, .8 m additional landing inset (clearance for uncertain high passes across the hub), and moving rating .87 are estimates pending a team performance card/calibration. Angle deviations .029/.034 rad, speed deviation .035 and .10 flyer probability are gameplay uncertainty parameters, not measured accuracy percentages. The rating controls sensitivity to motion, never guaranteed hits.
- No L2/L3 climbing support. No exact dynamic rack-to-rollerbed linkage or individual flexible belt animation. The official assembly contains no declared climbing component. CAD redistribution review remains pending under the owner's existing noncommercial v1 publication authorization.

## Shared integration points

Based on `origin/main` `0d64cbb`. No dependency on another robot branch. `registry.ts` adds one import/entry; `App.tsx` updates capability-based controls help and the Spectrum CAD credit. Build/allowlists/common manifest remain unchanged. `types.ts` and `validateDefinition.ts` add optional shot-spread and pass landing inset configuration. `Shooter.ts` uses these only when explicitly supplied, with `ShotScatter.ts` providing deterministic launch sampling; legacy robots keep their existing release behavior. The own-project rigid-swerve follow-up touches `defaults.ts`, `SwerveChassis.ts`, `Shooter.ts`, `RobotView.ts`, their regression cases and `docs/GAMEPLAY_TUNING.md`. The existing wall-contact follow-up uses low friction with the minimum combine rule so frame rails can slide along field walls; `WallContact.test.ts` checks empty/loaded contacts and both perimeter sides for every registered robot. Attribution is in `THIRD_PARTY_NOTICES.md`.

These shared files overlap Matterhorn/Darwin/Citrus integration work; consolidate identical shared changes rather than replacing current files with this branch's base versions. Registry entries must all be retained. New team-owned files and manifest/model are independent. No shared asset budget, match rule, camera, controls, fuel weight or hosting changes.

## Validation

- `pnpm test:robots`: 25 tests / 6 files passed.
- `pnpm test:sim`: 169 tests / 27 files passed.
- Final affected checks after CAD deduplication and wall-contact refinement: 29 tests / 4 files passed (team, all-robot wall contact, rigid support and prepared assets).
- `pnpm build:release`: integrity, TypeScript/Vite and production payload checks passed; 12 runtime assets. Existing Rapier chunk advisory remains.
- Prepared CAD: 3,497,108 bytes, 564,873 triangles, 138 primitives; all within the existing budgets. Input reduction retained 486 mesh occurrences, removed 256 hardware/origin occurrences and 15 exact geometry/transform duplicates.
- Focused isolated Chromium/WebGL review: stowed, intermediate carriage/hood, deployed red, full blue; no page errors. A final render uses the corrected geometry-hash deduplication output. The CAD's opaque hopper panels naturally obscure much of the stored fuel. The actual app flow also passed: select Spectrum, choose red, start a match, open Controls; WASD/J/L/Shift/Space/Q/V labels and capability-specific help were visible, with no page errors.

Local `.tools/` logs/screenshots are ignored QA artifacts. Team tests exercise full-size packing, deploy/compression, both-alliance physical hub entry, full-cap collection/firing with stable bodies, passing and loaded wall support. Shared acceptance additionally checks pause/reset, both alliances and conservation; prepared assets check semantic nodes, embedded resources and budgets. Production integrity/build/payload checks and a focused isolated WebGL pose review are required before publication.
