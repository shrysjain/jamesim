# Approved robot PR integration

## November 5 integration

Approved and incorporated: #28 Icarus 2.0, #29 Downpour, #30 Simbot Tim, #31 steady follow-camera pitch, #32 controller labels/guide, #33 AUTO coasting, #34 bump support-force budget and #35 reachable opposing-zone passing. #11 performance recalibration and #36 distance/motion scatter tuning remain excluded. Existing Re•Blitz targets, the scatter model, Vercel Analytics and Prismarine's temporary selector filter are retained.

There are eleven registered CAD robots and ten visible choices. The three additions use the shared optional hopper/contact and opposed-intake contracts. Rebindable N selects Icarus's active mouth; its approved side status and on-robot arrow indicate the selected intake. Prismarine remains hidden, with the incoming shooting-compression configuration retained. Stage 20 has not started.

The 44 integration commits form a single-parent sequence. Feature/refinement commits from the primary source history are retained; shared mechanism merges become linear integration commits, already-incorporated main updates are omitted, and the two additional robot histories retain their own model/definition/documentation changes without duplicating shared code. Registration/credit reconciliations are explicit commits. Every integration commit records its source SHA and PR, has corrected `couchpotato7572 <122821137+couchpotato7572@users.noreply.github.com>` authorship and is signed by the maintainer. Published main and contributor branches are not rewritten.

After each PR, the resulting tree was checked against a normal cumulative Git merge of the original heads. All eight comparisons matched exactly before the maintainer documentation/attribution updates. The approved PRs are closed as incorporated after pushing this authored linear history. Related issues #6, #13, #14, #15 and #18 are closed per the owner's request. #13's contribution covers controller naming and the binding guide; physical controller behavior remains unverified.

| PR | Reviewed source head |
| --- | --- |
| [#28](https://github.com/shrysjain/jamesim/pull/28) | `984546240a3fd5b58131ac8b94a84487fc5cf167` |
| [#29](https://github.com/shrysjain/jamesim/pull/29) | `8f891a011a156ceb670de8096ff93ee9e728c98a` |
| [#30](https://github.com/shrysjain/jamesim/pull/30) | `e3f1296ad18e066319bd52820c7089110e26a2bd` |
| [#31](https://github.com/shrysjain/jamesim/pull/31) | `bba5ba1330f6c76ecf4b93fa3ab5ebf9fb273f4d` |
| [#32](https://github.com/shrysjain/jamesim/pull/32) | `0475337b8fcdc62cf07936db51a7beb8526596d2` |
| [#33](https://github.com/shrysjain/jamesim/pull/33) | `97f0d4b300f80fabe2a39855ccccb6f62ade286e` |
| [#34](https://github.com/shrysjain/jamesim/pull/34) | `7b79a8a49fc80b3e0a4056e1934a9fa75e1626dd` |
| [#35](https://github.com/shrysjain/jamesim/pull/35) | `06ff378177737fc1d2312652cb34df3fcf9d059b` |

Combined verification: `pnpm test:sim` passed all **484 tests across 70 files**, covering the unit, registered-robot and complete simulation checks. `pnpm build:release` passed integrity, TypeScript/Vite compilation and production payload checks: **27 runtime files / 40.62 MiB**, with **20 content-hashed runtime assets** in production. Tests ran once after all approved code was integrated. No browser testing, application server or manual deployment was performed.

## November 2 integration

November 2, 2026. Eight robots are now integrated into the singleplayer flow. Stage 20 (multiple simultaneous robots) has not started. This record supersedes earlier two-robot roster and preview-branch descriptions where they differ.

## Scope

Approved PRs: #1, #2, #3, #4, #5, #9, #10 and #12. Draft #11 is excluded, including its separate research calibration and moving-pass changes. The roster is Re•Blitz, Kepler, Darwin, Limestone, Matterhorn, Infrared FM, Era II Worlds and Prismarine.

The accepted stack includes its per-robot mechanisms, rigid module presentation, faster manual steering response, wall-contact material fix, physical shot variation, match-cutoff hold and fitted cargo layouts. Re•Blitz/Kepler capacities are 65/60 from the approved robot stack; Re•Blitz retains its prior 16.7 ft/s default and 50 fuel/s intake. This integration does not adopt draft #11's 14.4 ft/s / 44 fuel/s recalibration.

## History and authorship

Meaningful original feature/refinement commits are retained in a single-parent sequence. Original source SHAs and PR numbers are recorded in commit trailers. Duplicate copies of the rigid-swerve change and merge-only ancestry are omitted. Two explicit integration commits retain the existing contributor's shared-contract/documentation resolutions. No whole PR or multi-PR squash commit is used.

All replayed work from PRs opened by `couchpotato7572` is attributed to `122821137+couchpotato7572@users.noreply.github.com`, correcting the source git configuration. Prismarine's original author is retained. Maintainer integration fixes are separate. Existing published main history and contributor branches are unchanged.

The approved PRs are closed as incorporated after pushing the authored sequence to main. Their original heads are not ancestors of main because author correction and overlap resolution produce new commit IDs; closing avoids adding duplicate squash or merge commits. Commit trailers and this record preserve the source mapping.

| PR | Original reviewed head | Increment |
| --- | --- | --- |
| [#1](https://github.com/shrysjain/jamesim/pull/1) | `3f56a6b` | Moving-shot uncertainty and disabled-drive hold |
| [#2](https://github.com/shrysjain/jamesim/pull/2) | `2e2a820` | Darwin, rigid modules, steering, shot/cargo tuning and wall-contact fix |
| [#3](https://github.com/shrysjain/jamesim/pull/3) | `8aea27d` | Limestone, juice press, L1 support and roller corrections |
| [#4](https://github.com/shrysjain/jamesim/pull/4) | `7b483cc` | Matterhorn, fixed/reversed shooting, finite rims, spills and field contacts |
| [#5](https://github.com/shrysjain/jamesim/pull/5) | `88e062f` | Spectrum FM, translucent hopper and full-width feeding |
| [#9](https://github.com/shrysjain/jamesim/pull/9) | `10e94d6` | Era II Worlds, finite turret travel, indexer, feeder axes and cargo-dependent retraction |
| [#10](https://github.com/shrysjain/jamesim/pull/10) | `e8f5b7b` | Searchable selector, robot details and Windows import correction |
| [#12](https://github.com/shrysjain/jamesim/pull/12) | `364f378` | Prismarine, fixed 64° turret, real CAD appearance and trench clearance |

The reconstructed robot stack's tree exactly matches #9 before adding #10/#12. The five selector files exactly match #10. Prismarine uses the existing `fixedElevation` contract instead of introducing a second fixed-angle solver. Its CAD remains unchanged.

## Integration correction

The combined wall suite exposed slow Prismarine reversal, empty and loaded: its spinning wheel commands took too long to cross zero while the chassis was against a wall. It now uses the existing optional 16 m/s² braking response, retaining its 8 m/s² powered acceleration and traction-limited body forces. This is an explicit gameplay estimate, following Era II's existing 2× braking convention. The original wall displacement assertions are retained; all 31 wall/Prismarine checks passed after the correction.

## Verification

Final checks on the combined roster:

- `pnpm test:unit`: 42 tests passed across 9 files.
- `pnpm test:robots`: 139 tests passed across 24 files.
- `pnpm test:sim`: 348 tests passed across 49 files, including the original empty/full wall escape checks.
- `pnpm build:release`: asset integrity, TypeScript/Vite compilation and production payload checks passed. All 24 runtime files verified (31.38 MiB); the production pack contains 17 content-hashed runtime assets.

These suites overlap; their test counts are not additive. The build retains its existing large Rapier chunk warning. Browser testing is intentionally left to the owner. No application server or preview server is started by this integration. Dependencies are installed with the frozen lockfile; local testing should require only `pnpm dev`.

Prepared runtime files remain local and tracked; original CAD, scratch scripts and reports are excluded. Attribution and pending-review records are preserved. No hosting/account configuration or manual deployment is performed.
