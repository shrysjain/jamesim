# Shot uncertainty and fuller hoppers — November 2, 2026

The later [lineup performance audit](ROBOT_PERFORMANCE_RESEARCH.md) supersedes motion-quality/throughput estimates. Stationary spread profiles below are retained.

The owner requested less consistent shots for every robot, distinct accuracy between teams, visible rebounds and larger usable hoppers. These changes supersede the earlier nearly perfect hit-rate acceptance and the old 55/50 capacity caps. They do not change fuel size, mass, ownership, tick rate or scoring.

## Evidence and limits

- [FRSim REBUILT](https://rebuilt.frsim.com/) and the user's existing 2910/Kepler cards provide simulator targets. Kepler's 95% moving-shot rating remains a relative tuning input, not a forced 95% physical hit rate. Interactive cards for the other robots could not be independently read through the available text reader; their spreads remain estimates.
- [TBA 2910](https://www.thebluealliance.com/team/2910/2026), [1678](https://www.thebluealliance.com/team/1678/2026) and [1690](https://www.thebluealliance.com/team/1690/2026) were readable for season context; the [6328 request](https://www.thebluealliance.com/team/6328/2026) timed out. Alliance scores, win records and ranking points are not individual attempts-versus-makes measurements. No hit percentage is inferred from them.
- Statbotics team pages and `api.statbotics.io/v3/team_year/<team>/2026` were attempted but unavailable through the current tools (403/inaccessible). No EPA values or accuracy estimates are fabricated. EPA measures scoring contribution and would not, by itself, identify shooter accuracy.
- [Citrus's team description](https://www.citruscircuits.org/2026-robot) confirms the full-width shooter, roller sizes and shared vertical climber/hopper stage. [The team release discussion](https://www.chiefdelphi.com/t/1678-citrus-circuits-2026-cad-and-robot-code-release/521535?page=2) describes hybrid expansion/contraction controls and the effect of tunnel compression on consistency.

## Physical model

Each launch samples bounded, centered angle and wheel-slip variation with occasional broader tails. Per-robot profiles provide yaw/elevation standard deviations in radians, fractional speed spread, an imperfect-feed probability, and backspin. Translation and turning amplify uncertainty, with the existing moving-accuracy rating controlling motion sensitivity. These are gameplay estimates to review, not measured team statistics. The PRNG resets deterministically and is separate from feed/lane ordering.

The original fuel body receives the resulting velocity and spin once. No forced misses, corrected flights, hidden hit counter or post-release steering is used. Existing contacts determine rim/net clips, deflections and scores. Foam restitution varies deterministically by fuel ID within .38–.54 and survives reuse/reset; this is also a physical gameplay estimate, not a laboratory material measurement. Passing retains nominal clearance over nets with additional trajectory headroom for imperfect launches.

Issue #27 follow-up: the listed angle/slip profiles now use a .70 stationary multiplier through 3 m horizontal muzzle-to-target distance, increasing by .05 per meter to 1.05 at 10 m and beyond. Physical angular error already spreads landings with distance; this adds modest launch uncertainty for longer shots. Translation sensitivity is `(.08 + 1 - rating) × min(2, speed / 1.5)` times 8 for fixed shooters or 3 for turrets. Turning adds .20 per rad/s (capped at 1.2) for fixed shooters or .06 (capped at .3) for turrets. These motion terms add to a base multiplier of 1 before the distance multiplier is applied. Existing acceleration/velocity-estimation error remains separate. These are explicit gameplay fits to the requested behavior, not new measured team statistics or hit percentages. Per-robot profiles, ratings, tail probabilities, spin, firing envelopes and physical scores remain in force; even the highest rating retains motion uncertainty.

The current estimated profiles below are deliberately distinct. Angular values are radians; speed is a fractional standard deviation. Flyer probability describes the wider distribution component, **not** a probability of missing.

| Robot | Yaw | Elevation | Speed | Wider tail | Backspin rad/s |
| --- | --- | --- | --- | --- | --- |
| 2910 Re•Blitz | .026 | .030 | .030 | .08 | 30 |
| 1690 Kepler | .022 | .024 | .026 | .05 | 26 |
| 6328 Darwin | .032 | .034 | .035 | .10 | 32 |
| 1678 Limestone | .035 | .038 | .040 | .12 | 36 |

## Capacity

2910 increases from 55 to **65** and Kepler from 50 to **60**. Full-size, non-overlapping close-packed entry seeds use the existing measured hopper envelopes; the local sphere solver subsequently moves them. The fixed 2910 feeder pocket remains explicit. No decorative fuel or replacement ammunition is added. Other robots' final capacities and mechanism-specific behavior are documented in their own module notes.

Validation includes sample-distribution checks, original-body spin/rebound checks, physical full-hopper shots at different distances/motion, actual full-rate collection to the revised caps, containment/separation and fuel conservation. Hit-rate assertions are updated only where the requested uncertainty changes their intended meaning; mechanical readiness, collision blocking, passing feasibility and scoring/body conservation remain tested.
