# Local runtime assets and public Git

The public repository contains the application, tests, offline preparation tools, source URLs/hashes, provenance and OFL-licensed fonts. The existing working directory also contains a local runtime media pack. These are different sets: a fresh Git checkout can compile the application shell but cannot play the game until that pack is installed.

`assets/runtime-manifest.json` records the required prepared files, byte sizes and SHA-256 hashes. `pnpm assets:check` validates a local pack. `pnpm assets:check:release` additionally requires redistribution clearance with source evidence for every group. The three pending groups are FIRST field derivatives, 2910 CAD and match audio.

## Required files

- `public/assets/rebuilt-field.glb`, `field-collisions.json`, `field-manifest.json`.
- `public/assets/robots/2910-reblitz/robot.glb`.
- `public/audio/frc/{start,end,resume,shift_change,warning,abort}.wav`.
- The font files and OFL notices under `public/fonts/` (included in Git).

The original STEP/GLBs, intermediate meshes, binder PDF/full extraction and local browser screenshots are not required by the browser and are excluded from Git. Keep them in the existing workspace if needed for offline preparation. Never depend on a system cache.

## Developing from a clean checkout

```sh
pnpm install --frozen-lockfile
pnpm test:unit
pnpm build
```

Those commands validate rules/cue timing and compile code, not a playable public release. For full gameplay, place an authorized copy of the prepared pack at the paths above, then:

```sh
pnpm assets:check
pnpm dev
```

Run `pnpm test:sim` for the complete simulation checks once the pack is present. Source and conversion instructions are in README and the retained provenance files. Do not infer an automatic right to publicly redistribute a prepared model because its source can be downloaded.

## Publication

Before a public site or media commit, establish permission/license terms or replace the pending assets. Record the evidence in the manifest and relevant provenance; do not just flip a status flag. See the [release plan](SINGLEPLAYER_RELEASE_PLAN.md) for the blocking questions and alternatives. The release build intentionally fails while files or clearance are missing:

```sh
pnpm build:release
```

Normal Vite `pnpm build` remains available for source-only CI and local development. Do not configure public production deployment to bypass the release preflight. No public deployment is created by the repository's checks workflow.

After clearance, preferably commit the roughly 14 MiB prepared runtime pack with versioned URLs, while continuing to exclude the roughly 400 MiB raw/intermediate preparation workspace. A separately supplied approved versioned build pack is also possible. CI does not currently fetch missing media from third parties or publish it as an artifact.
