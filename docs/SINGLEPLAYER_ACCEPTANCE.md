# Singleplayer release candidate — local acceptance

November 1, 2026. The v1 player flow is implemented and prepared for the user's local review. Nothing has been deployed or connected to a hosting project. Publication still requires recorded runtime-media clearance; user acceptance on the intended machines remains the final release decision.

## Try the production interface

```sh
pnpm build:local
pnpm preview
```

Open **http://127.0.0.1:4173/**. The local asset pack is already installed in this workspace. The production preview automatically enters a timed blue-alliance match with eight preloads. `R` restarts from play, pause or results, with the same hub tie seed. `pnpm dev` on port 5173 remains the development interface and includes the separate Debug panel; do not use it to judge whether development tools ship publicly.

Settings include volume/mute, low/medium/high graphics, controls-hint visibility and restore defaults. They persist across reloads and do not change simulation frequency, fuel, rules or shooting. Settings/help freeze the match and restore its prior running state. Focus loss overrides that restoration and requires explicit resume. Dialogs trap keyboard focus; Escape closes them.

## Automated evidence

- **85/85 checks passed across 11 suites**, including the full simulation set, settings validation/storage fallbacks, production collision packing and browser-audio scheduling/cancellation. No broad physics benchmarks were repeated for these interface changes.
- TypeScript and the production build passed.
- `pnpm check:build` verifies the complete local production payload: ten content-hashed field/robot/audio files, exactly equivalent Rapier float32/uint32 collision geometry, required credits/licenses/identity files, and no inspector/session-setup strings or preparation artifacts.
- All 17 source runtime-pack files passed their recorded size/hash checks. The local check does not assert redistribution permission.
- The release preflight continues to reject the three media groups whose supporting redistribution records are pending. No status was changed on assumption and no ignored CAD/audio was force-added to Git.

## Focused production-browser pass

Chromium in the isolated in-app browser:

- Fresh direct AUTO start with 8/55 fuel; no setup/menu click. No Debug control or development shortcuts in the production interface.
- Changed mute, volume to 25%, low graphics and hint visibility; reloaded and observed the same choices. Restored defaults.
- Opened settings from a running match; closing resumed. Opened help from a paused match; closing retained pause.
- R from pause restored fresh preloads/score/time. Driver-requested shooting launched all eight preloads and scored eight AUTO points.
- Let the complete normal match timeline reach its final results, showing 8–0. Observed normal hub shifts during play. R from the results dialog restored 8/55, 0–0 and fresh AUTO without a setup screen.
- Drove through the field and collected 40 fuel. Reverse at a blocked outlet retained cargo; after driving clear, reverse reduced the inventory from 40 to 27. Recollection increased it again. A separate full-hopper browser run was not repeated; 55-ball packing, compression, loaded bump/trench passage and firing are covered in the passing simulation checks.
- Console warning/error log was empty during the inspected play sequence. Audio schedule/unlock/late-cue/cancellation behavior has unit coverage; this was not an independent audition of every sample.

Safari uses the same production preview, not the Vite development bundle. Fresh entry loaded the full field/robot and AUTO, with no Debug control; keyboard intake and strafing collected 50 fuel. The first local navigation was observed ready within 4.1 s and a warm reload within 1.2 s. These are coarse UI-observation upper bounds, including automation/observation overhead, not CDN download measurements or performance guarantees. Switching away from the production tab and returning retained an explicit pause. The play view is saved locally as `singleplayer-release.jpg`.

## Payload observations

- Collision data: **6,204,027 bytes JSON → 3,859,004 bytes packed**, about 38% smaller. Local gzip comparison: 1,472,984 → 1,334,096 bytes. Packing preserves the float32 geometry already used by Rapier and avoids parsing the large coordinate arrays as JSON at startup.
- Player shell JS: about **245 kB** before compression. Three.js/loaders, physics and the viewer load as separate hashed chunks; the loader UI is available before the engines finish loading.
- The embedded Rapier WASM/JS physics chunk remains about **4.33 MB / 1.67 MB gzip** and retains Vite's large-chunk advisory. It is the principal remaining engine payload; no worker or engine rewrite was added.
- Medium defaults to a 1.25 pixel-ratio cap and 1024 px shadows. Low uses a 1.0 cap with shadows disabled; high uses 1.75 and 2048 px. Physics stays at 120 Hz in all presets.
- Production emits only the runtime allowlist, owned identity graphics, fonts/OFL notices and retained dependency/media notices. Raw CAD, binders, conversion reports and QA images stay out of the site.
- Runtime URLs use content hashes, including the collision format and field metadata. The proposed hosting configuration revalidates HTML and marks hashed assets immutable. An old client cannot silently fetch different model/collision data under the same URL; a missing old version produces a loading error/retry instead.

## Before public launch

1. User playtest/sign-off on the local production interface, including preferred graphics on the main computer and a representative lower-spec laptop. Automated checks do not establish a frame-rate guarantee on another machine.
2. Attach source evidence to the pending field/CAD/audio redistribution records, or supply publishable replacements. `pnpm build:release` remains the public-build gate.
3. When explicitly requested, create a hosting preview and repeat the small host-specific asset/cache/HTTPS check before public promotion. No deployment was performed during this work.
