# Stage 19.5 — singleplayer cleanup

November 1, 2026. This revision supersedes the direct-start player shell and provisional robot extensions. Stage 20 (multiple robots in one simulation) has not started.

## Player flow

Launch opens Singleplayer. Choose one of two supported CAD-backed robots: 2910 Re•Blitz or 1690 Orbit / Kepler. High Tide and the fictional Tower trainer have been removed, including their procedural rendering. Settings persist; session choices remain for the current visit.

The robot preview renders on demand and supports pointer inspection. The field diagram offers left/center/right starts, drag placement and continuous WASD positioning, plus J/L rotation. A square marker has an arrow toward the intake. The map takes focus on opening and after setup actions; editable inputs keep normal keyboard entry. Custom coordinates are normalized in simulation to a clear staging area in the selected alliance zone. Invalid coordinates fall back to the preset. The selected pose, robot, alliance, preloads, seed, mode and supply configuration survive R restart.

Match options contain practice/timed mode, preloads, event targets and finite outpost supply. Event profiles set targets, not expanded fuel layouts. Start explicitly loads the world and begins the session. The setup screen never consumes match time. Returning to setup pauses simulation and suspends the field renderer.

Active play shows only the scoreboard, including the match clock and phase; practice shows hub hits. There is no fuel HUD, controls overlay, toolbar, brand/mode badge or foul assessment interface. Escape opens Resume, Restart, Settings, Controls and Back to singleplayer. Settings and help return to the pause menu; resumption is explicit. Blur/hidden-tab events pause and clear input. R works in play, pause and results. Inspector remains development-only through backtick; C is reserved for climbing, so collider inspection moved to F6 (follow camera shortcut F7).

## Kepler

C toggles the visible climber up/down, independent of location. Deploy, approach the side of your own tower with the sliding hook aligned along the low rung, and stop. A raycast against actual tower geometry captures the rung. Toggle C again to retract and winch into L1. Toggle once more to lower and release. The released mechanism cannot immediately recapture until rearmed with another deployment. Disable/pause holds support. Restart releases the joint and restores the mechanism.

The old hold-to-raise/lower actions and invisible narrow attachment corridor are gone. Attached chassis forces are explicitly cleared so old suspension forces cannot continue pushing against the winch constraint. The original CAD already contains the climber, but batches its disconnected solids into several static body meshes. The converter separates nine original solids (sliding stage, triangular hook plates/liner and carriage hardware) into an animated mechanism node. The fixed rails and drive remain on the chassis. C translates the stage vertically; there are no substitute arms. Hook position and rung alignment gate capture; retraction takes up the clearance before lifting the chassis. The 300 mm stroke and actuation rate are gameplay estimates. Support remains a managed L1 joint, not a detailed compliant hook/contact simulator.

The incoming b4f4249 hopper sphere dynamics and bumper recoloring are retained. Shooting compresses Kepler's intake as capacity permits; intake/reverse overrides extend it, and simultaneous intake/shoot remains supported. Moving walls physically push the local cargo spheres, rather than translating a fixed stack. Release restores extension unless manually retracted with V.

A single physical shooting lane now has multiple in-flight feeder positions. Fuel traverses definition-owned floor/cross-feed/vertical waypoints at bounded speed before reaching the rotating muzzle. This keeps the 13 balls/s target without a 50 ms jump from the back of the hopper. Every ball remains the same owned ID/body until physical launch. The original 2910 four-lane path and driving/camera behavior remain intact.

## Shared code and verification

- Removed High Tide/trainer definitions, fallback meshes, selectors and their obsolete assertions. Relevant generic session, controller, wall and turret checks now exercise Kepler.
- Moved spawn normalization to `SessionConfig`; added an explicit practice entry API instead of mutating match mode/config from the view.
- Replaced the global feeder-pocket exemption with a definition-owned fixed slot.
- Robot simulation accepts its owner ID rather than declaring an internal singleton owner constant. Multiple simultaneous robots remain stage 20 work.
- CI runs the complete simulation suite plus release integrity/build/payload checks. Vitest includes only `src/**/*.test.ts`, preventing ignored scratch exports from doubling coverage counts. Test config retains Vite's virtual runtime-asset plugin.
- Source tests cover both-alliance climb/deploy/hold/release/reset, actual cargo travel during compression and feeding, full-hopper firing/conservation, saved-binding migration to C, custom spawn validation and explicit practice configuration.

## Deliberate limits

One robot per world; no multiplayer, bots, opponent-dependent violations or competitive win/tie RP. Tower support and feeder transit are managed gameplay models. The owner will locally accept this revision before stage 20 or deployment.

## Local acceptance — November 1, 2026

- `pnpm test:sim`: 132 tests passed across 19 files after updating the old head-on climbing fixtures to the side/rung geometry. Both-alliance deploy/capture/L1/lower/release/reset and loaded feeding/conservation cases pass.
- `pnpm assets:kepler --download`: reproduced the articulated runtime asset from the pinned, hash-verified CAD inputs. The runtime manifest records its new 1,755,316-byte payload and SHA-256.
- `pnpm build:release`: asset integrity, TypeScript/Vite compilation and production-payload validation passed. Eighteen runtime files; eleven content-hashed build assets. Development UI and preparation inputs remain excluded. The existing Rapier chunk-size warning remains.
- One focused local production-browser pass checked continuous WASD/J/L map motion, intake arrow, robot/alliance selection, focus after selection and modal close, settings focus, explicit Start, C deployment, scoreboard-only play, Escape pause/resume and return to setup. No browser warnings/errors were captured. Local proof images are `docs/stage-19-5-setup.jpg` and `docs/stage-19-5-match.jpg` (ignored QA artifacts).
- Remote main remains at b4f4249. The newly fetched, unmerged `feature/moving-shots-match-stop` branch (54bf805) is separate and has not been incorporated: its moving-shot uncertainty changes need their own gameplay review.

No hosting changes or deployment were performed. Stage 20 awaits owner acceptance.
