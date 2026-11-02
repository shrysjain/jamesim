# 1114 Simbotics · Simbot Tim (2026 REBUILT)

Research branch: `robot/1114-simbot-tim`, based on `origin/main` at
`0d64cbb2f910285ccd7ac9ac747a3e21d4b861a5`.

Status: awaiting a complete CAD export. This folder contains research notes only.
There is no definition/class, registry entry, runtime record or playable robot yet.

## Exact requested reference

[User-selected Onshape assembly](https://cad.onshape.com/documents/7959d159451177786d52dd9a/w/535bc31b66b0cc442967f1d0/e/a263c1a625ed8cf2484ae82f)
is exactly the CAD link in the [official Team 1114 release](https://www.chiefdelphi.com/t/team-1114-simbotics-2026-simbot-tim-cad-release/522887).
The [official robot page](https://www.simbotics.org/robots/2026-tim/) corroborates
both season and name. The URL is a mutable workspace reference; an immutable
CAD revision and input hash must be recorded once the export is obtained.

This session can resolve the link from the team's release, but cannot read the
CAD viewer body or obtain its complete geometry. That does **not** establish that
the owner disabled exports. A complete STEP or GLB with assembly structure is
needed to measure and animate the robot accurately.

## Primary mechanism evidence

The team describes a wide fixed shooter and adjustable hood, an extending intake,
rolling hopper surfaces and side rollers. The final competition robot did not
carry the climber: it was removed for weight before the first event and remained
off. A historical climber visible in CAD must not automatically enable climbing.
The release's roller discussion distinguishes the driven lower wall roller from
the upper passive rollers; these must not all receive the same animation.
The team's accuracy claims are contextual observations, not a guaranteed simulator
hit rate.

The official [public robot code](https://github.com/Simbotics/2026-Simbot-Tim/tree/b02f50832cc0ca7694798f61d41cf230edfd62b8)
is pinned at `b02f50832cc0ca7694798f61d41cf230edfd62b8`.
Selected source files, exact bytes and SHA-256 hashes are recorded in
`assets/robots/1114-simbot-tim/sources.json`. Raw inputs remain under the ignored
`assets/source/robots/1114-simbot-tim/` directory. Code rights do not establish CAD
redistribution rights.

## Verified code configuration, awaiting CAD comparison

| Parameter | Source setting | Meaning/limit |
| --- | --- | --- |
| Bumper length/width | 0.76 / 0.92 m | `RobotConstants`; not independently measured CAD dimensions |
| Module positions | X ±9.75 in, Y ±12.5 in | WPILib axes; map to Jamesim only after verifying forward direction |
| Wheel radius | 2 in (0.0508 m) | CTRE tuner configuration |
| Speed at 12 V | 4.02 m/s | Tuner setting, not a benchmark claim |
| Hood limits | 42–74° | Source soft bounds; zero angle 74.484° |
| Intake drop/raise | 13.55 / 6.4 in | Source slide setpoints; difference 0.18161 m, not yet confirmed final stroke |

`AgitateIntake` actively pulls inward after 650 ms of ready shooting and restores
the drop setpoint when shooting ends. Older multi-state oscillation code is
commented out; it must not be presented as the active control policy.
`ShootMoveLUT.calculate` currently returns the distance-only lookup before the
commented velocity/latency predictor. Its name is not evidence that the released
robot code actively compensates for movement. Hood code limits and tuned lookup
entries also differ slightly (the nearest hub entries use 74.4°); retain that
source discrepancy until CAD and intended gameplay limits are resolved.

## Geometry investigation

The official code repository contains no complete CAD/mesh file. The official
`Simbotics/Simbotics-Assets-Website` tree at
`c9f1fe565a2f61725f4cbcca30578edc83da27df` contains historical PDF boards/resources
and videos, without a 2026 robot model.

A published [derivative mesh](https://github.com/ryanabraham1/frc-3d-sim/blob/1af807d17dcbf012c5810cc3fc7b1fa731ec5b74/public/models/robots/2026/simbot-tim-1114.glb)
was inspected as a possible input. Its [source documentation](https://github.com/ryanabraham1/frc-3d-sim/blob/1af807d17dcbf012c5810cc3fc7b1fa731ec5b74/docs/ROBOT-CAD-IMPORTS.md)
explicitly identifies only the `S26-IN-A200` intake/hopper from `S26-A000.glb`.
It replaces the absent chassis and shooter with procedural geometry. Therefore
this cannot fulfill the complete CAD-backed robot requirement. The 571,316-byte
partial mesh (SHA-256
`aa2745c28e27df4c10b5c478876975311bf136123d45ff498a7a3f1f8141a759`)
is retained only as an ignored research input; no simulator implementation or
procedural substitute was imported.

## Completion and validation

Once a complete export is available: pin and hash it, inspect all bodies, remove
embedded fuel, measure chassis/bumper/module and hopper bounds, locate real
roller axes, hood pivot and slide travel, prepare articulated geometry, author
explicit SI configuration and fuel seeds, and add the single registry entry.
The capacity, mass/inertia, shooter geometry, feed lanes/rates, scatter and actual
moving-shot support remain unmeasured and must not be filled with copied robot
settings. Keep mechanisms within the shared simulation contract and disclose any
small optional extension rather than forking the engine.

`pnpm robot:branch --team=1114` passed. No simulation, release-build or browser
validation is claimed: no playable integration has been made. The branch changes
only these source notes and source records, with no shared interface edits.
