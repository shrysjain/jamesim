# Jamesim

Jamesim is a browser-only singleplayer simulator for the 2026 FIRST Robotics Competition game, REBUILT, using Team 2910 Re•Blitz CAD. Built with TypeScript, Vite, React, Three.js, and Rapier 3D.

## Release preparation

The local release candidate opens directly into a timed solo fuel match with R restart, saved settings and a compact fuel/status HUD. Production builds exclude the inspector and development shortcuts. See [release acceptance](docs/SINGLEPLAYER_ACCEPTANCE.md), [the v1 plan](docs/SINGLEPLAYER_RELEASE_PLAN.md) and [agent instructions](AGENTS.md). No public deployment has been made.

This public repository currently contains code, tools, source records and licensed fonts. Pending-clearance CAD/audio payloads and binders stay in the original local workspace. **A clean clone needs an authorized runtime asset pack to play.** See [asset setup and release preflight](docs/ASSETS.md); compiling the shell alone is not a complete deployment. Vercel configuration deliberately uses the release preflight and will not publish while assets/clearance are missing.

## Run locally

```sh
pnpm install --frozen-lockfile
pnpm assets:check
pnpm dev
```

Open **http://127.0.0.1:5173**. All runtime assets, including fonts and the converted field model, live in this project. Normal startup does not fetch or convert CAD and does not depend on a system cache.

```sh
pnpm test:unit  # no local field pack needed
pnpm test:sim   # requires the local runtime pack
pnpm build:local  # verifies local assets, compiles and checks the full production payload
pnpm preview     # production interface at http://127.0.0.1:4173
```

## Drive

The main screen is the robot follow view, match scoreboard and fuel/status HUD. Startup begins a timed match after loading. Settings offer volume/mute, graphics presets, controls hints and restore defaults; choices persist locally.

| Key | Action |
| --- | --- |
| W / S, up / down arrows | Forward / reverse |
| A / D, left / right arrows | Strafe left / right |
| J / L | Turn left / right |
| Shift | Hold to run intake rollers |
| Space | Hold to align the chassis and shoot at the blue hub, or pass into the blue zone |
| Q | Hold to reverse rollers and eject held fuel |
| R | Restart the entire timed match, including from pause or results |
| Enter / Escape | Pause or resume / pause |
| H | Driving controls |

Translation is **field-relative** by default, aligned with the blue-side view: W moves toward the red side, D moves screen-right, and J/L rotates independently. The follow camera retains its field orientation. Debug also offers robot-relative drive with a camera that turns with the chassis. The shooter end is local +X and the intake is at −X. The intake faces the neutral zone at spawn, so W approaches the supply intake-first. Losing window focus pauses the match and clears held inputs. Resume explicitly to continue.

## Test and inspect

Development builds (`pnpm dev`) offer **Debug** / backtick to access live top-speed, wheel-acceleration, and tire-grip tuning, plus tire contact, tilt, speed, and angular-rate telemetry. The four test locations place the robot near a bump, a trench, fuel, or the blue practice area. **Reset world** restores all 504 fuel and the robot, then pauses.

The panel retains orbit/free-flight cameras, four field presets (1–4), selection/focus (F), colliders and tire force vectors (C), a measurement grid (G), labels (N), visibility layers, and the orange contact probe. Free-flight mode assigns WASD and Q/E to the camera and disables driving. Closing Debug restores the clean follow view and normal display layers.

The robot has four separately steered contact patches, spring/damper support, limited motor acceleration, a friction budget, and physical bumper/frame collisions. The chassis has stable collision support and capped bump-only visual tilt, rises over bumps on assisted suspension, and displaces floor fuel horizontally to prevent beaching. See [driving model](docs/DRIVING.md) and [verification notes](docs/VERIFICATION.md). Full competition rules, climbing, gamepad support, and multiplayer remain future work; mass, inertia, and tire response remain provisional. Debug also offers intake, hopper, and hood pose inspection with matching collision proxies. See `docs/REBLITZ_ASSET_GATE.md` for measurements and source limits.

```sh
pnpm benchmark:drive
```

This runs a headless drive/reverse test through the full fuel supply and writes `docs/driving-baseline.json`.

## Project layout

```text
src/field/         Shared asset and field types
src/sim/           Renderer-independent Rapier simulation
src/view/          Three.js viewer, cameras, selection, debug drawing
src/App.tsx        Timed-player shell, pause and modal state
src/components/    Player dialogs and development-only DebugPanel
src/settings.ts    Validated, versioned local settings
public/assets/    Prepared runtime field assets and provenance
public/fonts/     Local fonts and their licenses
assets/source/    Original STEP source, excluded from Git
assets/intermediate/ Offline tessellation, excluded from Git
scripts/          Reproducible asset preparation
```

The internal frame uses meters: X along field length, Y up, Z across field width, with the origin at the carpet's center and top surface. Asset conversion applies the source coordinate transform once.

## Rebuild the field asset

The existing local workspace contains the prepared runtime files; public Git does not yet include the pending-clearance pack. To intentionally regenerate them, download the [official STEP](https://firstfrc.blob.core.windows.net/frc2026/FieldAssets/FE-2026-rev-rebuilt-playing-field.step) to `assets/source/field.step`, then run:

```sh
python3 scripts/prepare-step.py
node --max-old-space-size=8192 scripts/inspect-step.mjs
pnpm assets:field
```

STEP tessellation is an expensive offline operation. It uses the npm `occt-import-js` OpenCascade build; no CAD parser is shipped in the browser bundle. The converter preserves field structure geometry, batches surfaces, removes small hardware, extracts fuel centers, and generates independent static collision geometry.

This is local development using FIRST's official model. See `public/assets/PROVENANCE.md` for sources and limitations. Establish asset redistribution terms before publishing the converted model; the original field documentation and branding remain FIRST's materials.

## Rebuild the robot asset

Original collecting/starting GLBs, the team binder, and checksums are retained in `assets/source/robots/2910-reblitz/`. Run `pnpm assets:robot` to prepare the collecting GLB; `node scripts/inspect-robot.mjs` and `node scripts/compare-robot-poses.mjs` audit dimensions and configuration transforms. The browser loads only the optimized local model. See `public/assets/robots/2910-reblitz/PROVENANCE.md`.

## Intake practice (gate 2)

The intake and hopper snap out at session start. The hopper stays out. Shift runs intake rollers; Space retracts only the intake as cargo empties, and releasing Space pops it out again. Hold Q to reverse (takes priority over Shift). Reverse also pushes nearby loose fuel outward. A blocked outlet waits for clearance. Fuel transfers visibly into 55 close-packed storage positions. The HUD shows inventory and mechanism status; carried fuel adds mass, center of mass, and approximate inertia. In public timed play, R restarts with eight existing preloads and resets every original ball. Development-only practice respawn retains cargo. No preloaded ball comes from the robot CAD.

Pose preview in Debug suspends capture/ejection. Press Shift/Q/Space, choose Resume mechanisms, or close Debug to return to normal actuation. See [mechanism model](docs/INTAKE.md) for the physics and calibration limits.


## Shooter bench (gate 3)

Hold Space to turn toward the blue hub and shoot. Outside the blue zone, Space aims a pass at the nearest reachable floor point inside it. WASD stays active; shooting waits until translation settles below 0.18 m/s, with real chassis alignment, hood position, flywheel speed, and clear ball paths. Space retracts the intake; Q overrides shooting. Release Space to stop feeding. All four lanes reuse the collected balls as physical projectiles, with staggered releases, small seeded variation, gravity, damping, CCD, inherited chassis motion, and recoil.

Debug exposes shooter readiness, RPM, hood, lanes, launch count, and airborne fuel. Launch count is separate from the confirmed practice hit counter; gate 4 supplies hub-entry detection and returns. See [shooter model and tuning limits](docs/SHOOTER.md).

```sh
pnpm benchmark:shoot
```

This collects actual fuel from the full field, respawns with that cargo, shoots it, and records conservation and headless step timings in `docs/shooter-baseline.json`.


## Continuous practice (gate 4)

Confirmed downward entries through either hub mouth increment the compact blue/red Practice hits counter. The same balls move through managed hub transit and return physically from the four neutral-facing outlets. Drive back, intake them, and repeat. Blocked exits retain their fuel until clear. R keeps hits and fuel; Reset world clears the practice and restores all 504 original balls.

Debug exposes hit/return counts, pending transit, blocked exits, entry outlines, and fuel conservation. These are practice hits; match rules and active/inactive hubs remain separate. See [practice loop model](docs/PRACTICE.md).

```sh
pnpm benchmark:practice
```

The full-field collect/shoot/hit/return sample writes `docs/practice-baseline.json`.


## Solo timed matches (stage 5)

Opening Jamesim automatically starts a timed blue-alliance match with eight existing preloads and regional/district fuel targets after the environment has loaded. AUTO and teleop are both driver-operated. The HUD follows auto, transition, four hub shifts, endgame, and final processing, with live fuel scores and hub lights. Pause freezes the match; R restarts it.

Hub mouth hits and processed fuel points are separate. Three-second assessment windows and inactive-hub scoring use simulation timestamps. Results show auto/teleop fuel totals and target progress. Results offer a restart; R also works while playing or paused. Free practice and early completion remain development tools.

This is a solo fuel match. Climbing/Tower/Traversal, penalties, opponents, win/tie RP, and expanded championship fuel layouts remain unimplemented. See [match rules and verification](docs/MATCH.md) for precise scope and timing.

The current 2910 baseline follows the supplied FRSim card: 16.7 ft/s, 33 ft/s², approximately 130 lbf empty traction, 32 balls/s nominal shooting, 50 balls/s intake, 55-fuel capacity, and 33 ft passing reach. Match audio uses local samples with a mute button. See [gameplay tuning](docs/GAMEPLAY_TUNING.md).
