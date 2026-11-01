# 2910 Re•Blitz

The original Jamesim baseline, isolated without tuning changes. See [CAD preparation](../../../../docs/REBLITZ_ASSET_GATE.md), [accepted behavior](../../../../docs/GAMEPLAY_TUNING.md) and [authoring entry](../../../../ROBOT_AUTHORING.md).

`definition.ts` owns physical parameters, pickup/shooter geometry and colliders; `cargo.ts` owns the unchanged 55-position packing including the fixed feeder pocket. `visual.ts` declares the existing GLB assemblies. Common timing/recovery/aim defaults remain in the shared simulation. Source records are historical in `assets/source/robots/2910-reblitz/`; the prepared output record is `assets/robots/2910-reblitz/runtime.json`. Existing intake/shooter/physics tests remain the detailed regression baseline.
