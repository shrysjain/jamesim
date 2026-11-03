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

Default address: **http://127.0.0.1:5185/**. Keep PowerShell running; Ctrl+C stops
the server. The helper requires Node 26 and uses `npx.cmd` with pnpm 10.20.0,
so Corepack is not required. Rerun it to fetch a newer preview. Change the port
with `-Port 5186` if 5185 is occupied.

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

## Combined integration checks

The preview merges each feature history normally onto main `093d554`.
Additive registration, credits and optional intake contracts were resolved here;
the feature branches remain independent for review. The browser check selected
each of the three robots and exercised blue/red practice, saved-key controls,
intake/reverse/shoot/retraction input, pause/resume and restart without page
errors. Automated browser input is a smoke check; robot-specific simulation
cases provide the assertions for cargo conservation and mechanism behavior.

The Windows helper was reviewed here; it has not been executed on Windows.

Final combined checks passed: `pnpm test:sim` ran **433 tests across 58 files**;
`pnpm build:release` verified all 27 runtime files (37.76 MiB), TypeScript/Vite
and 20 content-hashed production assets. The existing large bundle warning
remains. These checks include all registered robot acceptance cases, full-hopper
original-body discharge, both Icarus mouths, Simbot Tim compression limits and
actual CAD animation checks.
