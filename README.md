# Jamesim

A browser FRC 2026 REBUILT simulator built with TypeScript, React, Vite, Three.js and Rapier. The current CAD roster is **2910 Re•Blitz, 1690 Kepler, 6328 Darwin, 1678 Limestone, 9496 Matterhorn, 3847 Infrared FM, 4481 Era II Worlds, and 8592 Prismarine**.

## Local play

Use Node 26 and the pinned pnpm 10.20.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://127.0.0.1:5173**. An existing server can be reused. Source and all runtime assets live in this repository; normal play never downloads or converts CAD.

For the production interface:

```sh
pnpm build:release
pnpm preview
```

Open **http://127.0.0.1:4173**. Both commands are local; they do not deploy anything.

## Singleplayer

Launch opens setup with robot inspection, alliance selection and an interactive starting-position map. Drag to place the robot in its alliance staging area; WASD moves the square marker and J/L rotate it. Its arrow points toward the intake. Match options offer timed play/free practice, 0–8 preloads, scoring-target profiles and finite outpost supply.

Start enters the field with **only the scoreboard**. Escape opens the pause menu for restart, settings, controls and returning to setup. Settings persist locally. Blur/tab hiding pauses and clears input; resume explicitly. R repeats the selected session, including its seed and pose.

| Default | Action |
| --- | --- |
| WASD / arrows | Field-relative movement |
| J / L | Turn |
| Shift | Intake |
| Space | Aim and shoot; pass into your alliance zone when outside it |
| Q | Reverse/eject |
| V | Kepler intake extension toggle |
| C | Kepler climber deployment toggle |
| B | Outpost supply, when enabled |
| R | Restart session, including pause/results |
| Escape / P / Enter | Pause/menu or resume |
| H | Controls while paused |

Keyboard and standard controller bindings/deadzones are configurable in Settings. Controller input requires neutral controls after connection or interruption.

2910 aims with the chassis and stops to shoot. Kepler has an independent turret and moving shots; Shift + Space can collect while firing. Its intake compresses remaining fuel toward the feeder during shooting, with physical local hopper motion and visible feed transit. All transfers conserve the existing fuel IDs.

For Kepler L1, deploy C, approach beside your own tower along the low rung, stop to engage, then toggle C to winch up. Toggle again to lower/release. Climbing uses managed support and the original CAD sliding hook/stage; it is a gameplay approximation.

AUTO and teleop are both driver-operated. Timed play supports hub shifts, processed-fuel windows, match audio, tower points, bonus targets and results. There is no singleplayer foul interface, opponent simulation, multiplayer or win/tie ranking score. Event profiles adjust targets, not field supply layouts.

## Development

For parallel robot contributions, start at **[ROBOT_AUTHORING.md](ROBOT_AUTHORING.md)**. Give an agent that file and “implement team XXXX.” It covers research, the template, isolated definitions/assets, model bindings, testing, branch-only pushes and PR disclosures. Core work stays on `main`; robot contributors use `robot/<team>-<name>` branches and never push `main`.

Backtick opens development-only inspection. F6 toggles colliders; F7 restores the follow camera. Production excludes inspector geometry, shortcuts and tuning controls. Physics uses SI units, a 120 Hz fixed step, stable upright support, bump-only visual lean and horizontal fuel displacement to prevent beaching.

```sh
pnpm test:unit     # asset-independent checks, including bindings and setup
pnpm test:robots   # every registered robot's definition, model and acceptance checks
pnpm test:sim      # complete source suite, serial workers
pnpm build:local   # integrity + compilation + production-payload validation
```

CI runs the complete simulation suite and release build. The prepared field, robot and audio pack is tracked, so a clean checkout can run those checks.

| Location | Responsibility |
| --- | --- |
| `src/sim/` | Physics, fuel ownership, mechanisms, scoring and fixed-step rules |
| `src/robot/` | Robot geometry and behavior definitions |
| `src/view/` | Three.js, browser input, cameras and audio |
| `src/components/` | Setup, settings, pause/results and development inspector |
| `scripts/` | Offline CAD preparation and asset/build validation |

See [stage 19.5 scope](docs/STAGE_19_5.md), [gameplay tuning](docs/GAMEPLAY_TUNING.md), [Kepler provenance/model](docs/KEPLER.md), [asset records](docs/ASSETS.md) and [Vercel import configuration](docs/V1_PUBLICATION.md). Earlier gate/release acceptance documents describe their historical baseline.

## Assets and hosting

The owner authorized the noncommercial v1 runtime publication while deferring third-party license review. Source, hashes and attribution remain recorded; unreviewed assets remain marked pending. Only prepared runtime assets are tracked; original CAD/binders and conversion caches are excluded. See [publication decision](docs/V1_PUBLICATION.md).

Vercel can serve the static `dist` output using the checked-in configuration; no database, functions or environment variables are needed. Hosting changes and stage 20 require the owner's next instruction.
