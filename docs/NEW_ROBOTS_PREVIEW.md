# Valor, Hammerheads and Simbotics preview

The combined preview branch is `robot/1114-all-robots-preview`. It combines the
three feature branches for testing while keeping their individual contributions
separate:

| Team | Feature branch |
| --- | --- |
| 6800 Valor — Downpour | `robot/6800-downpour` |
| 5000 Hammerheads — Icarus 2.0 | `robot/5000-icarus-2` |
| 1114 Simbotics — Simbot Tim | `robot/1114-simbot-tim` |

All three appear in **Change robot**. Search the team number, open its details,
and choose **Use this robot**. Existing robots and the current starting-position
rules are retained. Prismarine remains hidden as on main.

## Windows preview

The PowerShell helper updates a separate worktree, installs pinned
dependencies, and opens the dev server. It preserves edits and uses fast-forward
updates; it does not switch the main checkout or stop another server.

From a fresh PowerShell window:

```powershell
$Repo = Join-Path $env:USERPROFILE 'OneDrive\Documents\GitHub\jamesim'
git -C $Repo fetch origin robot/1114-all-robots-preview
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
$Script = Join-Path $env:TEMP 'Jamesim-All-Robots.ps1'
git -C $Repo show 'FETCH_HEAD:scripts/preview-all-robots.ps1' | Set-Content -Encoding UTF8 $Script
if ($LASTEXITCODE -ne 0) { throw 'Could not read preview helper' }
& $Script -Repository $Repo
```

Default folder:
`$env:USERPROFILE\OneDrive\Documents\GitHub\jamesim-new-robots-preview`

Default address: **http://127.0.0.1:5187/**. Keep PowerShell running; Ctrl+C stops
the server. The helper requires Node 26 and uses `npx.cmd` with pnpm 10.20.0,
so Corepack is not required. Rerun it to fetch a newer preview. Change the port
with `-Port 5188` if 5187 is occupied.

The dev server started in the cloud workspace is separate from a server running
on your PC. The helper starts the same combined source locally.

## Mechanism and source notes

Each robot folder documents measurements, gameplay estimates, preparation and
limits. Downpour uses the supplied full GLB. Simbot Tim uses the supplied full
GLB, with explicitly derived plain bumpers because its export omits padding.
Icarus uses the team's official articulated July meshes; exact equivalence to
the linked Championship STEP remains unverified. Plain padding removes baked
CAD numbers before shared game labels are applied.

WASD drive, J/L turn, Shift intake, Space shoot/pass, Q reverse, V supported
intake retraction, R restart, and Escape pause. Saved rebindings appear in
Controls. The combined branch is a testing integration, not a merge into main.

## Initial combined integration checks

The preview merges each feature history normally onto main `093d554`.
Additive registration, credits and optional intake contracts were resolved here;
the feature branches remain independent for review. The browser check selected
each of the three robots and exercised blue/red practice, saved-key controls,
intake/reverse/shoot/retraction input, pause/resume and restart without page
errors. Automated browser input is a smoke check; robot-specific simulation
cases provide the assertions for cargo conservation and mechanism behavior.

The Windows helper was reviewed here; it has not been executed on Windows.

Before the feedback refinements below, combined checks passed: `pnpm test:sim` ran **433 tests across 58 files**;
`pnpm build:release` verified all 27 runtime files (37.76 MiB), TypeScript/Vite
and 20 content-hashed production assets. The existing large bundle warning
remains. These checks include all registered robot acceptance cases, full-hopper
original-body discharge, both Icarus mouths, Simbot Tim compression limits and
actual CAD animation checks.

## Earlier feedback refinements (historical)

- Downpour now folds its real pivoting intake automatically as fuel drains while
  shooting. Its expanding hopper stays out. A CAD-measured contact margin removes
  the former roughly 10 mm of allowed front-panel fuel penetration; capacity stays 48.
- Simbot Tim moves the polycarbonate wrap and rim with its carriage, with matching
  physical side walls. Thin sheets retain their original CAD tessellation. The hood
  reference, sweep, roller spin and negative-X release agree with the actual roller
  exit tangent; its full-size capacity stays 46.
- Icarus opens one intake at a time. The new rebindable **N** action switches sides;
  setup, Controls, a live side label and a gold robot arrow identify the selection.
  The old side closes fully before the other opens. Switching is refused above
  eight held fuel so the central packing can clear both closed walls. Continuous
  collection from either side supports 37 full-size fuel; the former 51 assumed
  both sides open. Its exposed upper/lower roof and sliding panels preserve source surfaces.
  The redundant 6.24-degree hood preparation tilt is removed; roller tangents
  agree with the physical launch direction throughout hood and turret travel.
- All sliding intakes compress automatically while shooting, respecting each
  robot's minimum stroke and cargo. Shift collection and Q reverse retain their
  existing extension priority. This includes hidden Prismarine; selector visibility
  remains unchanged. Matterhorn's passive dropping intake is not a powered slide.

The default Windows port is now **5187**, as requested. Stop the old server and
rerun the launcher to fetch these updates before testing.

Previous feedback verification on the current-main integration (`4154227`):

- `pnpm test:sim`: **448 tests passed across 60 files**. The first feedback run
  found Prismarine's old extended-while-shooting assertion; it now checks the
  requested compression while retaining the movement gate, eight physical
  releases, and extension after shooting stops. The complete suite was rerun.
- `pnpm build:release`: all 27 runtime files (39.99 MiB), TypeScript/Vite,
  and 20 content-hashed production assets passed. The existing large bundle
  warning remains.
- Combined browser: all three selectable, blue/red practice and saved-key
  controls; default N and saved X both select each Icarus side, and N is ignored
  after rebinding to X. No page errors. A case-sensitive test initially read the
  visually uppercase side label incorrectly; its DOM-text assertion was corrected
  and both binding cases reran successfully without changing production code.
- Fresh before/after CAD renders confirm intact Simbot Tim sheet/rim and Icarus
  roof/sliding surfaces. Downpour's partial folding pose retains the extended
  hopper. CAD-derived direction checks cover all three; Icarus's prepared
  roller tangent is checked against the shared physical shooter at nine
  combinations of hood elevation and turret yaw.

Prepared runtime hashes and provenance remain in each robot's asset records.
The combined branch preserves all three feature histories and current main;
no robot code is merged into main by this preview.

## Loose cargo and Valor intake update

- Simbot Tim now holds **73 full-size fuel** (previously 46). Its contact floor
  follows the actual sloping fixed rollers and moving pickup; the moving U-shaped
  cap and rear head bound the usable cavity.
- Icarus now holds **50 full-size fuel** with one intake open (previously 37).
  Its measured recessed bowl, raised platform, circular feeder and circular roof
  opening replace the oversized central exclusion. The flexible net remains an
  estimated floor envelope; N still selects one side with the eight-fuel switch
  limit and complete close-before-open sequencing.
- Both opt into contact restitution/friction and incoming-transfer momentum.
  Balls respond to impacts, acceleration, turning and braking instead of losing
  their motion on the bed. Fuel mass and payload accounting are unchanged.
- Downpour's real 50.8 mm intake tube retains its surface tessellation/normals.
  Exposed pulley/hub assemblies are restored, and four hubs follow their actual
  moving shafts rather than floating independently. Runtime size is 2,679,448
  bytes, 640,052 triangles and 38 primitives, within the existing limits.

The separate feature branches merge into this preview without conflicts against
main `4154227`. Shared additions are optional hopper floor profiles, moving lip
contacts, clipped cylinder/annulus contact shapes, contact-response tuning and
transfer momentum. Existing definitions retain their response unless opted in.

A local isolated browser using the actual simulation and renderer collected and
retained all 73 / 50 / 50 fuel (Simbotics, Icarus Primary, Icarus Opposite).
Acceleration/braking displaced original stored spheres by up to .143 / .133 /
.165 m respectively. Original body handles stayed stable and no page errors
occurred. The screenshots show actual solved fuel, not decorative seed stacks.
Runtime CAD for Tim and Icarus is unchanged in this update.

The three individual release builds and combined release build pass integrity,
TypeScript/Vite and payload checks; the combined pack is 27 files / 40.62 MiB,
with 20 hashed build assets. The existing large-bundle warning remains.

Final combined regression: `pnpm test:sim` passed **465 tests across 64 files**.
All three robots passed the real app's search/detail/selection, blue/red practice,
controls, intake/shoot/reverse/retraction, pause/reset and return-to-setup checks
without page errors. Downpour's stowed, deployed, feeding, partial folding and
shooting CAD poses were captured and inspected; the repaired tube and drive
hardware remain assembled. One initial diagnostic screenshot timed out under
concurrent software rendering; the recapture completed all five poses without
production changes. Ignored evidence: `.tools/cargo-combined-sim.log`,
`.tools/cargo-combined-release.log`, `.tools/live-cargo.json`,
`.tools/valor-current-review.json` and `.tools/cargo-app-*.log`.

## Intake retraction and independent PR review

Downpour now uses seven moving cargo contact boxes fitted around its powered
roller, two static tubes, two crossbars and both side plates. They follow the
same pivot/pose as CAD. Feeding fuel also yields to moving intake contacts;
static feeder envelopes remain part of its intended managed feed route.
The 48-fuel capacity, original IDs/bodies and fuel mass are unchanged.
Focused validation passes 31 robot/contact cases across six files, including
all held states during full-load shooting and manual partial-load retraction.
The live intake acquired48, retained48, kept full-radius clearance with34 held
at intake extension .6565, and physically released all48 while fully retracting.
No browser page errors occurred. Evidence: `.tools/valor-retraction-browser.json`.

The standalone branches now share optional mechanism code through common merge
ancestors `56a2273` and `191c137`. Their registration and attribution additions
occupy independent lines; every original robot ID and its relative order remain.
Each feature branch contains only its own added definition/model. All24 normal
Git merge orders of Valor, Icarus, Tim and existing tuning PR #11 onto main
`4154227` pass and produce one identical tree. This is a check at those refs,
not a guarantee after future edits or history rewriting. The only other open PR
at this check was #11 (`8ad379a`). No tuning changes or main updates were pushed
by this preview task. Detailed shared path/source/estimate disclosures accompany
the three individual robot PRs. The local compatibility worktree tests the
superset with #11; this preview keeps the three-robot integration on current main.

Final review validation after protecting the last incoming transfer: **474 tests
across66 files passed** in the all-three-robots plus PR #11 compatibility tree.
All three standalone release builds and the all-PR release pass. All3 Downpour
fold cases pass: full48 shooting, manual16-fuel folding and the last physical
intake transfer. Incoming/feeding contact projection uses12 passes so adjacent
bars resolve without leaving a sphere in the neighboring bar. The live preview
still acquires48, retains48 and fires all48 original bodies with full-radius
folding clearance and no page errors. Evidence: compatibility worktree
`.tools/all-pr-simulation-final.log` and `.tools/all-pr-release-final.log`;
preview `.tools/valor-retraction-browser-final.log` and
`.tools/all-pr-merge-orders-final.json`.
