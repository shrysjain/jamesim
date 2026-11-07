# Tower recovery verification

The visible black backing was removed in #39. Physical navigation fixes restore
the actual concave floor-level weldment (#46) and correct Downpour's numerical
ground-support setting (#52). This follow-up adds roster-wide recovery checks;
it also includes the existing internal-edge (#43), swerve response (#48) and
contact-constrained mechanism (#50) fixes. Its new delta beyond those reviewed
dependencies is this note and the roster regression, not new runtime tuning.

The 66 actual-field cases cover all 11 registered robots, both alliance towers,
and empty/eight-fuel/full loads. They use the outpost-side entrance, cycle intake
requests, turn inside the bay and test backing. Candidate exit routes turn away
from the post either continuously or after releasing drive pressure, then back
clear. Each candidate independently replays the same initial contact history;
at least one must succeed. The same capability, cargo and field-contact limits
apply as in normal play.

Full Darwin and Rembrandts can remain wedged when the driver changes directly
from pressing against the post to turning. Releasing drive before turning clears
the tested poses while their full hoppers remain deployed. Other poses, including
empty Simbot Tim at the red tower, use continuous turning. Keep Tim's intake out
for the tested low-rung exit; its retracted hopper has a different clearance.
These are ordinary driver inputs, not an automatic escape system.

The regressions require real yaw response and over .7 m withdrawal on a successful
route. Every candidate, including a blocked one, must retain stable wheel support,
bounded height, no accidental climb attachment, original fuel bodies and payload
mass counted once. Uncovered cargo may spill physically; retaining covers and
external cargo contacts remain separately verified in #42/#51.

The front opening is about 826 mm and remains narrower than several bumpers.
Use side entry and keep the robot aligned while inside; turn after relieving
contact pressure. The real feet, posts, rungs and alliance wall remain solid.
