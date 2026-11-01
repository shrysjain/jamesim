# Gate 4: continuous hub practice

The normal play view now shows separate blue/red **Practice hits**. A hit means a physical fuel ball crossed downward through that hub's entry gate. Launches remain a separate Debug counter. This practice counter remains independent of timed-match fuel points; stage 5 adds match timing, shifting hubs, processing-window scoring and results in a separate mode (`MATCH.md`). Fouls, legal shooting-zone enforcement, and climbing remain unimplemented.

After a confirmed entry, the same fuel ID and rigid body enter managed hub transit, then return to ordinary physics through a neutral-facing outlet. Returned balls can be collected and shot again. No replacement ammunition is created. R retains hits, cargo, loose fuel, and hub queues; Reset world restores every original fuel pose and clears hits, transit, and mechanism state. Pause freezes transit and outlet cooldowns with the rest of the simulation.

## Entry geometry and detection

The [official TU22 manual](https://firstfrc.blob.core.windows.net/frc2026/Manual/2026GameManual.pdf), §5.4, describes the hexagonal mouth, 72-inch lip height, and four neutral-facing exits. Exact practice geometry was checked against the retained official CAD tessellation:

- GE-26329 funnel lip: Y = 1.8288 m; inner flat-side half-width approximately 0.52628 m.
- Funnel centers: X = ±3.6449 m, Z = 0. This corrects the prior aim-center estimate by 15.875 mm; the shooter now uses the measured funnel center.
- GE-264 counter/deflector assembly: central lanes at Z = ±0.13375 m; outer handoffs flare to Z = ±0.48 m around the ball deflectors. Sphere-clear exit paths are near Y = 0.87 m, on the neutral side of each hub. The internal counter rollers and ball compression remain managed.

`src/field/hubs.ts` holds the geometry. Six half-plane tests form the hexagon; each is inset by the 75 mm ball radius plus a 2 mm margin. A rectangular or circular bounding check would accept some rim/corner misses incorrectly.

`HubSystem` snapshots enabled, unowned fuel positions immediately before each 120 Hz physics step. After physics, a downward segment crossing the lip plane is interpolated to find its actual crossing point. Only a crossing inside the inset hexagon is accepted. Upward crossings, lateral arrivals below the lip, and near misses do not increment the counter. Fast shots are checked along the segment, not just at the final position. Loose balls and airborne shots can both enter; the orange inspection probe cannot.

On acceptance, ownership becomes `hub-blue` or `hub-red`, state becomes `hubTransit`, and the existing body is disabled. This makes an entry exactly once during that transit. After return, a later genuine entry by that same ID can count again. The hit log is bounded to the most recent 64 entries. No hit is inferred from Space, an aim solution, a launch, or proximity to the hub.

This gate is a conservative rigid-sphere practice approximation. It does not reproduce official fuel-counter sensing, foam deformation, or every lip-roll/rebound case. Shots contact the physical funnel/net before entry; accepted entries then move into the managed internal model.

## Transit, outlets, and conservation

Transit takes at least 0.65 simulated seconds. The visible ball moves below the funnel into the covered interior; a waiting ball remains inside the hub. The queue has only existing fuel IDs, bounded by the field supply. Its disabled bodies cannot collide with or add mass to the robot.

A seeded, repeatable selection prefers one of four outlet lanes and tries the remaining lanes when necessary. Each outlet is capped at eight releases/s. The shared per-tick obstruction result prevents a large blocked queue from repeating the same expensive checks for every ball.

Before return, a sphere sweep checks the sphere-clear outlet path and an overlap query checks the release position. Both include the field, robots, and other loose balls. Occupied or blocked outlets retain the ID in transit and retry; they do not force a ball into geometry or silently delete it. The managed-to-physical handoff is beyond the counter rollers, with the outer lanes beyond their flared deflectors. Existing field colliders are unchanged.

Release re-enables the same body at the outlet with a bounded neutral-directed velocity and a small seeded fan/spread. Its normal gravity, damping, CCD, and collisions then govern motion. Transit delay, release speed/spread, and outlet cadence are explicit simulator fits rather than measured hardware throughput. Recapture cooldown is the same 0.4 seconds used for other releases.

The fuel invariant is:

`loose + airborne + transferring + stored + feeding + hubTransit = original fuel count`

Only robot-owned states contribute to payload. Rendering uses robot-local coordinates for carried fuel, world coordinates for hub transit, and body transforms for enabled fuel. There remains one rendered instance and one reusable rigid body per ID.

## UI and focused verification

The main screen keeps the third-person camera and compact practice hit counter. Debug shows hits/returned per hub, queued fuel, blocked exits, and total fuel including transit. Collider view also draws the actual inset entry hexagons and outlet handoff paths. Closing Debug restores the normal play view.

Eight focused hub tests cover the six mouth edges, both alliances, exactly-once entry and same-body returns, upward/side/rim rejection, fast crossing interpolation, blocked outlet retention, burst cadence/no overlap, pause/respawn/reset with seeded repeatability, and an official-field shoot–return–recollect–shoot cycle using the same IDs. All 53 field/drive/intake/shooter/hub checks pass, as does the production build.

In the local browser, collecting 11 fuel, respawning with cargo, and shooting produced 11 blue hits and 11 physical returns. Debug ended with 504 loose fuel and zero transit. The normal counter and debug toggle were verified; `gate-4-browser.jpg` records the final main view.

Run `pnpm benchmark:practice` for the full 504-fuel field sample. It collected 24 IDs, launched all 24 through all four lanes, counted 24 hits, returned all 24, and ended with 504 loose, no cargo/transit, and 56 kg empty robot mass. `practice-baseline.json` records the local headless timings. These measure simulation work, not rendering or a cross-browser frame-rate guarantee.
