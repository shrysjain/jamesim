# 2910 Re•Blitz

Performance update (November 2, 2026): [the lineup research audit](../../../../docs/ROBOT_PERFORMANCE_RESEARCH.md) supersedes earlier rate, drive/traction and motion-rating estimates below. CAD/capacity and previous validation descriptions remain historical evidence.

The original Jamesim baseline, isolated without tuning changes. See [CAD preparation](../../../../docs/REBLITZ_ASSET_GATE.md), [accepted behavior](../../../../docs/GAMEPLAY_TUNING.md) and [authoring entry](../../../../ROBOT_AUTHORING.md).

`definition.ts` owns physical parameters, pickup/shooter geometry and colliders; `cargo.ts` owns the existing 65-position packing including the feeder pocket. `visual.ts` declares the existing GLB assemblies. Common timing/recovery/aim defaults remain in the shared simulation. Source records are historical in `assets/source/robots/2910-reblitz/`; the prepared output record is `assets/robots/2910-reblitz/runtime.json`. Existing intake/shooter/physics tests remain the detailed regression baseline.

## Feeder shaft frames and bulk filling (#55)

The seven prepared feeder assemblies had pivots about 8.718 mm off their actual
cross-section centers. Rotating them therefore moved the visible roller center
through an approximately 17.44 mm circle. `repair-rollers.mjs` derives each shaft
center from its complete retained mesh, then rebases its node and direct children
in opposite directions. Zero-angle geometry stays in place; the GLB's entire
embedded BIN chunk is byte-for-byte unchanged. The runtime size/hash record is
updated without changing source attribution or redistribution status.

Run `node src/robot/robots/2910-reblitz/repair-rollers.mjs` from the repository root
to repair an existing prepared asset. Repeating it is a no-op. The original
offline converter also invokes this stage, so regeneration retains the fix.

Captured fuel now enters through a fitted handoff at `(-.37,.10,z)` with incoming
Z preserved inside the .27 m half-width. It then settles through the existing
local sphere dynamics. Previously each transfer flew directly to its assigned
storage-grid position, spreading handoffs over roughly .74 m of hopper length.
Preloads still use the same seeds; capacity remains 65 original fuel bodies.

The handoff is a gameplay fit behind the intake, not a team-published coordinate
or a compliant per-roller contact model. The existing hopper contact envelope,
mass, rates, drive response and shooter limits are retained. Regression checks
cover real RobotView rotation/preview, physical capture across the intake width,
full-load sphere separation, gravity settling, pause/restart and original bodies.
