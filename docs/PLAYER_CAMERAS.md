# Player camera views

Open Settings from singleplayer or Escape → Settings during play. Camera offers Follow (the unchanged default), Driver station, Robot POV and Freecam. The choice is saved locally and survives restarting a match or selecting another robot. Old or invalid saved choices use Follow; Restore defaults restores it too.

Driver station is a fixed, 1.7 m eye-height view behind an outer station on the selected alliance wall, looking across the field clear of the central tower. Robot POV looks along chassis +X from above its hopper; translation, height and yaw follow the chassis. Driving remains alliance-relative in both views. These are fitted viewpoints, not team-specific onboard camera calibrations.

Freecam uses WASD to move, Q/E down/up, Shift for faster movement and right-button drag to look. It starts from the current camera position. Movement stops on pause/focus loss, which also clears held keys. Robot drive and mechanisms are suspended while Freecam is selected; the normal pause and restart commands remain available. The match clock continues while exploring an unpaused match, so use practice for unrestricted exploration.

The three additional view types were explicitly requested for issue #20, with FRSim as the interaction reference. No FRSim assets or code are copied. Development orbit inspection, presets and scene diagnostics remain development-only. The approved Follow framing and its occlusion handling are retained.
