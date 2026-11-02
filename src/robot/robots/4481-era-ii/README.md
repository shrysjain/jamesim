# 4481 Team Rembrandts — Era II (2026 Worlds)

**Status: researched; awaiting usable CAD geometry. Not selectable or playable yet.**

The user's exact [Onshape document, workspace and element](https://cad.onshape.com/documents/af9429d854eeaa98a1b3eeda/w/2554bb5ba18919b03a73491d/e/0bdb27080b01fd9a708ccf46) matches the **Worlds Robot** link in the team's [official CAD release, post 521](https://www.chiefdelphi.com/t/frc-4481-team-rembrandts-2026-build-thread-open-alliance/507296?page=26). This is Era II, not the earlier Regionals Era. The Blue Alliance lists the imported source as `TR26-00-1000_4481_Robot Worlds.x_t` on its [2026 team page](https://www.thebluealliance.com/team/4481/2026).

Branch: `robot/4481-era-ii`, from `origin/main` `0d64cbb`. Follow `ROBOT_AUTHORING.md` when completing the implementation.

## Geometry access and next input

The official [GrabCAD Worlds release](https://grabcad.com/library/era-v2-first-robotics-competition-rebuilt-2026-1) and its files page return HTTP 403 through the connected reader. Onshape exposes no geometry through that reader, and the execution environment's restricted network policy does not permit Onshape downloads. No network restriction was bypassed. These failures do not establish that the owner disabled export.

The team's official public 2026 code repository has no geometry assets at pinned commit `e00d344b705b5e272229ba6ca5b6de26d93337af`. Searches of public release/export records did not yield a matching downloadable mesh. The Regionals model is a different variant and must not substitute for this request.

Needed: an owner-supplied **GLB or STEP export of this Worlds assembly**, ideally retaining individual parts/assemblies and names. Compress it as 7z if necessary for transfer. An accessible direct geometry download is also suitable. Parasolid `.x_t` is the published original, but the repository's OCCT importer does not directly accept that format; export STEP or GLB through CAD software.

No runtime manifest, placeholder model, registry entry, guessed colliders or invented mass/capacity have been added. `sources.json` truthfully records geometry as unavailable and retains pending redistribution status.

## Verified mechanism evidence

Team posts 513, 514, 519 and 520 on the linked release page distinguish Era II's spring-deployed linear intake from the older four-bar, describe the rotating disk indexer and separate tower/kicker, and identify the revised flywheel/hood on the retained turret. The intake remains out passively. Model geometry must determine actual pivots, travel, hopper bounds and all moving solids before declaring capabilities.

These source facts guide implementation; they do not establish a measured simulator capacity, BPS or accuracy percentage. A climber's presence/absence must be determined from the full CAD rather than assumed from incomplete photos or the code tree.

## Pinned team-code settings to cross-check against CAD

The team's [official 2026 source](https://github.com/FRC-4481-Team-Rembrandts/2026-robot-public/tree/e00d344b705b5e272229ba6ca5b6de26d93337af), pinned July 15, contains the following settings. These are team-code values, not independently measured CAD dimensions. Source paths, hashes and the original coordinate convention are retained in `assets/robots/4481-era-ii/sources.json` and the local ignored source directory.

| File | Evidence | Implementation consequence |
| --- | --- | --- |
| `SwerveDriveConstants.java` | 5.8 m/s maximum, 9.4 m/s² maximum acceleration, .546 m track/wheelbase, nominal 4-inch wheel diameter | CAD must confirm module centers and bumper envelope; preserve rigid wheel mounts and shared ground support. |
| `SwerveDriveConstants.java` | Shooting while moving: 1.7 m/s / 1 rad/s; feeding: 3 m/s / 3 rad/s | Motion limits differ by firing mode. Evaluate a small optional per-robot contract, with unchanged defaults for existing robots. |
| `TurretConstants.java` | 370° total range, operational limits approximately ±182.8°; WPILib offset (−.150, −.150, .39615) m; robot zero offset 180° | Requires actual CAD frame alignment and finite turret range. Current unrestricted turret behavior must not silently pretend to implement the cable limit. |
| `HoodConstants.java` | Signed mechanism angles −75° to −49°, 10/154 × 1/5.25 gearing | Determine the physical launch-angle mapping from CAD and team shot table before setting simulator limits. |
| `ShooterConstants.java` | Hub table covers 1.5–5.7 m plus a 10 m entry; feeding table covers 1.1–10 m | Use as calibration evidence, preserving physical projectile flight and original fuel IDs. |
| `ExitVelocityConstants.java` | Empirical speed table and .905 factor; e.g. 4500 RPM corresponds to 8.132 × .905 m/s | Do not equate theoretical wheel speed to real fuel exit speed. |
| `FlywheelConstants.java` | 1.6 velocity conversion factor, a field named `FLYWHEEL_RADIUS` set to 4 inches | Verify dimensional meaning against CAD; this label alone cannot establish the physical tread radius. |
| `WasmachineConstants.java` | 1/8.57 output ratio | Separate actual rotating disk from fixed cone/walls, using an axis-Y feeder spin binding if CAD confirms. |
| `IntakeConstants.java` | .52 collection motor command, −1 outtake command | These are motor demands, not fuel/s throughput measurements or intake travel dimensions. |

## Completion and review checklist

1. Hash and inspect the full uploaded geometry; remove embedded game pieces and hardware while preserving recognizable CAD. Fit the neutral frame, modules, actual intake/hood/turret pivots and disk axes once.
2. Supply definition-owned SI colliders, hopper volume and non-overlapping full-size cargo seeds. Estimate mass/inertia and unsourced rates explicitly. Preserve local hopper dynamics and the original field fuel bodies.
3. Extend only necessary optional mechanism contracts (finite turret travel/motion limits or actual intake linkage), with regression coverage. Confirm support for any climber before exposing controls.
4. Prepare an embedded Meshopt GLB within 6 MiB / 650,000 triangles / 160 primitives, write real bytes/hash in this robot's runtime record, then add one registry import/entry. Preserve attribution and pending CAD review.
5. Run branch guard, robot acceptance, full simulation and release checks. Review both alliances, CAD poses, full hopper, collection/reverse, stationary/moving shots, passing, walls/bumps/trenches and restart in an isolated local browser.
6. Disclose every shared file touched and likely overlaps with the other robot branches. Never push this contribution into main or merge its PR.

## Validation and integration scope of this research commit

The numeric-team branch guard passes. Source metadata is parsed and hashed; the exact Onshape link is verified against the team's Worlds release. This commit adds only this README and the team-owned `sources.json`; it does not change runtime code, selectors, asset discovery, build limits, controls or common manifests. No gameplay/browser or release-build success is claimed for an unimplemented robot. There is no runtime asset to validate yet.
