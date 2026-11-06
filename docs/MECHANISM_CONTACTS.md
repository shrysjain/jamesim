# Intake and hopper wall contacts

Issue #8 follow-up, prioritizing the owner's report of sticking during intake
extension/retraction. Existing Rapier contacts were active, but moving an attached
collider's local pose bypassed the parent's continuous collision detection. An
intake could cross a thin wall and leave the wall between robot parts. In a
reproduction with all preceding PRs, Rembrandts could not drive back out.

Runtime intake/hopper commands now sweep their existing collision proxies before
changing pose. Linear slides use continuous shape casts. Rotating arms use small
angular segments and conservative surface padding, bounded to 2 mm of angular
travel per segment plus a 0.5 mm query margin. The first obstruction limits the
linked pose; the actuator stalls and retries as the robot moves. Rapier permits
separating casts so withdrawal and sliding do not latch a touching mechanism.
Concave field colliders remain eligible throughout the sweep.

The actual constrained pose drives the model, cargo envelopes and physical
proxies together. Darwin's nonlinear hopper linkage is retained at intermediate
poses. No chassis translation, escape velocity or additional impulse is assigned.
Existing tire forces and rigid-body contacts move the chassis clear; the actuator
then resumes. Existing authored dimensions, collision masks and wall materials
are retained. Passive startup deployment uses the same guard as manual motion.

The field alone is stepped during world construction, before any dynamic bodies
or fuel exist, to publish its static contacts before the first actuator query.
Fuel time, match time and initial fuel positions stay at their original values.

Validation covers all 11 registered robots and both Icarus mouths, empty and with
eight original preloads, 8 mm walls, angled 100 mm walls, withdrawal, automatic
resumption, bounded penetration/height, traction and stable fuel bodies. All 24
wall regressions fail without the sweep. Rembrandts, Kepler and Darwin additionally
exercise both actual perimeter sides with wall pressure, sideways sliding and
backing clear. Existing wall, rigid-swerve, bump, trench, cargo and shooter checks
remain in force.

This is contact-constrained actuation of the existing proxies. It does not add
separate articulated rigid bodies, calibrated motor torque, compliance or joint
damage. Floor/bump support, loose-fuel displacement, hood aiming and managed
climbing keep their existing physics and safety behavior. Inspection poses remain
direct so authored configurations can still be examined while paused.
