# Jamesim driving model

The simulation lives in `src/sim/SwerveChassis.ts`, independent of Three.js, React, and browser input. The renderer loads the prepared Team 2910 Re•Blitz CAD with visible module steering and wheel rotation. Intake, storage, reverse, and payload mass are active; the mechanism assemblies also support pose inspection. WASD defaults to field-relative translation; J/L turns independently. Debug offers robot-relative input for comparison.

## Current baseline

| Parameter | Value |
| --- | --- |
| Mass | 56 kg |
| Bumper envelope | 0.8509 × 0.85725 m, 0.1143 m tall |
| Wheelbase / track | 0.56515 / 0.55245 m |
| Wheel radius | 0.0508 m |
| Body height at rest | Approximately 0.223 m to its center of mass |
| Top speed | 5.09016 m/s (16.7 ft/s) per module |
| Module speed slew limit | 10.0584 m/s² (33 ft/s²) |
| Turn command | Up to 4.8 rad/s before module desaturation |
| Tire grip coefficient | 1.05, approximately 130 lbf empty traction |
| Steering slew limit | 18 rad/s |
| Spring / damper per contact | 18,000 N/m / 650 N·s/m |
| Effective suspension travel | 0.08 m droop; 0.095 m compression |
| Fixed timestep | 1/120 s |

Speed, acceleration, and grip can be adjusted live in Debug. These are tunable prototype parameters, not measured specifications of a competition robot. The speed slew limit is a wheel command limit; actual chassis acceleration depends on contact, grip, steering, and impact forces.

## Contact and drive model

The input adapter converts the selected field/robot driver frame to robot-relative commands. Each physics tick computes four module velocity targets from robot-relative translation and yaw. Translation is normalized so diagonals have no speed advantage. Combined translation/rotation is desaturated against the module speed limit. Each module chooses the shorter steering rotation, reversing wheel direction as needed; both steering and wheel speed change at finite rates.

A filtered downward ray from each rotated module mount finds the field surface and normal. Spring compression and normal velocity determine support load. Longitudinal speed error and lateral slip produce tire forces in the surface tangent plane. Their combined magnitude is limited by grip times support load. Forces act at the contact patches, while pitch and roll are locked. The chassis can still yaw, heave, and become airborne. Unsupported modules produce no propulsion or steering torque.

The lower bumper edge is approximately 40 mm above the carpet at rest, placing the vertical bumper face across the 75 mm fuel center. This lets the bumper push floor fuel before it reaches the wheels. The CAD bellypan is about 40 mm above the carpet. This clearance prevents the frame from climbing ordinary floor fuel.

Rapier resolves bumper/frame impacts against the prepared walls, posts, beams, and upper fuel contacts. Low fuel uses a planar bumper displacement solver, including when the robot lands over it; floor support belongs to the ray springs so it is not counted twice. Collision groups exclude low fuel from vertical chassis and CCD support while retaining physical fuel/floor/field contacts. Displacement checks the swept ball against field geometry, avoiding teleportation through barriers. Fuel and the chassis use continuous collision detection. The body pose or velocity is never prescribed during driving; teleporting is reserved for reset/test-location commands.

The [Rapier scene query documentation](https://rapier.rs/docs/user_guides/javascript/scene_queries/) describes the filtered ray/shape queries used here. This is a custom swerve contact model, rather than an Ackermann vehicle controller.

## Camera and input

The follow camera tracks position with exponential smoothing, preserving the field heading by default (following chassis heading in robot-relative mode), and maintains a gravity-aligned horizon. Its offset is 4.8 m behind and 2.9 m above the robot, giving a lower viewing angle. It keeps its distance through trenches and near walls. Field structures blocking the robot fade temporarily, then return to normal; orbit/free-flight inspection restores full visibility. Physics queries identify the obstruction without moving the camera or changing collisions. The debug panel also offers field presets.

Held keys are cleared on blur, pause, camera changes, respawn, and modal opening. Free flight consumes the movement keys and disables robot drive input. The play HUD does not show collider/performance controls until Debug is opened; closing it restores the normal scene.

## Limits to retain during tuning

The ray contacts and compliant support are an approximation of four real modules and tire compliance. They are not a detailed suspension, wheel deformation, tread, motor electrical, or battery model. Abrupt edges, side-loaded wheels, extreme tuning values, high-speed angled impacts, and concentrated fuel piles need further driver feedback and stress testing. Pitch and roll are deliberately locked for gameplay.

Both the collecting and starting Re•Blitz configurations clear the tested trench arms with the hood at its travel pose. Taller robot models will need their own physical geometry, mass/inertia, clearance tests, and drivetrain calibration.

## FRSim comparison

Revisited [FRSim REBUILT](https://rebuilt.frsim.com/) Beta v31 on October 30, 2026, driving the 2910 Jack in the Bot v2 in singleplayer. Compared translation, J/L turning, trench passage, and contact with the neutral fuel supply without commanding intake. In the tested view, the camera retained its field orientation while the chassis turned, and bumper contact scattered floor fuel while the robot stayed low. This informed field-relative input, the fixed-heading follow view, and bumper-height tuning here. This was a qualitative reference session; no source code, exact coefficients, or measured trajectories were available. It is not a claim of identical physics.

## Re•Blitz asset fit

The generic visual model has been replaced with the prepared team CAD. Bumper dimensions and module centers come from the exported geometry; empty mass (56 kg), inertia, and tire tuning remain explicit estimates. The physical frame stays parallel to the carpet. A nine-point footprint query samples only the actual bump triangles; damped, rate-limited terrain support raises the frame over them. Bump/chassis contacts are excluded to avoid bellypan or intake beaching; all other field geometry remains solid. Visible modules reach toward their individual ramp surfaces. Rounded bumper proxies retain the CAD envelope. Intake, hopper, and hood inspection sliders update visuals and collision shapes together; pose preview suspends normal intake behavior until resumed. Crossing checks cover both alliances, all bump/trench lanes, full-speed acceleration, diagonal approaches and loaded cargo.

WASD and J/L remain active. Shift precision and Space brake have been retired. Shift deploys/intakes and Q reverses; Space now owns chassis yaw while held, aligns, and shoots/passes; WASD remains available. See `SHOOTER.md` for readiness and motion-compensation limits. Speed can still be adjusted in Debug.
