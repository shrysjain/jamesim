# Trench recovery verification

This branch combines the existing Citrus internal-edge correction (#43) and
Kepler bump-footprint correction (#44), then adds actual-field withdrawal
regressions across all 11 registered robots. It adds no further runtime tuning.
The two original focused regressions are retained.

The retained contact asset has four trench meshes: `trench-535-near`,
`trench-535-far`, `trench-539-near` and `trench-539-far`. Separate meshes are not
themselves a reason to delete contacts or enlarge a passage. Internal-edge
smoothing addresses false seam contacts; bump assistance requires a real
articulated collider footprint above the bump.

The 88 roster cases mirror the complete pose and driver input across alliances
and exercise both lanes on each alliance, covering all four trench meshes.
Each robot starts with its configured full capacity of original fuel, approaches
the trench squarely or at .25 radians, then backs clear by more than .5 m in one
second. They check actual approach progress, stable ground support, bounded
height, original fuel bodies/count and payload mass counted once. Uncovered
hoppers retain their physical spilling behavior; fuel retention through covers
is separately verified by #51.

Additional combined-branch audits exercise turning/intake toggles near the arm
and sidewall, and shooting/releasing the shooting request before withdrawal.
These also include the separate hood (#47), articulated-contact (#50), covered
cargo (#51) and Valor support (#52) changes when present. They do not imply those
independent PRs are included in this branch.

The visible field, physical dimensions, real trench boundaries, robot CAD,
controls, rates, capacities and ground-force budgets are retained. A robot or
packed load that cannot fit a passage remains obstructed; the recovery tests
require driving back out, not passing through real overhead structure.
