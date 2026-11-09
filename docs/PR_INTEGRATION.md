# Approved robot PR integration

## November 9 integration

The owner approved all open PRs #40–54. They are incorporated in numeric order, which places every prerequisite before its dependent PR. The 23 signed, single-parent contributor commits preserve distinct features and refinements, with corrected `couchpotato7572 <122821137+couchpotato7572@users.noreply.github.com>` authorship and original author dates. Each records its source SHA and PR. Seven already-incorporated dependency or main-update commits are omitted; the Matterhorn fold from #38 is not replayed. Existing published main and contributor branches are unchanged.

Every cumulative PR result exactly matches its ordinary Git merge onto the preceding combined source tree. Old Re•Blitz baseline conflicts are resolved to that cumulative tree, retaining the accepted researched rates and simultaneous-intake flag. The final contributor tree includes every approved head without copying prerequisite changes twice. PRs are closed as incorporated after pushing this linear history, following the previous attribution-preserving integrations.

| PR | Incorporated source head | Result |
| --- | --- | --- |
| [#40](https://github.com/shrysjain/jamesim/pull/40) | `2ac33f7fc94fa375fdafeddf60a69fde62b343dc` | Concave hub net-base contacts |
| [#41](https://github.com/shrysjain/jamesim/pull/41) | `2cd6d60ade052cbff199132f0db93969590b4168` | Re•Blitz concurrent intake/shooting |
| [#42](https://github.com/shrysjain/jamesim/pull/42) | `3c0c6c3367d637b9800b000586d55dd9bf4261ff` | Source-confirmed retaining covers |
| [#43](https://github.com/shrysjain/jamesim/pull/43) | `be2b0d7b32451bd79fbb95c924c435c2b23aa05b` | Internal field-mesh edge contacts |
| [#44](https://github.com/shrysjain/jamesim/pull/44) | `6aedb6fae27d8d95cfc4f1efca5317e77b490508` | Physical-footprint bump support |
| [#45](https://github.com/shrysjain/jamesim/pull/45) | `a2347b0b5d5d5117fe1cda695d3872bf8198dffc` | Saved player camera modes |
| [#46](https://github.com/shrysjain/jamesim/pull/46) | `8a2877bf3a012a869a1262a70cde62a6c4eb5b52` | Concave tower-base contacts |
| [#47](https://github.com/shrysjain/jamesim/pull/47) | `be790bc59c9729b4062b961710d66241c9201427` | Rembrandts hood, intake profiles and trench safety |
| [#48](https://github.com/shrysjain/jamesim/pull/48) | `3b71925ea42fad94c370df4dc04b0de4ddbc2f0d` | Faster swerve response and braking |
| [#49](https://github.com/shrysjain/jamesim/pull/49) | `366f9122098d2e9a03a8595c7dba95138b7e9c80` | Driver-priority turning and concurrent actions |
| [#50](https://github.com/shrysjain/jamesim/pull/50) | `4818230884d5381784d2a578e488d1aca15b7277` | Field-constrained mechanism actuation |
| [#51](https://github.com/shrysjain/jamesim/pull/51) | `7bf7d0cc36fa2b8a02d92af09501df7e53e9b85d` | Covered cargo/field contacts and retention |
| [#52](https://github.com/shrysjain/jamesim/pull/52) | `78d1f47dfacb3239000930295c07ba1f136ae7e2` | Downpour carpet reference and tower support |
| [#53](https://github.com/shrysjain/jamesim/pull/53) | `7093ac3a800100c8012c777c6b2eccf132c380be` | Roster-wide loaded trench recovery |
| [#54](https://github.com/shrysjain/jamesim/pull/54) | `0884e23d633a9d21ccebac5097809850d6ce5774` | Roster-wide tower exit routes |

Follow framing remains the default; player-selected station, POV and free cameras are available in settings. Supported simultaneous intake/shooting and manual-turn priority preserve robot-specific release limits. Source-confirmed retaining nets on Matterhorn, Icarus and Downpour retain original cargo while massless proxies transmit field contacts to the chassis. Moving mechanisms stall against real field geometry and resume when clear. The prepared field repairs remove false filled surfaces while retaining rails, feet, posts and the actual narrow tower gap. Rembrandts uses its corrected prepared hood and conservative intake profiles with predictive shooting protection. No capacity, fuel size/mass, scoring, match timing, roster visibility or hosting policy is changed.

Issues #7, #8, #16, #19, #20, #21, #24, #25 and #26 have their reviewed implementation complete; merging is the final unchecked item in their retained verification lists. These fixes and recovery routes cover the documented reproductions, not every possible contact configuration. Stage 20 remains unstarted. Browser playtesting is left to the owner; no application server or manual deployment is started.

Final combined validation: `pnpm test:sim` passes **865 tests across 88 files**, including all unit, robot and full-simulation cases. `pnpm build:release` passes runtime integrity, TypeScript/Vite compilation and production-payload checks: **27 runtime files / 40.86 MiB** and **20 content-hashed runtime assets**. Tests ran once after all 15 PRs were incorporated; no production integration fix or relaxed assertion was needed. The existing physics-chunk size advisory remains.

## November 5 robot follow-ups

The owner additionally approved #38 Matterhorn shooting-linked folding, #37 Citrus roller repair and #39 tower-backing visibility. They are integrated in that order as three separate signed commits with corrected `couchpotato7572` authorship and source/PR trailers. #38 preserves #11's researched rates, motion limits and grip while enabling the existing load-aware hopper/intake pose controller. Its regression retains original fuel bodies and covers pause, intake/reverse overrides and full-load contraction. #37 replaces only the two source-fitted roller shells and updates the exact runtime asset/hash; unrelated CAD geometry is retained. #39 removes backing triangles only from the tower render; hub panels, field collisions, rung geometry and climbing assessment are unchanged.

During the earlier tuning integration, #11 advanced from `8ad379a` to `995946d060c88d473c2294625d1e68b3e31bbf27` by merging current main and the #38 feature. That incremental Matterhorn change is now incorporated exactly once through #38. Comparing the resulting tree with the updated #11 head leaves only the separately approved scatter, maintainer contact/documentation, Citrus repair and tower-visibility changes; no research content is omitted. Published history is not reordered or rewritten.

| PR | Incorporated source head |
| --- | --- |
| [#38](https://github.com/shrysjain/jamesim/pull/38) | `5d762d5046d51f70261a0c333467fa0555475cfa` |
| [#37](https://github.com/shrysjain/jamesim/pull/37) | `ab820cda98a58b404123790aaf708d414ed9e7b4` |
| [#39](https://github.com/shrysjain/jamesim/pull/39) | `a130d6c177edf1d78421ee420d0bd4e0a178240a` |

The corresponding Matterhorn and Citrus issues #22/#23 are completed. #19's physical navigation-clearance request remains separate from the tower-visibility change. No browser session, application server or manual deployment is started for these follow-ups.

After all three follow-ups were integrated, **51 affected checks across 9 files pass**: Matterhorn, Citrus, research envelopes and the real-asset tower regression. The release integrity, TypeScript/Vite and production-payload checks also pass, with 27 runtime files and 20 content-hashed runtime assets. The earlier 492-case complete-suite result for the shared tuning/contact integration is recorded below.

## November 5 tuning follow-up

The owner approved #11 performance recalibration and #36 distance/motion scatter tuning following the isolated #11 preview. Both are now incorporated. #11 uses source head `8ad379aad9f8f8bcbf397675a8f2042e89afeeb8`; #36 uses corrected head `fc942e72d48b7edb231822e789abf8318a7f49fb`.

Five signed, single-parent contributor commits retain the original research change, its legal-start compatibility follow-up, and all three scatter refinements. Already-integrated dependency histories are omitted. Each commit records its original source and PR, with corrected `couchpotato7572 <122821137+couchpotato7572@users.noreply.github.com>` authorship. Before the maintainer contact correction below, the contributor tree exactly matches an ordinary cumulative merge of both approved heads onto main `b7b7515`. Published main and contributor branches are not rewritten; PRs are closed as incorporated after the linear history is pushed, consistent with the earlier integrations.

The seven original robot profiles now use the estimates in [the performance research](ROBOT_PERFORMANCE_RESEARCH.md). Re•Blitz drives at 14.4 ft/s and intakes at 44 fuel/s, retaining stationary hub shooting while allowing moving passes. Fixed-shooter motion limits and relative quality vary by robot; Kepler retains its prior card calibration. New robot profiles are unchanged. [Shot tuning](SHOT_TUNING.md) records the shared distance curve and stronger fixed-shooter motion sensitivity. These remain explicit gameplay estimates, not measured team accuracy percentages. Stable fuel bodies, capacities, CAD, scoring and timing are preserved.

The combined suite exposed a Downpour cargo contact corner: projecting a ball away from the folding intake could push it against the closed hopper ceiling, whose final clamp left about 2.24 mm of intake penetration. The existing full-load shooting test failed its unchanged 1 mm contact tolerance. A separate maintainer correction adds bounded refinement only for remaining frame penetrations in closed hoppers, without repeating ball-pair iterations or changing geometry, cargo size or capacities. The original shooting/manual-fold/last-transfer contact cases and shared hopper checks pass after the correction.

Final verification: `pnpm test:sim` passes **492 tests across 71 files**, including all unit, robot and simulation cases. `pnpm build:release` passes runtime integrity, TypeScript/Vite compilation and production-payload checks: **27 runtime files / 40.62 MiB**, **20 content-hashed runtime assets**. The existing large physics-chunk advisory remains. No test assertions were relaxed for the contact correction.

The isolated tuning server on port 5174 was stopped at the owner's request. No browser test or replacement application server is started for this integration; normal local testing uses `pnpm dev` on main. No manual deployment or hosting changes are performed.

## November 5 initial integration

Approved and incorporated: #28 Icarus 2.0, #29 Downpour, #30 Simbot Tim, #31 steady follow-camera pitch, #32 controller labels/guide, #33 AUTO coasting, #34 bump support-force budget and #35 reachable opposing-zone passing. #11 performance recalibration and #36 distance/motion scatter tuning were initially held for the later follow-up above. That follow-up supersedes the initially retained Re•Blitz targets and scatter coefficients. Vercel Analytics and Prismarine's temporary selector filter are retained.

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
