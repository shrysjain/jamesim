# Field asset provenance

- Source: FIRST official 2026 REBUILT field STEP, linked from https://www.firstinspires.org/resources/library/frc/playing-field
- Download: https://firstfrc.blob.core.windows.net/frc2026/FieldAssets/FE-2026-rev-rebuilt-playing-field.step
- SHA-256: `2ad90e42f2c2db0fab5b22bb65aa0851089e414d568d4ebd127624fa230c7671`
- Source downloaded October 30, 2026. The STEP header identifies Onshape and a January 2026 export; later drawing revisions are not assumed to be reflected in this model.
- Original source is retained in the project at `assets/source/field.step` and is not required at runtime.
- `rebuilt-field.glb`: locally converted, batched visualization of the source assembly, with small hardware excluded. Fuel is rendered separately with GPU instancing.
- `field-manifest.json`: normalized field element bounds, fuel centers, asset references, and source hash. The CAD includes 456 fuel, including depot/outpost supplies. The 48 unused robot preloads are added in neutral-zone rows, yielding 504 for this robot-free field.
- `field-collisions.json`: separately prepared static contact geometry plus a solid floor. Individual beams/panels use convex proxies; concave hub passages and trench risers retain source surfaces. It excludes decorative markings, small hardware, and the scoring table. It is a starting inspection model, not calibrated competition physics.
- Browser frame: meters, X along field length, Y up, Z across field width. Source STEP uses Z up; conversion rotates it and recenters it at the carpet surface.
- Visual limitations: engineering CAD does not contain all production textures, printed signage, or AprilTag image textures. Duplicate vinyl skins are omitted to avoid coplanar flicker, and netting has a procedural cutout material. The geometry preserves tag plates; vision simulation is outside this milestone.

FIRST retains its rights in its official field model, marks, and materials. FIRST's season materials page requests no re-hosting/redistribution. These prepared assets are for the requested local development and have not been published. Review the applicable redistribution terms before external deployment. No assets or code were taken from FRSim or MoSimulator.

The fonts under `public/fonts` are Barlow and Barlow Condensed, obtained from the Google Fonts repository under their included SIL Open Font License files. The OpenCascade conversion dependency is a development-only tool, with its license retained by the installed npm package; it is not shipped in the runtime bundle.

Publication update, November 1, 2026: the project owner authorized including the prepared runtime payload for the noncommercial v1 release and deferred license review. Earlier local-only statements describe preparation history. Source/license review status is unchanged; see `docs/V1_PUBLICATION.md`.
