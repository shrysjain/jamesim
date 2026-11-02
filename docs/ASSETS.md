# Runtime assets and builds

The repository includes the prepared field/model data, 2910 runtime model, six match sounds and fonts needed for a complete clean-clone build. Original STEP/GLB exports, binders, conversion reports and QA captures remain local and excluded.

The project owner explicitly authorized noncommercial v1 publication on November 1, 2026, deferring license review. This supersedes the earlier local-only restriction. See [the decision and Vercel instructions](V1_PUBLICATION.md). Redistribution-review statuses in `assets/runtime-manifest.json` and per-robot `assets/robots/<id>/runtime.json` remain factual and unchanged; this is a project-owner publication decision, not a new third-party license.

## Required files

- `public/assets/rebuilt-field.glb`, `field-collisions.json`, `field-manifest.json`.
- `public/assets/robots/2910-reblitz/robot.glb`.
- `public/audio/frc/{start,end,resume,shift_change,warning,abort}.wav`.
- The font files and OFL notices under `public/fonts/` (included in Git).

The original STEP/GLBs, intermediate meshes, binder PDF/full extraction and local browser screenshots are not required by the browser and are excluded from Git. Keep them in the existing workspace if needed for offline preparation. Never depend on a system cache.

## Clean checkout

```sh
pnpm install --frozen-lockfile
pnpm test:unit
pnpm build:release
pnpm preview
```

`pnpm assets:check` verifies every recorded size/hash. `pnpm build:release` runs that integrity check, TypeScript/Vite compilation and the complete production-payload check. Missing or changed assets still fail the build. The separate `pnpm assets:check:release` audits source-backed redistribution clearance and will continue reporting the pending field, CAD and audio reviews; the owner has deferred that audit as a v1 publication gate.

## Production packaging

The Vite runtime-assets plugin allowlists recorded payloads instead of copying the whole public directory. It emits content-hashed model, metadata and audio files. Collision JSON is packed into a hashed binary containing exactly the float32 vertices and uint32 indices Rapier used before. Source JSON and hashes remain unchanged. All browser asset references resolve through the same generated URL map.

`pnpm check:build` verifies the packed geometry and checks for missing/unexpected files or development interfaces. Font/OFL files and retained media/dependency notices ship alongside the owned favicon/social image. No raw CAD conversion or external asset download is required during hosting builds or browser startup.
