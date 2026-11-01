# Singleplayer v1 publication and Vercel import

November 1, 2026. The project owner approved the local singleplayer preview and explicitly authorized proceeding with a noncommercial v1 publication, deferring license review. That instruction supersedes the earlier local-only runtime restriction and license-review build gate.

The prepared field/model data, robot model and six match samples are now included in Git. Original CAD exports, binders, conversion reports, caches and credentials remain excluded. Source, attribution, license files and hashes are retained. The `pending` third-party redistribution-review statuses are unchanged: the owner's decision is not recorded as third-party license clearance.

`pnpm build:release` still requires every runtime file to match its recorded size/hash, then type-checks, builds the production interface and checks the complete output. The separate `pnpm assets:check:release` remains available as a license-record audit; it is no longer a blocking v1 build step.

## Import in Vercel

Import `shrysjain/jamesim`, branch `main`, from the repository root. The committed `vercel.json` supplies the install, build, output and cache settings; no dashboard command overrides or environment variables are required.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root directory | Repository root (`./`) |
| Node.js | 26.x (also pinned by package.json) |
| Install command | `npx --yes pnpm@10.20.0 install --frozen-lockfile` |
| Build command | `npx --yes pnpm@10.20.0 run build:release` |
| Output directory | `dist` |
| Environment variables / functions / database | None |

The explicit pnpm invocation avoids Vercel selecting an older pnpm for a generic custom install command. See [Vercel package-manager selection](https://vercel.com/docs/package-managers). All models, collisions, fonts and audio come from the checkout; the build never needs the original CAD or a separate media upload.

The user will import and deploy the project. This preparation does not create a hosting project or deploy a site. Once it is imported, pushes may trigger Vercel's normal Git deployments according to the user's project settings.

## First hosted smoke check

After the user deploys: open the provided URL, confirm direct AUTO with 8/55 fuel, drive/intake/shoot, restart with R, change a setting and reload. Check a warm reload for missing assets or mismatched versions. The local preview has already passed the recorded singleplayer acceptance checks; this last check verifies the host configuration.
