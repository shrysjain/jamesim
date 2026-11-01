# Jamesim: REBUILT browser simulator research and development plan

Research date: October 30, 2026. Implementation status: the official field and detailed 2910 Re•Blitz swerve robot are available locally, with intake/storage/reverse, physical shooting/auto-aim/passing, gate 4 hub entry counting and fuel returns, and stage 5 solo timed fuel matches with autonomous, shifting hubs, processed-fuel scoring and results. Full competition rules and climbing remain open. The default screen is third-person practice, with inspection and tuning behind a Debug toggle. The browser loads the converted official field and 504 fuel. See [README.md](README.md) for setup, [docs/DRIVING.md](docs/DRIVING.md) for the contact model, and [docs/VERIFICATION.md](docs/VERIFICATION.md) for checks and current limits. The later milestones below remain the development roadmap.

**Recommendation.** Build a desktop-first browser game with TypeScript, Vite, Three.js, and Rapier 3D. Use React for menus and the HUD. Start with the field, then one dynamic swerve chassis, then fuel interaction and a complete robot. Finish a useful singleplayer practice game before expanding the robot roster or adding online multiplayer.

The initial product should offer easy access and readable controls like FRSim, with physically credible driving, collisions, and projectiles. Engineering-grade motor, electrical, and deformable-material simulation is a separate future scope.

**What was inspected**

- [FRSim REBUILT](https://rebuilt.frsim.com/): opened Beta v31 in Safari, entered singleplayer with 2910 Re-Blitz, started a match, drove forward/backward, strafed, turned, switched camera, tried intake/shoot controls, and paused. Inspected spawn placement, keyboard bindings, settings categories, scoreboard, and pause/restart options. This was a short qualitative session, not a latency or physics benchmark. Its internal renderer and physics implementation were not established.
- FRSim observations: quick robot/alliance/spawn selection; detailed robot models; a relatively quiet in-match display; follow and alternative camera views; separate translation and rotation controls; intake, score, climb, and robot-specific actions; remappable keyboard controls and a controller settings tab. The menu also exposes multiplayer, leaderboards, and replays, which were not evaluated.
- MoSimulator: inspected the installed v26.4.2 title screen and field presentation. Its Play control did not respond through automation, so no hands-on driving comparison was completed. The developers describe the REBUILT release as using physical robot-fuel interaction rather than animated or teleported handling. Their [release announcement](https://www.chiefdelphi.com/t/mosim-rebuilt-devlog/515773/36), [website](https://mosimulator.com/), and [modding documentation](https://docs.mosimulator.com/) were reviewed.
- Official rules, field resources, field drawing renders, full-field STEP header/structure, and candidate robot CAD resources.

Use the simulators as behavioral references. We should implement our own code and presentation and source model assets independently.

**Game facts that shape the design**

The following is a compact summary of the [official TU22 game manual](https://firstfrc.blob.core.windows.net/frc2026/Manual/2026GameManual.pdf), sections 5 and 6:

| Item | Relevant specification |
| --- | --- |
| Field | Approximately 16.54 m by 8.07 m; two hubs, towers, depots, and outposts; four bumps and four trenches. |
| Fuel | 15 cm diameter foam balls, approximately 0.203-0.227 kg. Standard setup: 504; championship setups may increase to 600. |
| Obstacles | Bumps approximately 16.54 cm tall with 15-degree ramps; trench clearance approximately 56.52 cm. |
| Match | 20 s autonomous, then 140 s teleop: 10 s transition, four 25 s shifts, 30 s endgame. |
| Hub state | Both active in auto, transition, and endgame. Auto fuel winner is inactive in shift 1; alternating thereafter; ties use a random selection. |
| Scoring | Active-hub fuel: 1 point. Tower auto L1: 15; teleop L1/L2/L3: 10/20/30. Eligibility includes support/contact conditions. |
| Details | Fuel recirculates into neutral space. Scoring has processing windows. Ranking thresholds differ by event profile. |

Consequences for implementation: use true 3D motion, configurable field materials, a dedicated rules state machine, seeded randomness, and an early full-count fuel benchmark. A flat top-down movement model would leave major gameplay interactions unresolved.

**Recommended stack and alternatives**

| Layer | Choice | Reason |
| --- | --- | --- |
| Language/build | TypeScript, Vite, pnpm, supported Node LTS | A small static client build and shared types for a later server. Pin exact dependency versions and retain a lockfile. |
| Rendering | Three.js, WebGL 2 baseline | Direct scene/camera control, glTF loading, and instanced repeated objects. Keep WebGPU an optional later enhancement. |
| Physics | Rapier 3D JavaScript/WASM | Rigid bodies, forces, colliders, queries, joints, sensors, and snapshots suit the proposed simulation. |
| Interface | React and CSS over the canvas | Familiar DOM controls and settings. Per-frame body transforms stay outside React state. |
| Input/audio/storage | Keyboard, Gamepad API, Web Audio; localStorage initially | Browser-native input, sound, and preferences; IndexedDB when replay storage becomes useful. |
| Asset preparation | Onshape/Fusion or FreeCAD for CAD tessellation; Blender for cleanup; glTF Transform for optimization | Convert engineering assemblies into runtime models offline. |
| Verification | Vitest for simulation/rules; browser smoke checks and performance captures | Validate behavior and frame budgets, not only screenshots. |
| Hosting | Static HTTPS hosting plus versioned assets | Singleplayer needs no application server or account system. |

Three.js' [renderer source](https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js), [glTF loader](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/GLTFLoader.js), and [instanced mesh implementation](https://github.com/mrdoob/three.js/blob/dev/src/objects/InstancedMesh.js) support this rendering approach. Rapier is [Apache-2.0 licensed](https://rapier.rs/docs/) and has [JavaScript/WASM bindings](https://rapier.rs/docs/user_guides/javascript/getting_started_js/). Vite produces a [static production build](https://vite.dev/guide/). Controller mapping and browser discovery behavior need testing against the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API).

Babylon.js plus Havok is the strongest alternative: a more integrated engine, useful tooling, and [WASM Havok integration](https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin/). I prefer Three.js plus Rapier here because the simulation can stay independent of presentation and later run in a headless process. That is an architectural preference, not a measured performance win.

Unity Web builds are viable, particularly for a Unity-experienced team. Godot is also viable, with [documented web-export constraints](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html). Neither is my first choice for this browser-first TypeScript project. React Three Fiber remains an option if scene authoring benefits from it; it is not needed to establish the engine. Next.js, a database, and a multiplayer framework add no necessary capability to the first milestone.

**Field and robot asset strategy**

| Source | Verified resource | Proposed use |
| --- | --- | --- |
| Official field | [FIRST field resources](https://www.firstinspires.org/resources/library/frc/playing-field), [Onshape assembly](https://cad.onshape.com/documents/8a691e28680da30504859fce/w/c6aa636fb23edb3f1e272fb1/e/c043973ea96914e2eaa1e8fc), [full STEP](https://firstfrc.blob.core.windows.net/frc2026/FieldAssets/FE-2026-rev-rebuilt-playing-field.step) | Geometry and assembly reference. Prefer the official competition field over simplified practice elements. |
| Official drawings | [Dimension package](https://firstfrc.blob.core.windows.net/frc2026/FieldAssets/2026-field-dimension-dwgs.pdf) | Validate placement, scale, clearances, and revisions. |
| FIRST KitBot | [Resource page](https://www.firstinspires.org/resources/library/frc/kitbot), [STEP](https://firstfrc.blob.core.windows.net/frc2026/KitBot/KB-2026-rev.step) | Known documented reference and later tank-drive candidate. |
| WCP Competitive Concept | [CAD, Onshape, BOM, and code](https://wcproducts.com/collections/viewall/products/2026-wcp-competitive-concept), [CAD ZIP](https://wcproducts.info/files/frc/cad/mcc/2026_WCP_CC.zip) | Strong candidate for the first detailed swerve robot after the generic prototype. Verify its mechanisms before committing. |
| REV Starter Bot | [Robot overview and CAD resource](https://docs.revrobotics.com/frc-kickoff-concepts) | Another documented reference; the published starter design leaves room for a separately designed climber. |

The full-field STEP is retained in this project at `assets/source/field.step`: 35,707,894 bytes, STEP AP242, Onshape origin, meter units, 973 PRODUCT definitions. These are CAD product definitions, not a runtime draw-call count. SHA-256: `2ad90e42f2c2db0fab5b22bb65aa0851089e414d568d4ebd127624fa230c7671`.

The linked STEP has a January release date; the dimension package includes February revisions. The local asset provenance records the exact source hash. The current environment uses that STEP; later drawing changes still need a targeted revision audit before competition fidelity is claimed. CAD has now been tessellated and optimized offline, and the resulting environment has been checked in Safari.

The asset pipeline should:

1. Establish meters, origin, handedness, and axes. Use one documented coordinate convention throughout the simulation; proposed internal convention is X along field length, Y up, Z across field width. Apply CAD/glTF transforms once at import, with explicit adapters for future WPILib coordinates.
2. Preserve assembly transforms and meaningful parts. Separate field structures, robot chassis, moving mechanisms, and decoration.
3. Tessellate CAD offline. Blender does not natively turn STEP assemblies into a game asset by itself; use a CAD exporter or STEP-capable conversion tool first.
4. Remove hidden internals, fasteners, and excessive curves; retain useful silhouettes, contact edges, and moving-part pivots. Preserve the hub opening, trench underside, and bump profile.
5. Export glTF/GLB, consolidate materials, instance repetition, and apply appropriate mesh/texture compression using [glTF Transform](https://gltf-transform.dev/cli). Measure decoded memory and draw calls as well as download size.
6. Author separate colliders: boxes, wedges, cylinders, and convex pieces. Use static triangle meshes selectively. A single convex hull around a hollow structure would incorrectly fill its openings; avoid detailed dynamic triangle-mesh robots. See [Rapier collider guidance](https://rapier.rs/docs/user_guides/javascript/colliders/).
7. Keep source URL, revision/hash, attribution, and permitted-use notes with every shipped asset. FIRST's [season page](https://www.firstinspires.org/resources/library/frc/season-materials) asks that its posted content not be re-hosted. Downloadability alone does not establish redistribution rights for converted assets. Establish the applicable terms before shipping derived models; original simplified geometry can support initial development. MoSimulator's [asset/license terms](https://mosimulator.com/eula/) also do not provide blanket reuse permission.

Start driving development with a simple, original swerve robot. A detailed team CAD model adds appearance, but does not automatically provide mass, inertia, traction, motor behavior, or working mechanisms.

**Simulation design**

Keep the simulation core independent of React, Three.js, and browser globals. It owns entities, physics, match state, inventories, timers, and random state. Input becomes tick-indexed commands; rendering consumes snapshots and interpolates poses. UI commands such as pause/reset enter through an explicit interface. A simple entity registry is enough initially; an elaborate ECS framework is unnecessary.

Use a fixed simulation timestep, with 120 Hz as the initial candidate and 60 Hz as a benchmark comparison. Select one supported rate after testing; quality settings should primarily affect rendering. Cap catch-up work after stalls, pause on lost focus for singleplayer, and clear held inputs on blur. Do not vary physics time with render frame rate. Start on the main thread behind a clean interface, then move physics into a Web Worker if profiling shows a benefit. A worker relocates work; it does not remove its cost. Transferable buffers can avoid requiring shared-memory hosting machinery initially.

For driving, use a dynamic chassis, realistic bumper envelope, explicit mass/center of mass/inertia, and four swerve contact points. Begin on flat carpet. Add wheel direction/speed limits, force-limited longitudinal and lateral traction, and contact/suspension forces applied at each wheel. [Rapier ray/shape queries](https://rapier.rs/docs/user_guides/javascript/scene_queries/) are useful building blocks; they do not constitute an FRC swerve model. Shape casts or explicit wheel collision geometry may be needed around sharp obstacle edges. A generic car controller is not a finished swerve drivetrain.

Tune speed, acceleration, braking, angular response, diagonal normalization, and simultaneous translation/rotation before adjusting obstacle behavior. Keep pitch/roll physically available. Use measured comparison scenarios for ramp crossings and high-centering rather than making the chassis snap to the ground or prescribing its pose every frame.

For fuel, use spherical rigid bodies and instanced rendering. Tune bounce, friction, rolling resistance, and drag from reference experiments/video; nominal dimensions do not specify those coefficients. Sleeping bodies should wake correctly on impact. Use the pinned Rapier version's appropriate continuous-collision options for fast shots and verify thin-surface contacts.

For the first complete robot, use a hybrid mechanism model: physical fuel outside the robot, geometry-aware intake capture, bounded internal inventory, visible mechanism animation, and physical release at the shooter/outtake. Preserve identity and total fuel count across capture, release, and hub recycling. Include intake width, approach direction, throughput, hopper capacity, shooter spin-up, feed rate, turret/hood limits, and chassis velocity in released projectiles. Aim assistance should be an explicit robot capability or practice option.

Full physical hopper/roller routing is a valuable later realism feature, but it has a separate stability/performance cost. If that feature becomes essential to the initial product, prove it with a small mechanism prototype before expanding robot content.

Climbing should engage only from a valid hook/rung configuration, then use constrained motion or joints and a mechanism state machine. Score from the actual eligibility conditions at the required assessment time. Robot height alone is insufficient.

**Milestones and completion criteria**

| Stage | Deliverable | Completion criterion |
| --- | --- | --- |
| 0. Baseline and import proof | Toolchain, source manifest, one converted field element, primitive physics scene, reference laptop/browser choice | Production asset path works; scale/axes and WASM loading verified; simple full-count sphere benchmark recorded. |
| 1. Complete field scene | Load straight into the full playing environment; all gameplay structures and fuel placement; orbit/free/overhead inspection; lighting; loading/error states; collider overlay | Critical distances and orientations match references; openings are unobstructed; all assets resolve; initial load, draw calls, and memory measured. No driving robot required yet. |
| 2. One drivable chassis | Generic swerve chassis, bumpers, keyboard/gamepad commands, chase/driver cameras, reset, tuning display | Repeatable acceleration/braking/rotation on flat carpet; correct input frames; no diagonal speed advantage; stable wall contacts and reset. |
| 3. Terrain and fuel physics | Contact model over bumps/under trenches; loose fuel collisions, bouncing, rolling; full-count load | Pass slow/fast/angled ramp runs and clearance cases; shots do not tunnel; dense fuel remains stable; frame-time profile meets the selected baseline. |
| 4. One complete robot | Intake, storage, shooter, outtake, moving mechanisms, climb; generic or prepared real model | Repeated collect-drive-score-climb cycles work; no duplicate/lost fuel; mechanism reach/capacity respected; no geometry clipping shortcuts. |
| 5. Match rules | Practice mode plus timed match, hub shifts/lights, scoring windows, recycling, results, event profiles | Boundary-tick scenarios, auto ties, inactive-hub shots, score deduplication, and climb assessment are verified. Label any unsupported penalties/rules clearly. |
| 6. Singleplayer release | Control remapping, camera settings, sound, pause/restart, quality presets, saved preferences, basic local replay | Complete repeated sessions across target browsers/controllers; focus loss/disconnect and failed asset loads recover; no growing memory/body counts after resets. |
| 7. More robots and local load | Data-driven robot definitions, real team models, mechanism differences, six-robot stress scene | A second robot can be added without altering core rules/engine; pushing/contact and fuel load remain stable. Add AI separately if desired. |
| 8. Online multiplayer | Authoritative headless server, rooms, input protocol, prediction/reconciliation, snapshots, reconnects | Clients cannot author scores/poses; lag and loss scenarios tested; bandwidth/CPU measured with full matches. |

Stages 0-1 together are the first implementation slice. Stage 6 is the initial useful singleplayer product. These are reviewable gates, not commitments to a calendar; import and physics prototypes will give a credible basis for estimates.

**Performance and verification**

Proposed initial support: desktop Chrome/Edge/Firefox and Safari, keyboard plus common Xbox/PlayStation-style controllers. Start with an integrated-GPU laptop at 1080p and a 60 FPS gameplay target. Mobile/touch is a later product decision. These are targets, not measured outcomes for the proposed engine.

Record median/p95 frame time, physics time per tick, GPU time when available, awake bodies, contacts, draw calls, triangles, download bytes, and memory. Test settled and disturbed fuel, concentrated piles, repeated shots, bumps, and six placeholder robots. Include the higher-count game profile and an additional artificial stress case. Reduce decoration, shadows, pixel ratio, and model detail before reducing meaningful interactions. Aim for a provisional first-play download below 20 MB, revising that budget after the first import; source STEP size is not the runtime budget.

Maintain a small set of meaningful simulation checks: fuel conservation, exactly-once scoring, command replay under a pinned configuration, state transitions on boundary ticks, no penetration beyond agreed tolerance, braking distance, and repeatable ramp crossings. Add manual driver feedback because passing numeric tests does not establish good control feel.

**Preparing for multiplayer without implementing it now**

Use stable game IDs, serializable definitions, tick-indexed input, seeded randomness, and complete game-state snapshots from the start. [Rapier snapshots](https://rapier.rs/docs/user_guides/javascript/serialization/) cover physics; inventory, timers, score, RNG, and mechanism state must be stored separately. Its [determinism guarantee](https://rapier.rs/docs/user_guides/javascript/determinism/) depends on the same version, initial values, insertion order, and deterministic surrounding computations. Do not assume the whole game is automatically cross-platform deterministic.

A later TypeScript/Node server can share the simulation core. Use server authority with client prediction/interpolation as the default network direction. Benchmark networking cadence and encode changed/awake bodies rather than sending every ball's full state constantly. WebSockets are a reasonable first transport to evaluate; pick a room framework when room/session needs are concrete. Physics engine determinism is useful for debugging and replay, but does not remove the need for network correction.

**Decisions proposed for the first build**

- Browser-first Three.js/Rapier stack, static singleplayer distribution.
- Full gameplay field first; arena decoration can follow once the import and performance budgets are established.
- Generic swerve chassis first; one complete configurable robot before a roster.
- Hybrid internal fuel handling initially, physical external interactions and shots.
- Keep input, simulation, rendering, and rules separate; defer server/accounts, AI, robot editors, and polished replay tools.
- Benchmark asset conversion and full-count physics before committing to detailed content production.

November 1 gameplay revision: level chassis, assisted bumps, horizontal floor-fuel displacement, passive 2910 deployment, intake-only compression, FRSim-card tuning (55 capacity), stationary firing with staggered release, manual AUTO, and local match cues. See [current gameplay model](docs/GAMEPLAY_TUNING.md). Public launch work awaits user review.
