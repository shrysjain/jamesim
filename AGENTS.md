# Working on Jamesim

Jamesim is a browser-only FRC 2026 REBUILT simulator. Read `docs/SINGLEPLAYER_RELEASE_PLAN.md` for the current release scope and `docs/GAMEPLAY_TUNING.md` for accepted gameplay behavior. Earlier gate notes are historical, not instructions to restore older behavior.

## Workspace and tools

- Work in this repository. Keep source, runtime assets and durable artifacts here; never rely on a system cache for application data.
- Use the pinned pnpm version in `package.json`. `pnpm dev` serves localhost on port 5173; do not stop an existing user-owned server.
- Browser testing is local. Use Safari or an isolated in-app browser; leave the user's Chrome profiles alone unless explicitly requested.
- Do not create subagents unless the user explicitly requests delegation.
- Follow the user's latest scope, testing preference and accepted changes. In particular, do not turn a planning request into an unrequested product rewrite or deployment.

## Architecture and invariants

- `src/sim/` owns fixed-step simulation, fuel ownership, aim, contacts, hub returns and match rules. Keep React, DOM, audio and Three.js out of it.
- `src/view/` renders and adapts browser input. `src/App.tsx` and `src/components/` own interface state.
- SI units; X runs along the field, Y is up, Z across it. Blue is +X. The robot shoots along local +X and intakes along −X.
- Run simulation at 120 Hz. Rendering, settings and wall-clock timers must not change match progression.
- Preserve one stable ID/body per fuel. Capturing, storing, shooting, processing, returning and restarting must conserve the configured supply (currently 504).
- AUTO and teleop are both driver-operated. Keep the disabled assessment gaps and processed-fuel scoring windows.
- Controls: WASD drive, J/L turn, Shift intake, Space align/shoot/pass, Q reverse, R restart a timed match.
- 2910 starts retracted and passively deploys both assemblies. The hopper stays out. Only the intake compresses while shooting and returns out when shooting stops.
- Retain horizontal fuel displacement and stable collision support. Bump-only visual lean is intentional; free physical tipping is not the current model.
- Preserve the approved follow-camera framing and field occlusion behavior unless the task changes them.
- Production v1 should open directly into a timed match with settings and a small fuel/status HUD. Inspector, tuning and development shortcuts belong only in development builds.

## Assets and publication

- The public Git repository currently contains code, source URLs, hashes, provenance and redistributable fonts, not the pending-clearance CAD/audio payloads or binders.
- `.gitignore` deliberately excludes those local payloads. Do not force-add them or infer CAD/media permissions from the MIT license on Team 2910's reference code.
- `assets/runtime-manifest.json` lists the expected local runtime payloads. `pnpm assets:check` checks presence and hashes; `pnpm assets:check:release` also requires recorded redistribution clearance.
- A clean clone can type-check/build the application shell and run asset-independent unit checks. Full gameplay and asset-dependent tests require the local asset pack described in `docs/ASSETS.md`.
- Public deployment must use `pnpm build:release`, not the shell-only build. Do not mark an unreviewed asset cleared without source evidence. Preserve attribution and license records.
- Do not upload original CAD/binders, caches, credentials or `node_modules`. Do not deploy automatically as part of routine commits.

## Verification and changes

- Match the verification to the change. Do not repeatedly run broad browser/physics benchmarks for small edits. Respect an explicit request to skip tests and say what was skipped.
- `pnpm test:unit`: asset-independent rule/audio schedule checks.
- `pnpm test:sim`: complete simulation checks, serial workers to avoid memory/CPU contention; requires local field assets.
- `pnpm build`: TypeScript and Vite compilation. `pnpm build:release`: asset clearance checks plus the production build.
- For gameplay changes, run relevant simulation cases when authorized. Update assertions when the intended behavior changes; do not weaken checks to hide regressions.
- When UI is changed, use one focused local browser check when appropriate, rather than exhaustive exploration.
- Keep commits scoped and descriptions concrete. Review staged files and sizes before pushing. Never force-push or rewrite published history without an explicit request.
- Do not send messages to teams/asset owners, publish a site, or change service/account settings unless the user authorizes that action.
