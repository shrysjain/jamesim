# Working on Jamesim

Jamesim is a browser-only FRC 2026 REBUILT simulator. Read `docs/STAGE_19_5.md` for the player flow, `docs/PR_INTEGRATION.md` for the current eight-robot integration, and `docs/GAMEPLAY_TUNING.md` for accepted gameplay behavior. Earlier gate notes are historical, not instructions to restore older behavior.

## Workspace and tools

- Work in this repository. Keep source, runtime assets and durable artifacts here; never rely on a system cache for application data.
- Use the pinned pnpm version in `package.json`. `pnpm dev` serves localhost on port 5173; do not stop an existing user-owned server.
- Browser testing is local. Use Safari or an isolated in-app browser; leave the user's Chrome profiles alone unless explicitly requested.
- Do not create subagents unless the user explicitly requests delegation.
- Core maintainer work develops directly on `main` unless the user requests otherwise; push only `main`, never `codex/` branches. Robot contributor sessions starting at `ROBOT_AUTHORING.md` are the explicit exception: develop on `robot/<team>-<name>` and push only that branch, never `main`. Use the entry file's branch checks and PR integration-point disclosure rules.
- Follow the user's latest scope, testing preference and accepted changes. In particular, do not turn a planning request into an unrequested product rewrite or deployment.

## Architecture and invariants

- `src/sim/` owns fixed-step simulation, fuel ownership, aim, contacts, hub returns and match rules. Keep React, DOM, audio and Three.js out of it.
- `src/view/` renders and adapts browser input. `src/App.tsx` and `src/components/` own interface state.
- SI units; X runs along the field, Y is up, Z across it. Blue is +X. The robot shoots along local +X and intakes along −X.
- Run simulation at 120 Hz. Rendering, settings and wall-clock timers must not change match progression.
- Preserve one stable ID/body per fuel. Capturing, storing, shooting, processing, returning and restarting must conserve the configured supply (currently 504).
- AUTO and teleop are both driver-operated. Keep the disabled assessment gaps and processed-fuel scoring windows.
- Controls: WASD drive, J/L turn, Shift intake, Space align/shoot/pass, Q reverse, C toggle supported climbers, V toggle supported manual intakes, R restart the selected session.
- 2910 starts retracted and passively deploys both assemblies. The hopper stays out. Only the intake compresses while shooting and returns out when shooting stops.
- Retain horizontal fuel displacement and stable collision support. Bump-only visual lean is intentional; free physical tipping is not the current model.
- Preserve the approved follow-camera framing and field occlusion behavior unless the task changes them.
- Launch opens singleplayer setup with the registered CAD robot roster, alliance and pose selection. Active play shows only the scoreboard. Escape owns pause/settings/restart/back-to-setup; no fuel HUD, controls overlay, toolbar or singleplayer foul UI. High Tide and the fictional trainer are removed. Inspector, tuning and development shortcuts belong only in development builds.

## Assets and publication

- The project owner explicitly authorized the noncommercial v1 runtime publication on November 1, 2026, deferring license review. This supersedes the earlier local-only asset restriction; see `docs/V1_PUBLICATION.md`.
- Only the prepared field data/model, exact `public/assets/robots/*/robot.glb` outputs and six match samples are allowlisted in Git. Keep original CAD, binders, conversion reports, caches, credentials and `node_modules` excluded. Do not broaden that allowlist without a task requiring it.
- `assets/runtime-manifest.json` records common payloads; `assets/robots/<id>/runtime.json` records each robot's paths, sizes, hashes and redistribution-review status. Build/check tooling aggregates them without browser-side discovery. `pnpm assets:check` validates the payload. The separate `pnpm assets:check:release` remains a license-record audit and is not the v1 build gate.
- `pnpm build:release` must retain asset-integrity, TypeScript/Vite and production-payload checks. Do not mark unreviewed third-party material cleared or infer CAD rights from the reference code's MIT license. Preserve attribution and source/license records.
- A clean clone now contains the complete runtime pack. The Vercel config pins pnpm 10.20.0 explicitly for install and build; Node 26 is pinned in `package.json`.
- Do not publish a site or change hosting/account settings unless asked. GitHub pushes and CI checks do not themselves authorize a manual deployment.

## Verification and changes

- Match the verification to the change. Do not repeatedly run broad browser/physics benchmarks for small edits. Respect an explicit request to skip tests and say what was skipped.
- `pnpm test:unit`: asset-independent rule/audio schedule checks.
- `pnpm test:robots`: all registered robot definition, prepared-model and shared simulation acceptance checks. New contributions start at the comprehensive `ROBOT_AUTHORING.md`; keep robot files independent and disclose shared integration points in PRs.
- `pnpm test:sim`: complete simulation checks, serial workers to avoid memory/CPU contention; requires local field assets.
- `pnpm build`: TypeScript and Vite compilation (shell-only clones allowed). `pnpm build:local`: source-pack integrity, complete build and production-payload checks. `pnpm build:release`: the same integrity/build/payload checks for the owner-authorized v1 release. `pnpm preview` serves the production interface on port 4173.
- For gameplay changes, run relevant simulation cases when authorized. Update assertions when the intended behavior changes; do not weaken checks to hide regressions.
- When UI is changed, use one focused local browser check when appropriate, rather than exhaustive exploration.
- Keep commits scoped and descriptions concrete. Review staged files and sizes before pushing. Never force-push or rewrite published history without an explicit request.
- Do not send messages to teams/asset owners, publish a site, or change service/account settings unless the user authorizes that action.
