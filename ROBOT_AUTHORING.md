# Robot contributor entry point

Give an agent this file and a request such as **“Read ROBOT_AUTHORING.md and implement team XXXX.”** This is the complete starting workflow for adding a robot to Jamesim. Research, CAD preparation, implementation, tuning, local testing and refinement all belong in that assignment. The contributor can supply more references or request changes throughout the work. Do not stop at a proposal when implementation is requested.

This workflow is an explicit exception to the core maintainer's main-only workflow in `AGENTS.md`. **Robot contributors develop on their own `robot/<team>-<name>` branches and push only those branches. They never commit, merge, or push robot work directly to `main`.** The maintainer reviews and integrates their PRs while core development continues separately.

## 1. Begin safely and establish the robot

1. Read `AGENTS.md` and `docs/GAMEPLAY_TUNING.md`. This entry file owns the robot-contribution workflow; historical gate notes must not restore older gameplay.
2. Inspect `git status --short --branch`, the current branch and remotes. Preserve existing work. Do not reset, discard, stash someone else's changes, or overwrite an existing branch automatically.
3. Fetch `origin`. In a clean contributor checkout, create a new branch from current `origin/main`, for example `git switch -c robot/1234-robot-name origin/main`. If already on the correct contribution branch, continue it. Use a separate clone/worktree when another agent is working in the same checkout. Do not switch the maintainer's active checkout out from under them.
4. Run `pnpm robot:branch --team=1234`. It rejects `main`, detached HEAD, `codex/`, and other teams' branches. Use a numeric team prefix and a lowercase descriptive name. The branch may use a provisional descriptive name while research establishes the final robot variant; the runtime ID must be stable before review.
5. Confirm the assignment is the team's **2026 REBUILT robot**, including the intended revision/variant. Check whether that team is already registered. Clarify meaningful variant differences with the contributor; make routine choices independently and explain them.
6. Use Node 26 and pinned pnpm 10.20.0: `pnpm install --frozen-lockfile`. Keep code, assets and durable notes in this repository. No cache-only application data. Do not stop an existing user-owned development server.

Research can begin immediately. Briefly explain the proposed robot, evidence and any missing resources, then implement the supported work. Ask focused questions when CAD, a reference, or a mechanism decision is genuinely missing; continue independent work meanwhile. A contributor may provide exports, videos, spec cards and tuning feedback. Do not invent measurements or advertise placeholder geometry as the real robot.

## 2. Own these files

Copy `templates/robot/` to `src/robot/robots/<team>-<name>/`. Its deliberate NaNs prevent an unfinished robot from passing validation. Replace every placeholder; the template is not registered or shipped.

| Path | Contents |
| --- | --- |
| `src/robot/robots/<id>/definition.ts` | Robot-specific SI dimensions, colliders, pickup, cargo seeds, drive and shooter configuration, capabilities |
| `src/robot/robots/<id>/visual.ts` | CAD mechanism names and animation bindings |
| `src/robot/robots/<id>/README.md` | Sources/revision, measurements versus estimates, mechanism behavior, tuning evidence and limitations |
| `src/robot/robots/<id>/*.test.ts` | Robot-specific regression cases |
| `src/robot/robots/<id>/prepare.mjs` | Reproducible offline CAD preparation, when a new converter is needed |
| `assets/robots/<id>/sources.json` | Source URLs, pinned revisions, input hashes and relevant source/license records |
| `assets/robots/<id>/runtime.json` | This robot's prepared runtime asset record |
| `public/assets/robots/<id>/robot.glb` | One self-contained, prepared and articulated runtime model |
| `assets/source/robots/<id>/` | Ignored local CAD inputs and conversion intermediates |

New definitions import `../../types`, `../../defaults` and their own files. **Do not import the registry/compatibility barrel from a robot module**; that creates dependency cycles. Do not inherit another team's definition wholesale. `STANDARD_SWERVE` supplies explicit common suspension defaults; verify or override them. `swerveModules(x,z)` creates the standard four module names. Every robot supplies its own cargo layout, pickup and shooter geometry.

The normal shared-code integration is **one import and one keyed entry in `src/robot/registry.ts`**. Preserve existing IDs/order; the selector and shared tests use this registry automatically. `src/robot/RobotDefinition.ts` is a compatibility export, not where new robots go. Do not edit UI files to add a selector option. The definition's `summary` supplies its card description. Reload the page after registry/model changes; restart only your own server if build-manifest configuration needs refreshing.

Asset records are discovered automatically from `assets/robots/*/runtime.json`. Normal robot additions do not edit the common `assets/runtime-manifest.json`, build plugin, asset checks, or `.gitignore`. Only the exact `public/assets/robots/*/robot.glb` filename is allowlisted; other raw/preparation files stay excluded.

## 3. Research and prepare CAD

Prefer the team's official release, Onshape document, reveal and technical material. A published derivative mesh pack can be useful: record its upstream team source, exact revision and hashes. Do not infer CAD rights from an unrelated code license, fabricate clearance, or copy another simulator's implementation. Existing owner-authorized publication and pending-review records remain as documented in `docs/V1_PUBLICATION.md`; preserve factual attribution/status.

Use simulator references for observed behavior and user-approved tuning, with attribution. Distinguish those gameplay targets from measured real-robot performance. If Onshape export is disabled, investigate official downloadable releases or already published derivatives; ask the contributor for an available export/reference when needed. Do not claim a mechanism is missing until inspecting the complete geometry—disconnected parts may be batched into one static mesh.

Prepare CAD offline. Remove embedded fuel/game pieces so the simulation remains their sole owner. Simplify unnecessary fasteners/internal detail, preserve the recognizable robot, and split moving subassemblies around their real pivots/slides. Keep CAD preparation reproducible and input hashes verified. Original CAD must not be downloaded or converted at player runtime.

The model must contain embedded geometry/material resources and load with our existing GLTFLoader + Meshopt decoder. Use supported glTF features; Draco requires a separate decoder and is not part of this contract. Runtime budget checks currently allow **6 MiB, 650,000 rendered triangles and 160 mesh primitives per robot**. These are ceilings, not targets. Prefer considerably smaller assets. If genuinely necessary to exceed a ceiling, explain the measurements and tradeoff in the PR; do not raise shared limits merely to pass.

Existing examples: `scripts/convert-robot.mjs`, `scripts/prepare-kepler.mjs`, `scripts/rig-kepler-climber.mjs`, `docs/REBLITZ_ASSET_GATE.md`, and `docs/KEPLER.md`. Study them as examples; keep new conversion work in the new robot's files.

## 4. Physics and mechanism contract

- SI units: meters, seconds, kilograms, radians. Field X runs lengthwise, Y is up, Z across. Blue is +X. Robot neutral shooter direction is local +X; intake is local −X.
- Prepare the model around the established chassis reference convention (approximately .223 m above carpet at rest), with module geometry and suspension coordinates consistent. Author pivots/transforms exactly once. `visual.previewHeight` positions the preview; it does not change physics.
- `definition.ts` is serializable configuration. No DOM, React, Three.js, timers, network requests or mutable simulation state. Per-instance state lives in `src/sim/`.
- The shared simulation runs at 120 Hz. Preserve deterministic progression, stable original fuel IDs/bodies, ownership, mass/inertia accounting, pause, restart, and hub returns. Never generate replacement ammunition or a private score counter.
- Provide actual bumper/frame dimensions, simplified collider envelopes, wheel/module locations, empty mass/inertia (label estimates), drive tuning, intake region, cargo seeds and internal volume, feed geometry and rates. Account for payload through the shared system once.
- Cargo seeds use full-size 150 mm fuel with non-overlapping centers and one seed per capacity slot. They initialize local hopper physics; they are not a fixed rendered stack. `fixedSlot` is only for a real fixed feeder pocket.
- Keep upright collision support, horizontal fuel displacement, bump-only visual lean and approved follow camera unchanged. New robot tuning must not weaken those shared protections.
- Existing mechanism families support four-module swerve, pivoting/sliding intakes, a sliding hopper, local sphere cargo, fixed or turreted flywheel shooting, adjustable hood, visible feed paths and the managed `side-hook-l1` climber. Controls are shared and rebindable: WASD, J/L, Shift, Space, Q, V where applicable, C for climb, R restart. Preserve driver-operated AUTO and teleop.
- Current common actuation timing and deployment logic remain in `RobotSimulation`; shooter recovery/aim policies remain shared. Optional geometry/tuning fields have documented defaults in the code. Set new robot tuning explicitly when known; do not quietly tune global constants to fit one team.
- A new mechanism family (for example L2/L3 climbing or a fundamentally different feed system) needs a coordinated contract/engine extension. Explain what is unsupported and discuss the approach with the contributor. Keep any necessary shared change small, optional for existing robots, tested, and clearly disclosed in the PR. Do not fork the entire simulation or implement real behavior only as a visual animation. Do not falsely enable unsupported capabilities.

## 5. Visual/animation contract

The renderer binds to each node's **glTF `extras.mechanism`**, independent of exporter-generated names. Semantic node IDs must be unique.

- `visual.requiredNodes`: all required assembly IDs; includes `chassis` and every explicitly bound assembly. Missing required geometry fails rather than silently doing nothing.
- `visual.poseNodes`: maps `intake`, `hopper`, `hood` (as applicable) to semantic IDs. Shared `partTransform` keeps visuals and collider transforms consistent: intake/hood rotate about Z; intake can translate X/Y; hopper translates X.
- Four module roots use `${module.name}-fork` and `${module.name}-wheel`; steer/spin around the existing convention, with normalized wheel axle +Z.
- `visual.spin`: exact node or prefix rules, source (`intake`, `feeder`, `shooter`), factor and optional axis. Intake uses roller angle; feeder uses .7 × roller angle + feeder angle; shooter uses drum angle. Axis otherwise comes from node `extras.spinAxis`, default Z. First matching rule wins. `STANDARD_VISUAL` preserves the existing roller naming conventions; override it for different CAD layouts.
- `visual.turret` / `turretHood`: actual turret-bearing and nested hood assembly IDs. Neutral muzzle must agree with shooter geometry; visual pointing alone does not aim a projectile.
- `visual.kicker`: passive assembly ID and deployed rotation. `visual.climber`: actual moving assembly for the current vertical side-hook profile. Other motion requires a deliberate contract extension.
- `visual.bumperMaterial`: material to recolor by alliance. `teamNumber`, `numberSize` and `numberOffset` control the existing bumper numbers; confirm readable placement on the actual bumper geometry.
- Check stowed, deployed, compressing, feeding, hood/turret movement, and climb poses as applicable. Held fuel must visibly traverse a believable path into the shooter, stay within the hopper, and remain tied to its owned ID. Avoid teleporting cargo, fake unsupported arms, and embedded decorative fuel.

This preparation stage retains eager model loading and existing runtime behavior. Deferred loading is separate core work; contributors should keep models compact and should not independently rewrite loading, the camera or match lifecycle.

## 6. Register the prepared asset

Create `assets/robots/<id>/runtime.json` using this shape and actual output bytes/hash:

```json
{
  "schemaVersion": 1,
  "robotId": "1234-robot-name",
  "group": {
    "name": "Team 1234 robot CAD",
    "source": "https://example.org/actual-team-release",
    "redistribution": { "status": "pending", "evidence": [] },
    "files": [{
      "path": "public/assets/robots/1234-robot-name/robot.glb",
      "bytes": 123,
      "sha256": "replace-with-the-actual-64-character-sha256"
    }]
  }
}
```

The values above are illustrative and deliberately fail integrity checks. Generate real values from the prepared file (for example `wc -c` and `shasum -a 256`). Keep source/clearance records truthful. Each registered model must have exactly one matching record; unregistered runtime robot models fail the shared asset contract. Preparation reports, original CAD and secrets must not enter the production payload.

## 7. Iterate and verify

Use the existing scripts; inspect failures before changing expectations:

```sh
pnpm robot:branch --team=1234
pnpm test:robots
pnpm test:sim
pnpm build:release
```

`test:robots` runs definition validation, prepared model/asset/budget checks and the reusable `testing/robotAcceptance.ts` suite for every registered robot. Acceptance covers both alliances, preload, floor support, collection/reverse, physical fuel release, payload, pause/reset, stable bodies and immutable definition data. The real-field and team-specific shot/climb behavior still need their own meaningful cases. Add those under the robot folder; the full test command discovers `src/**/*.test.ts` automatically. Existing 2910/Kepler regression checks must continue passing.

For visual/gameplay work, normally do one focused local check with `pnpm dev` at http://127.0.0.1:5173 (or `pnpm preview` at port 4173 after building). Use Safari or an isolated in-app browser. Honor the contributor's testing preferences; if they explicitly skip browser work, say what remains visually unverified. Never claim a play test that was not performed.

Check both alliances, bumper numbers, deploy/intake/reverse, a full hopper and compression, stationary/moving firing as supported, passing, wall/bump/trench contacts, restart and climbing if claimed. Document any unverified or approximate behavior. Agree on refinements with the contributor and keep iterating before review. Do not lower shared regression bounds to hide an unrelated regression. New mechanism behavior requires its own evidence and assertions.

## 8. Commit, push the robot branch, and prepare review

Use scoped commits; inspect staged paths, binary sizes and ignored files before committing. Keep the branch updated from `origin/main` using normal merges when needed; do not rewrite published history or force-push without explicit permission. Resolve shared changes against the current interface rather than restoring an older core file wholesale.

When the contributor is ready to push, use **`pnpm robot:push --team=1234`**. It validates the branch and uses the explicit destination `HEAD:refs/heads/robot/...`, so an inherited upstream/push configuration cannot send it to `main`. `--dry-run` previews that same destination. Never use `git push --all`, a main refspec, or create/push `codex/` branches for this workflow. These are repository workflow safeguards, not GitHub account-level branch protection; do not change hosting or account settings.

Present the completed, reviewable work and allow further contributor refinement. Open the PR when requested/authorized, **from the robot branch into `main`**. Do not merge it. The maintainer handles integration. A draft PR can make work available for feedback while limitations remain explicit. Mention the base commit and any dependency on another PR.

Every robot PR description must contain these sections (use actual evidence, not empty boilerplate):

```markdown
## Robot and resulting behavior
Team, season, variant/revision, supported mechanisms, tuning changes and visible result.

## Sources and estimates
CAD/reveal/spec links, pinned source records, measured versus estimated parameters.

## Integration points and merge conflicts
List EVERY shared file/interface touched and why, including the registry entry.
State likely overlapping files/lines or dependent core changes and how to resolve them.
If changes are confined to robot files plus registration, say so explicitly.
Disclose asset/build/allowlist/controls/UI/simulation changes; do not bury them in the diff.

## Validation
Commands/results, focused local browser observations (or explicit omissions),
asset bytes/triangles/primitives, fuel conservation and relevant team-specific cases.

## Remaining limits
Approximate/unsupported/unverified behavior and follow-up work.
```

New files in the robot's own folders usually merge independently. `registry.ts`, shared contracts/defaults, simulation, renderer, build tooling, controls and root documents are integration points. Explain potential conflicts in the PR even if Git currently reports a clean merge. Clearly distinguish an implemented capability from planned work. No site deployment, multiplayer rewrite or unrelated robot tuning is part of a normal robot contribution.
