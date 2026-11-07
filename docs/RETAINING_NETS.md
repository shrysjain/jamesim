# Source-confirmed robot retaining nets

Issue #24 adds visible retaining fabric for the robots whose retained source notes explicitly confirm it:

- **9496 Matterhorn:** the [team build discussion](https://www.chiefdelphi.com/t/lynk-9496-build-log-2026/511797?page=8) confirms a retaining net omitted from the supplied GLB. Fitted side/end panels extend from the .308 m local rim to the existing .44 m cargo ceiling. They follow the same contracting front as cargo.
- **5000 Icarus 2.0:** the [technical binder](https://logandelaar1.github.io/Tech-Binder/) describes sewn half-box nets on the opposed intakes. Fitted covers follow each bay, leaving the measured fixed center roof/turret region uncovered. They disappear as that bay stows. Only one intake operates at a time.
- **6800 Downpour:** the retained team technical-packet notes describe an expandable top net. Fitted upper panels cover the existing cargo envelope above .20 m local height.

The simple open-weave panels are authored approximations, not recovered CAD fabric or cloth dynamics. Net presence is source-confirmed; shape, tension and weave are estimates. Other robots keep their original geometry and contacts unless their retaining fabric is established by a source. No speculative cover is added over a shooter or turret.

`hopper.retainingNet` opts a definition into visible panels and enclosed local cargo contacts. Existing full-size spheres, capacity, ownership, payload mass and original Rapier bodies remain. Matterhorn keeps its previous open-hopper contact-response values while gaining the missing top/upper-side containment. Icarus and Valor were already enclosed, so their cargo contact response is unchanged. Reverse/ejection and feeding use their existing managed routes.

The uncovered Matterhorn controls still verify physical spilling and original-body contact/material handoffs. A covered-versus-uncovered regression tests retention above a finite rim; layout tests verify moving bounds and Icarus's center gap.

## Covered cargo against the field

The original field-contact handoff could still strip Matterhorn fuel through the
net at a trench beam. Downpour's enclosed cargo could also overlap that beam.
Covered stored fuel now has zero-density, field-only sphere proxies attached to
the existing chassis. They follow the same full-size spheres and rendered cargo
positions. Original fuel bodies remain disabled while owned, and the existing
payload mass is counted once; no additional rigid body or ammunition is created.

Field contacts can rearrange fuel inside the cover. When a packed covered load
cannot fit, its attached contacts react on the chassis rather than ejecting fuel
through fabric. A full hopper can therefore impede a low passage until there is
clearance. Existing finite-rim spill behavior remains for uncovered robots.

Stored proxies are removed on feeding, ejection, restart or ownership change.
The physical projectile-clearance query uses the projectile's collision groups,
so these field-only proxies do not block managed feeding or create duplicate
ball-to-ball contacts. Floor/bump support and loose-fuel displacement are retained.

Checks cover full covered loads at both trench approaches, physical sphere/field
clearance, backing clear, retained records/bodies, zero proxy mass, feeding/reverse
cleanup, pause and restart. This remains a fitted cover/contact approximation;
cloth deformation, tension and tearing are not simulated. Net shape, capacities,
mass, friction and source attribution are unchanged.
