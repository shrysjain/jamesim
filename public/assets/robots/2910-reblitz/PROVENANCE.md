# 2910 Re•Blitz runtime asset

Source: [Team 2910 release](https://www.chiefdelphi.com/t/2910-cad-and-tech-binder-release-2026/521705), [Onshape assembly](https://2910.onshape.com/documents/dfb391aac173a4555d00a5b5/w/3dc64f602735252892b0e47b/e/6c654da4eb6b1710fb0900bd).

Collecting and starting configurations were downloaded from the public viewer as GLB, medium resolution, original Z-up orientation, with bumpers and battery included. Source files, binder, code references, licenses and SHA-256 hashes live in `assets/source/robots/2910-reblitz/`. Conversion is reproducible with `pnpm assets:robot`.

Collecting source SHA-256: `f1b4e4b05d99ca56d675e119e185aaa7bedb825cb78d559b2d52c7f039f702f6`. Prepared model: 4,140,124 bytes, 647,441 triangles. Source units are meters; transform `(X,Y,Z)` to `(Y,Z−0.21665,X)`. No scaling. Parts are simplified to a nominal 1.2 mm geometric error budget, small hardware/origin markers removed, and surfaces batched without merging mechanism frames. Materials provide translucent hopper panels and blue bumpers; texture logos/number decals are not included.

`asset-report.json` records source bounds, parts and mechanism frames. `src/robot/RobotDefinition.ts` supplies the compound collision approximations and separates measured geometry from estimated mass/inertia. Compare configuration transforms with `node scripts/compare-robot-poses.mjs`.

CAD and binder remain Team 2910's materials. Their redistribution license has not been established; the retained MIT code license applies to the reference code, not automatically to CAD. This asset is for the authorized local development workspace pending terms review before external publication.

Gate 2 removes the source robot’s single `Fuel` part from the prepared GLB. All visible gameplay fuel now comes from stable simulation IDs. White 2910 bumper numbers are local canvas decals added by the renderer; the original CAD is retained unchanged.

Publication update, November 1, 2026: the project owner authorized including the prepared runtime payload for the noncommercial v1 release and deferred license review. Earlier local-only statements describe preparation history. Source/license review status is unchanged; see `docs/V1_PUBLICATION.md`.
