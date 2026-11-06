# Concave net-base contacts

The two hub net-base frames have open centers. The old offline converter built a convex hull around each entire frame, filling those openings with invisible horizontal shelves at roughly 1.66 m. A fuel body dropped at X=±2.9 m, Z=0 rested at Y≈1.741 m indefinitely despite no visible surface beneath it.

The field converter now preserves concavity for these measured thin, wide frames. The retained payload is repaired using the matching frame components in the already-prepared official field model. Their bounds must match the old contacts within 1 mm, and exactly two frames must be found. This retains the render preparation's documented submillimeter simplification rather than inventing a replacement frame.

Reproduce the prepared-payload repair from the repository root:

```sh
node scripts/repair-net-frame-collisions.mjs
pnpm assets:check
```

The script updates only those two contact components and the collision file's runtime size/hash record. Repeated runs produce the same payload. Original rendering, actual rails, all other contact surfaces and field source/redistribution records remain intact. The blue frame uses 800 source triangles and red 770, replacing 314 convex-hull triangles per frame.

Actual-field regressions drop one original fuel body through each formerly filled opening, require it to fall below the false shelf without receiving a hub hit, and verify that a real frame rail stays solid. Existing hub entry/return, shooter and opposing-zone passing tests remain in force. No fuel is teleported, deleted, automatically scored or periodically unstuck at runtime.

## Tower-base opening

The floor-level tower weldment suffered the same whole-part convex conversion. The hull bridged its raised feet with invisible inclined surfaces up to roughly 56 mm high. Robots could enter from the side and catch their underside when reversing, although the corresponding interior CAD surface is only about 5 mm above the carpet.

`node scripts/repair-tower-base-collisions.mjs` replaces only the two base weldment components from the matching prepared CAD. Exactly two components must match measured bounds within 1 mm. The converter also preserves their concavity on future preparation. Blue uses 2,426 source triangles and red 2,434 instead of 138 convex-hull triangles each; repeated repair is idempotent. The existing hub-frame repair is retained.

Actual-field tests check the measured 5.095 mm interior CAD height at both bases, solid real feet/rungs, and side-entry/reversal across the complete robot roster with eight original fuel bodies. The old hull gives about 33.49 mm at that same point. Posts, rung height, wall placement, source attribution and physical front-opening width remain unchanged. The front gap is about 826 mm, narrower than several robots' bumpers; those robots must use the side entry rather than pass through the uprights. This repair removes false contacts, not real structural clearance limits. Trench-edge corrections remain separate in #43/#44, and Rembrandts' hood-pose issue remains #21.
