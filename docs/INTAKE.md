# Jamesim gate 2: intake, storage, reverse

Gate 2 adds working fuel handling to the Re•Blitz chassis. Gate 3 now supplies shooting and automatic aiming; see `SHOOTER.md`. Gate 4 now supplies hub entry detection and returns; see `PRACTICE.md`.

## Controls and play behavior

- WASD translates field-relative; J/L turns. The intake faces the neutral zone at spawn, so W approaches fuel intake-first. Robot-relative mode remains available in Debug.
- Both assemblies begin in, then passively snap out together over 0.18 seconds when the simulation starts. The hopper stays out.
- Shift runs the intake rollers. Releasing it stops collection without retracting anything.
- While Space is held, the intake retracts over up to 0.45 seconds as cargo space becomes available, pushing stored fuel toward the feeder. The hopper does not retract. Releasing Space pops the intake back out without requiring Shift.
- Q takes priority over Shift, deploys the intake, reverses reachable loose fuel, and ejects carried fuel. Reverse does not capture.
- R repositions the robot and retains every held fuel ID. World reset restores all original loose balls and clears mechanisms/payload. Pause, loss of focus, help, and free flight clear held commands. Simulation time, transfer, and actuation stop while paused.
- Debug pose preview suspends capture/ejection. Shift/Q, Resume mechanisms, or closing Debug returns to normal actuation.

The HUD reports inventory, loaded mass, and mechanism state. The project/tab/header are named Jamesim. White team-number decals sit on all four bumper faces. The robot CAD's embedded `Fuel` body is excluded during offline preparation; the game starts with an empty robot and the same 504 field balls.

## Ownership and rendering

`FuelSystem` owns stable IDs and reusable Rapier bodies. State is loose → transferring → stored → loose. Loose fuel has an enabled physical body. Carried fuel has one robot owner and a disabled loose body. The single fuel instance batch renders either the loose body's transform or the owned robot-local position, so there is one visible instance per ID.

`RobotSimulation` orchestrates finite actuation, collection, managed transfer, slots, release, and payload. It runs with the chassis at the fixed 120 Hz timestep, independent of React or frame rate. The renderer animates the prepared rollers from simulation phase.

Capture requires active, nearly deployed intake/hopper, free capacity, available throughput, an upright enough robot, and a ball in the roller's bounded approach region. Rapidly departing fuel is rejected. A swept 55 mm sphere checks the field between the ball and the intake mouth; the carpet is excluded from this obstruction check so resting floor balls can be collected. Walls and barriers block capture. Candidates are gathered before ownership changes are committed.

Transfer follows a 0.3 second controlled path over the bumper into a free slot. It reserves capacity immediately. This is a managed internal model rather than a compressed-foam solver. No random jams are invented.

## Storage and dynamics

Capacity is **55 fuel**, following the supplied FRSim reference: 54 non-overlapping spheres in three staggered close-packed layers plus one fixed feeder pocket. The packing uses 151 mm spacing for 150 mm balls. The feeder pocket is consumed first; the remaining cargo shifts toward the shooter with intake compression. Eight or fewer balls permit full compression; above eight, the required extension increases linearly to full at 55. Collection is capped at 50 balls/s and reverse at 12 balls/s. These are gameplay targets rather than measured hardware claims.

Each carried ball adds 0.215 kg once, including while transferring. The chassis receives the combined center of mass and an approximate diagonal inertia, including sphere inertia and parallel-axis contributions. Motor force tuning remains based on the empty robot rather than granting extra motor power for payload. Capturing applies relative momentum at the capture point; ejection inherits chassis point velocity and applies the outward reaction impulse. The empty mass/inertia and tire response retain the explicit gate 1 estimates.

Reverse releases the original body outside the deployed intake, with inherited chassis motion and a bounded outward velocity. Field-path and overlap checks prevent release into a wall, robot collider, floor, or another loose ball. A blocked outlet retains ownership and displays Outlet blocked until clearance returns. Released IDs have a brief recapture cooldown.

A defensive recovery path still spills cargo after an externally imposed overturn lasting more than 0.25 seconds (robot up vector Y below 0.4), cargo spills through the same clear outlet at a bounded rate. A blocked outlet still retains fuel. This preserves ownership and avoids spawning overlapping spheres; it does not model every way foam might escape a real overturned hopper.

## Verification

The 26 existing field/drive checks pass with the mechanism controller integrated. Nine focused gate 2 checks cover:

- Empty startup, finite deployment, visible transfer state, and the hopper latch.
- Inactive/paused, out-of-reach, lateral, elevated, and departing-ball rejection.
- Capacity, slot spacing/envelope, stable IDs/body handles, and payload mass.
- Reverse priority, loose-ball roller impulses, physical ejection, and payload removal.
- Capture behind a barrier and retained cargo at a blocked outlet.
- Paused transfer, robot-only respawn retaining IDs, and world reset.
- Overturn release without deleting fuel.
- A full hopper through the trench and over the bump.

Type checking and the production build pass. The browser play-through collected and ejected 27 balls while preserving all 504 field IDs; details are recorded in `VERIFICATION.md`. No full-match scoring or shooting behavior is implied by gate 2.

Current gameplay tuning and verification supersede the original gate results below: see `GAMEPLAY_TUNING.md` and the latest `VERIFICATION.md` entry. Normal driving now locks pitch and roll.
