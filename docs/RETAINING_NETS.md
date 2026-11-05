# Source-confirmed robot retaining nets

Issue #24 adds visible retaining fabric for the robots whose retained source notes explicitly confirm it:

- **9496 Matterhorn:** the [team build discussion](https://www.chiefdelphi.com/t/lynk-9496-build-log-2026/511797?page=8) confirms a retaining net omitted from the supplied GLB. Fitted side/end panels extend from the .308 m local rim to the existing .44 m cargo ceiling. They follow the same contracting front as cargo.
- **5000 Icarus 2.0:** the [technical binder](https://logandelaar1.github.io/Tech-Binder/) describes sewn half-box nets on the opposed intakes. Fitted covers follow each bay, leaving the measured fixed center roof/turret region uncovered. They disappear as that bay stows. Only one intake operates at a time.
- **6800 Downpour:** the retained team technical-packet notes describe an expandable top net. Fitted upper panels cover the existing cargo envelope above .20 m local height.

The simple open-weave panels are authored approximations, not recovered CAD fabric or cloth dynamics. Net presence is source-confirmed; shape, tension and weave are estimates. Other robots keep their original geometry and contacts unless their retaining fabric is established by a source. No speculative cover is added over a shooter or turret.

`hopper.retainingNet` opts a definition into visible panels and enclosed local cargo contacts. Existing full-size spheres, capacity, ownership, payload mass and original Rapier bodies remain. Matterhorn keeps its previous open-hopper contact-response values while gaining the missing top/upper-side containment. Icarus and Valor were already enclosed, so their cargo contact response is unchanged. Reverse/ejection and feeding use their existing managed routes.

The uncovered Matterhorn controls still verify physical spilling and original-body contact/material handoffs. A covered-versus-uncovered regression tests retention above a finite rim; layout tests verify moving bounds and Icarus's center gap. These are local owned-cargo envelopes, not full external-body collision surfaces or deformable cloth. Field contacts can still strip cargo when geometry forces it outside; no fuel is created or scored by the cover.
