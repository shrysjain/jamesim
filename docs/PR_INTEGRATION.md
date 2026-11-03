# Approved robot PR integration

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
