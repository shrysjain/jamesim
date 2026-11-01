# Jamesim v1 singleplayer release

Plan date: November 1, 2026. This is the next implementation plan, not a claim that the launch interface is already built. GitHub preparation is authorized now; the public site is not being deployed in this step.

## The release we are building

Open the URL, load the field and 2910, and automatically enter a timed solo match. No title screen, robot selection or session-setup menu. `R` restarts the entire match. Keep the field/robot view dominant, with match time and score, fuel count/capacity, a short mechanism/aim status, and a small settings/help entry point.

Use the accepted controls: WASD, J/L, Shift intake, Space shoot/pass, Q reverse. AUTO stays driver-operated. Default to the current blue 2910 setup with eight existing preloads, 504 total fuel, and the regional/district fuel target profile. A new visit/new match can choose a fresh hub tie seed; `R` should reproduce the current match seed for consistent retries.

No accounts, leaderboard, robot picker, gamepad/mobile controls, multiplayer, replay system, climbing, penalties or tournament simulation are required for v1. Public results should describe this as a **solo fuel match** and avoid implying a complete competition score. Those additions should not delay this release.

## What already works

| Area | Current state |
| --- | --- |
| Environment | Official field conversion, 504 fuel, local fonts, animated Team 2910 model |
| Driving | Field-relative swerve, keyboard controls, field contacts, bump heave/visual tilt, anti-beaching fuel displacement |
| Robot | Passive deployment, 55-fuel inventory, intake/reverse, compression, four-lane shooting and passing |
| Aiming | Chassis alignment, stationary firing, adjustable hood, physical projectiles, seeded release variation |
| Match | Driver-operated AUTO, teleop transition/shifts/endgame, assessment gaps, hub lights, processed-fuel scores, results |
| Continuity | Stable fuel IDs, hub return/recollection, pause/focus handling, world/match restart |
| Presentation | Approved follow camera and occluder fading, fuel/status readouts, match sounds and mute |

The remaining work is mainly product flow, settings, production cleanup and publication readiness. The current application still starts in free practice and exposes the field lab through Debug.

## 0. Establish the repository and publishable asset set

**Completed:** initialized `main`, pushed scoped baseline commits, added `AGENTS.md`, documented the release, and added basic CI. The working local asset pack remains intact.

The first public push excludes pending-clearance payloads: field/robot GLBs and derived field data, match WAVs, the team binder and its full extracted text, large source exports and local QA screenshots. Font files with retained SIL OFL licenses and reference Java files with their MIT license can be included. Sources, hashes and provenance stay in Git.

**Before deployment:** establish redistribution terms for the FIRST field derivatives, 2910 CAD and audio, or replace them with assets we can publish. FIRST's [season-materials page](https://www.firstinspires.org/resources/library/frc/season-materials) requests no re-hosting/redistribution. The team's code license does not automatically cover CAD; Cheesy Arena's retained license is limited. These are concrete unresolved asset questions, not a Vercel limitation. Do not contact the owners without the user's authorization.

Maintain an asset clearance record and build preflight. Once cleared, include the small prepared runtime files in Git (preferred for this v1 size) or supply a versioned approved pack during the build. Do not download raw CAD on a player's browser or rebuild 400 MB of CAD during every Vercel deployment.

**Done when:** a fresh checkout plus the approved asset source can produce a complete release; every distributed asset has a source, hash and permission/license record. A build cannot silently publish a shell with missing models/audio.

## 1. Replace the field-lab entry flow with direct timed play

Main files: `src/view/FieldViewer.ts`, `src/App.tsx`, `src/components/MatchUI.tsx`, `src/sim/FieldSimulation.ts`.

1. Finish loading physics, both models, fonts and fuel before starting the match clock. Show clear loading progress and a useful retry message on failure.
2. Start the timed default match automatically. Use a short automatic 3–2–1 count-in if needed to give the player control; no menu or required Start button.
3. Route initial load, `R` and the results' restart action through one match-start path. Reset robot/cargo, fuel, score, hub queues, aim, modules, inputs, clock, cues and results state together.
4. Make `R` work while playing, paused, and viewing results. **Current gap:** the App keyboard handler returns early on results, so `R` currently cannot restart there. Do not trigger restart while typing/rebinding in a focused control.
5. End at the existing final-assessment boundary; show a compact fuel result and a clear `R`/restart action. Remove practice/setup branches from the public flow.
6. Keep focus-loss/tab-hidden pause and clear held input. Resume explicitly; never resume into a stale movement/shoot command. Settings/help should preserve whether the match was running before they opened.
7. Handle browser audio policy: the match may start automatically, but audio must unlock on a real click/key. Do not make a misleading promise of audible first-load start cues without user interaction. Do not replay an old start sound late into a match.

**Done when:** opening the URL enters a full timed match; `R` reliably produces the same clean starting conditions from every gameplay screen; loading/focus changes do not consume or skip match time.

## 2. Add basic settings and finish the public HUD

Main files: a small `SettingsDialog`, a typed settings module, `src/App.tsx`, `src/view/FieldViewer.ts`, `src/view/MatchAudio.ts`, `src/style.css`.

Settings for v1:

- Master volume and mute, affecting all match cues.
- Low / medium / high graphics presets controlling render pixel ratio and shadow cost. Pick a reasonable default; do not change physics rate, fuel count, scoring or trajectory accuracy by preset.
- Show/hide the controls hint. Keep a short static controls/help view accessible from the game.
- Restore defaults. Persist validated, versioned settings in localStorage, with safe fallbacks if storage is unavailable or old settings are invalid.

Optional if trivial: fullscreen from an explicit user click. Camera retuning, rebinding, alliance selection and configurable event profiles can wait unless the user specifically wants them in v1.

HUD:

- Keep the existing camera and approved visual style.
- Main scoreboard: match/phase time, fuel score and hub active/inactive state.
- Fuel: `count / 55` with short states such as Intaking, Full, Compressing, Reversing or Holding.
- Shoot status when relevant: Aiming, Waiting to stop, Spinning up, Blocked, Empty or Out of range. RPM, tire contact, mass, solver cost and lane meters are development information.
- Keep restart, pause, settings and help easy to find; avoid an on-screen tutorial wall.
- Keep keyboard focus and accessible labels usable; make any modal fit smaller desktop/laptop viewports.

**Done when:** settings persist across reloads, apply immediately, never change simulation outcomes, and the player can understand why the robot is or is not shooting without opening diagnostics.

## 3. Remove development UI from production and tidy the code

1. Extract the current inline Debug panel from `App.tsx` into a development component. Guard it with `import.meta.env.DEV`, so a URL query cannot enable it on the public build.
2. Remove production Debug buttons/backtick bindings, inspection selection, fly/orbit/test-location shortcuts, pose sliders, probe controls, tuning and diagnostic overlays. Preserve useful tools for local development.
3. Gate development-only resource construction in `FieldViewer`: labels, debug mesh generation, selection/highlights and development event listeners. Merely hiding the panel does not remove these code paths.
4. Give the player shell one owner for modal/pause/restart state. Avoid a new generic state-management framework; small modules/components are sufficient.
5. Keep README and current model docs up to date; clearly label historical gate verification. The chassis-flight fix updated the older no-bump-tilt assertions to the accepted capped visual lean while retaining checks for stable collision support and no fuel beaching.
6. Keep the latest auto-boundary yaw cancellation, faster alignment and hopper-panel fit. Add a focused regression case for each meaningful failure path when practical; do not add tests that merely mirror constants or CSS.

**Done when:** a production build has no accessible inspector/tuning routes or shortcuts, normal gameplay is unaffected by development controls, and a developer can still inspect the local game.

## 4. Prepare the static production payload

Measured local snapshot: approximately 14 MiB under `public/`, 19 MiB built output, 5.32 MB application JS (about 1.94 MB gzip), and 647,441 triangles in the prepared robot. The 6.2 MB collision JSON is a notable part of the transfer. These are disk/build observations, not measured download times or a frame-rate guarantee.

1. After clearance, pin approved asset versions, validate hashes and retain attribution. Keep audit reports/source exports outside the public payload where they are not needed by players.
2. Split major engine/physics and UI chunks where it improves loading/cache reuse. Do not switch frameworks or add a backend to solve an existing chunk-size warning.
3. Measure one cold load and one warm load. Optimize the largest useful contributors first: collision JSON compression, robot geometry/material batches, shadow cost and render resolution. Do not add a physics worker or new collision engine without a measured need.
4. Version model/collision/audio URLs together. Long-lived immutable caching is safe only for versioned/hashed asset URLs; the current fixed filenames must revalidate or receive short cache lifetimes.
5. Provide WebGL/asset-loading failure messages and a simple unsupported-device message for keyboardless/mobile use. Full mobile play is outside v1.
6. Add page title/description, favicon/social preview and an About/Credits entry using approved marks/assets. Keep all runtime dependencies local to the deployed bundle; no cache-directory or external CAD-viewer dependency.

**Done when:** the production output contains the complete approved game, production-only entry flow and no accidental private/source files; the selected desktop graphics default is playable on the user's test machine and a representative lower-spec laptop.

## 5. Run a small release acceptance pass

Use checks proportional to the changes; do not repeat broad performance runs after everything passes.

- Asset-independent rules/cues, type checking and production build in CI on each push/PR.
- With the local approved field pack, run affected physics cases plus the complete simulation suite once before the release candidate. Keep timing based on simulation ticks and use serial workers if the machine is busy.
- One production-preview browser pass: fresh timed start; keyboard drive/intake/shoot/reverse; stop-to-fire; full hopper; bump and trench; AUTO-to-teleop boundary; hub shift; pause/focus loss; settings persistence; R while playing/paused/results; a complete match and results.
- Verify Safari and Chromium desktop behavior. User testing in Chrome is fine; automated work should respect the user's Chrome-profile preference. Check browser console, missing assets and audio unlock.
- Verify an old/warm browser load after a new deployment does not combine incompatible model/collision versions.

**Done when:** the user signs off on the complete singleplayer loop and the built deployment, rather than only the Vite development server. Local simulation coverage and the focused Safari check recorded with the chassis-flight fix do not replace this production release acceptance pass.

## 6. Deploy a preview, then the public release

Recommendation: **Vercel static hosting for v1**. Vite generates `dist`; Three.js, Rapier, match rules and all robot behavior run on the player's computer. No Vercel Function, database, account system or server-side simulation is needed. This is a static frontend deployment, rather than a serverless game backend. [Vite deployment guide](https://vite.dev/guide/static-deploy.html), [Vercel Vite guide](https://vercel.com/docs/frameworks/frontend/vite).

Proposed settings:

| Setting | Value |
| --- | --- |
| Git repository / production branch | `shrysjain/jamesim` / `main` |
| Framework | Vite |
| Root | Repository root |
| Node | `26.x`, matching the current local major and currently supported on Vercel |
| Package manager | pnpm 10.20.0, pinned in `package.json` |
| Install | `pnpm install --frozen-lockfile` |
| Build | `pnpm build:release` (asset/clearance preflight, then TypeScript + Vite) |
| Output | `dist` |
| Runtime secrets / functions | None |

Confirm the exact pnpm version in the first remote build log, rather than assuming Vercel's default. Use Git previews for review; avoid connecting automatic production deployment before the runtime assets and v1 flow are ready. This planning step does not create a Vercel project or publish the site.

Vercel's current docs list 100 GB/month Hobby Fast Data Transfer and a 100 MB source-upload limit for CLI deployments. The upload limit is not a per-game download limit; our raw 400 MB preparation workspace should not be deployed. At a hypothetical 15–20 MB per cold visit, 100 GB corresponds to roughly 5,000–6,700 cold visits before other traffic; actual compressed transfers, caching, revisits and limits will differ. Monitor real usage early. Hobby is suitable for a personal/noncommercial first launch; reassess terms and Pro if the project becomes commercial or traffic warrants it. [Hobby plan](https://vercel.com/docs/plans/hobby), [limits](https://vercel.com/docs/limits), [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [package managers](https://vercel.com/docs/package-managers).

After preview acceptance: connect the chosen domain, verify HTTPS/assets/settings, promote the tested commit, record a v0.1.0 tag/release and retain the previous known-good deployment for rollback. Keep scores local/untrusted; do not promise a secure global leaderboard from client-only state.

For later multiplayer, Vercel can continue hosting the frontend. Plan a separate persistent authoritative simulation/WebSocket service when that milestone starts; do not build multiplayer transport or a speculative backend into v1.

## Recommended implementation order

1. Repository/provenance/preflight and this plan (current task).
2. Direct timed entry + unified restart/results/pause flow.
3. Settings + production HUD/development separation.
4. Approved asset packaging + focused load/render cleanup.
5. Release acceptance, Vercel preview, user review, public promotion.

Asset clearance can proceed alongside interface work, but public deployment waits for it. This keeps the release focused on one complete, reliable robot and one playable timed game.
