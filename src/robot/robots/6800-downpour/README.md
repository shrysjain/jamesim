# 6800 Valor — Downpour (2026)

## Status

Source research branch: `robot/6800-downpour`, based on `origin/main` at
`0d64cbb2f910285ccd7ac9ac747a3e21d4b861a5`.

The user supplied the team's current Downpour assembly. The official May 13
CAD release links that exact document, workspace and assembly. The separately
linked Manor robot, Drizzle, uses another workspace in the same document;
it must not be substituted for this request.

**Not yet playable or registered.** No complete assembly geometry was available
in this environment. There is no `definition.ts`, runtime asset record or
placeholder model. Existing robots and shared interfaces are unchanged.

## Sources and revision

- [Requested Downpour CAD](https://cad.onshape.com/documents/15cd41462dc24ff986a4e549/w/1b79a7ae373e0026664ccfff/e/8fdecbfb5ab3c774cb6a4551)
- [Official CAD release](https://www.chiefdelphi.com/t/frc-6800-valor-2026-robot-cad-release/520715)
- [Official code release discussion](https://www.chiefdelphi.com/t/frc-6800-valor-2026-robot-cad-release/520715?page=2)
- [Team-linked technical packet](https://drive.google.com/file/d/11rQrMwCIseY18JbKFytGLXSd__x1JP1S/view)
- [Team-linked code](https://git.valor6800.com/valor6800/2026/robot)

The supplied workspace is mutable, not an immutable version or microversion.
Record the export's version/microversion when available and hash every input
before conversion. `assets/robots/6800-downpour/sources.json` preserves the
exact source identifiers and current access status; it is research metadata,
not a prepared-runtime manifest.

## Verified behavior and evidence limits

The team's CAD-release discussion describes a four-fuel-wide shooter and an
adjustable hood. It says reverse-direction shooting remained an inconsistent
experiment that was not used in matches.

The technical packet, **States Pages to print.pdf**, was inspected through the
Google Drive connector's readable extraction. Provider metadata reports
26,550,129 bytes and modification time `2026-04-13T23:00:56Z`. Its District
Championship chapters describe the rebuild from a single-stream turret to a
four-fuel-wide drum shooter. This directly supersedes the secondary dashboard's
unverified elevator/arm characterization as evidence for this revision. The
separately linked Drizzle workspace and the initial March binder must not
silently supply measurements for the requested May CAD workspace.

The packet reports these design specifications; they are **team-stated figures,
not measurements of the inaccessible CAD**:

| Subsystem | District Championship packet evidence |
| --- | --- |
| Intake | 25.5 in (0.6477 m) acquisition width; powered 2 in roller and static 1 in aluminum crash-bar tube; two Kraken X60 roller motors at 1.23:1 |
| Deployment | Single pivot, two ThriftyBot cycloidal gearboxes, 69:1 reduction; low-mounted Kraken X60 |
| Hopper | 4,613.4 in³ unextended and 8,683.9 in³ extended; stationary bumper-mounted panels and an expanding top net |
| Indexer | Four-fuel-wide transfer; two Kraken X44s at 2.5:1; mixed 2 in / 1.25 in rollers |
| Shooter / feeder | Three Kraken X60 shooter motors at 3:2 and two X60 feeder motors at 20:9; 2 in feeder rollers |
| Hood | Kraken X44; packet gearing 1580:21; stated 80° total travel |
| Climber | Two pivoting 3/8 in aluminum hooks; surgical-tubing deployment and Dyneema spool retraction; Kraken X44 and 74.1:1 total reduction |

The stated hopper volumes do not establish usable full-size-fuel capacity or
legal cargo seed positions. The 80° hood travel does not specify an absolute
shot-angle range. A later May discussion gives a different hood ratio, 790:11;
keep both dated records until CAD/code establishes which applies to the chosen
export. Neither ratio is a measured launch-performance claim.

The packet's April District Championship documentation and the mutable May
release workspace are related sources, not proof of identical geometry or
unchanged operating limits. Verify their differences when the full export is
available. The two pivoting hooks are not the existing vertical `side-hook-l1`
family: enabling a climb requires real attachment/support behavior and a
coordinated optional contract extension, not an animation-only substitute.

No mass, frame dimensions, wheel locations, full-size cargo layout, intake pivot
or limits, launch geometry, firing rate or moving-shot accuracy has been
measured here. Those values remain intentionally unset rather than copied from
another team. No unsupported capabilities are registered.

## CAD access and next implementation step

On November 2, 2026 the web reader could resolve the team's exact CAD URL but
returned no geometry or assembly data. The selected cloud environment rejected
the direct Onshape request with a proxy CONNECT 403. This is an access limitation
of this session; it does **not** establish that the team disabled exports.
The ordinary technical-packet web viewer exposed a loading/sign-in page; its
mechanical text was subsequently read through the connected Google Drive
plugin. That text supplies revision evidence, not source mesh geometry. No
matching 6800 geometry was found in the public derivative mesh pack used by
existing robots.

Provide a GLB or STEP export of the requested Downpour assembly, preferably with
bumper, intake and hood subassembly hierarchy retained. Source exports belong
under ignored `assets/source/robots/6800-downpour/`; raw CAD must not enter the
runtime payload. Once geometry is available:

1. Inspect the complete assembly, identify real joints/axes, remove embedded fuel
   and prepare one articulated, self-contained model within the authoring budgets.
2. Measure frame/modules, pickup, hopper, feed and shooter geometry. Document
   gameplay estimates separately and use shared mechanisms where they fit.
3. Implement the robot-owned definition/visual files, actual runtime hash record
   and registry entry; do not alter shared behavior to hide missing mechanisms.
4. Run robot acceptance, full simulation and release checks, then inspect both
   alliances and all supported mechanism poses in a local browser.

## Validation and integration

The repository branch guard passed for team 6800. The source JSON parses, and the ignored readable-text extraction has a
recorded byte count and SHA-256. That hash identifies the text extraction, not
the raw PDF, which was not downloaded.
Simulation, asset-budget and visual validation have not been run for this robot
because no robot class or runtime CAD exists yet. This branch currently changes
only this README and its source research record; it has no shared integration
points or dependency on another robot PR.

CAD redistribution clearance is pending under the repository's existing
owner-authorized noncommercial v1 policy. No unrelated code license is treated
as CAD permission.
