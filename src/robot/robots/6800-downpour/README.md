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
experiment that was not used in matches. The separately linked Drizzle revision
and an early-season binder must not silently supply geometry or measurements
for Downpour. A later post reports a 790:11 hood ratio; that is an actuator
ratio, not an angular limit or a measured launch-performance claim.

A secondary study dashboard characterizes this robot as an elevator/arm
launcher. That description has not been checked against the full requested
assembly, and is insufficient evidence to implement a new mechanism family.
Inspect the actual CAD and team material first. Do not enable bidirectional
shooting, climbing, a turret or other capabilities without evidence.

No mass, frame dimensions, wheel locations, hopper capacity, intake stroke,
launch geometry, firing rate or moving-shot accuracy has been measured here.
Those values remain intentionally unset rather than copied from another team.

## CAD access and next implementation step

On November 2, 2026 the web reader could resolve the team's exact CAD URL but
returned no geometry or assembly data. The selected cloud environment rejected
the direct Onshape request with a proxy CONNECT 403. This is an access limitation
of this session; it does **not** establish that the team disabled exports.
The technical-packet viewer exposed a loading/sign-in page. No matching 6800
geometry was found in the public derivative mesh pack used by existing robots.

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

The repository branch guard passed for team 6800. The source JSON parses.
Simulation, asset-budget and visual validation have not been run for this robot
because no robot class or runtime CAD exists yet. This branch currently changes
only this README and its source research record; it has no shared integration
points or dependency on another robot PR.

CAD redistribution clearance is pending under the repository's existing
owner-authorized noncommercial v1 policy. No unrelated code license is treated
as CAD permission.
