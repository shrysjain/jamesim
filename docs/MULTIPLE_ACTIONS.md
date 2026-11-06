# Concurrent robot actions

Issue #7 is checked across all 11 registered robots, both alliances and both
selectable Icarus mouths. This includes the temporarily hidden Prismarine;
selection visibility is unchanged.

Drive translation, manual turning and mechanism requests are independent.
WASD + J/L + Shift + Space can remain held together. A manual turn command takes
priority over fixed-shooter chassis alignment, while the shooter continues
solving, spinning up and adjusting its hood. Releasing turn restores alignment
without requiring a new Space press. Turrets retain independent tracking.

Shift + Space keeps the selected intake extended and captures original loose
fuel while aiming/feeding/firing. This branch builds on #41's Re•Blitz capability
correction; the remaining roster already opts into simultaneous collection.
Driving does not cancel intake or the shooting request. Each robot's existing
hub/pass motion envelope, physical aim, spin-up, exit clearance and fuel limits
still decide whether a ball may launch. Re•Blitz, Simbot Tim and Downpour retain
their stationary-only hub firing; eligible robots retain moving releases.

Reverse takes priority over intake and shooting because the same roller cannot
run in both directions. It stops collection/firing and ejects through the selected
mouth while leaving driving available. Icarus still opens one side at a time and
refuses a side switch above eight fuel. Climb attachment, trench protection,
pause, disabled periods and match cutoffs retain their existing interlocks.

`AllRobotActions.test.ts` exercises 96 physical cases: concurrent capture/firing,
moving capture and supported releases, stationary-only release after stopping,
manual turn in both directions followed by aim recovery, reverse priority,
pause/disabled behavior, original fuel-record/body identity and payload mass.
Keyboard and simulated controller combinations are checked by `controls.test.ts`.
These tests retain real mechanism definitions and moving-shot restrictions;
they do not replace robots with permissive test definitions or create ammo.

The additional production change is limited to the shared shooter yaw arbitration.
No CAD, capacities, rates, shot spread, drive tuning, bindings or UI are changed.
