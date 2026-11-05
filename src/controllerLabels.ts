const STANDARD_BUTTONS = [
  'A / Cross', 'B / Circle', 'X / Square', 'Y / Triangle',
  'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2',
  'View / Share', 'Menu / Options', 'Left stick / L3', 'Right stick / R3',
  'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home / PS',
] as const;

export function controllerButtonLabel(button: number | null): string {
  return button === null ? 'Unbound' : STANDARD_BUTTONS[button] ?? `Button ${button}`;
}
