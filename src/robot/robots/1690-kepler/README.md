# 1690 Orbit · Kepler

The prepared team-release model and user-approved card tuning, isolated without parameter changes. See [full sources, estimates and behavior](../../../../docs/KEPLER.md), [stage 19.5 acceptance](../../../../docs/STAGE_19_5.md) and [authoring entry](../../../../ROBOT_AUTHORING.md).

`definition.ts` owns this robot's geometry, packing, tuning and side-hook L1 profile; it does not inherit Re•Blitz. `visual.ts` binds the real turret, hood, passive kicker and CAD climber. Preparation remains in `scripts/prepare-kepler.mjs` and `scripts/rig-kepler-climber.mjs`. Pinned input records remain in `assets/kepler-cad-sources.json`; the prepared output record is `assets/robots/1690-kepler/runtime.json`. Detailed checks remain in `src/sim/Kepler.test.ts` and `StageCleanup.test.ts`.
