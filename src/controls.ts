export const ACTION_LABELS = {
  forward: 'Forward', backward: 'Backward', left: 'Strafe left', right: 'Strafe right',
  turnLeft: 'Turn left', turnRight: 'Turn right', intake: 'Intake', shoot: 'Aim / shoot / pass',
  reverse: 'Reverse / eject', toggleIntake: 'Toggle intake extension', switchIntake: 'Switch active intake side', climb: 'Toggle climber', supply: 'Human-player supply', restart: 'Restart session', pause: 'Pause / resume',
} as const;
export type Action = keyof typeof ACTION_LABELS;
export type Controls = { keys: Record<Action, string[]>; buttons: Record<Action, number | null>; deadzone: number; gamepad: boolean };
export const DEFAULT_CONTROLS: Controls = {
  keys: { forward: ['KeyW', 'ArrowUp'], backward: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], turnLeft: ['KeyJ'], turnRight: ['KeyL'], intake: ['ShiftLeft', 'ShiftRight'], shoot: ['Space'], reverse: ['KeyQ'], toggleIntake: ['KeyV'], switchIntake: ['KeyN'], climb: ['KeyC'], supply: ['KeyB'], restart: ['KeyR'], pause: ['KeyP'] },
  buttons: { forward: null, backward: null, left: null, right: null, turnLeft: null, turnRight: null, intake: 4, shoot: 7, reverse: 5, toggleIntake: null, switchIntake: 3, climb: 0, supply: 2, restart: 8, pause: 9 },
  deadzone: 0.15, gamepad: true,
};
export const ACTIONS = Object.keys(ACTION_LABELS) as Action[];
const reserved = new Set(['Escape', 'Enter', 'KeyH', 'Backquote']);
export function validKey(code: unknown): code is string { return typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Numpad([0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|F([2-4]|[6-9]|10)|Home|End|PageUp|PageDown|Insert|Delete|Space|Tab|Backspace|Bracket(Left|Right)|Semicolon|Quote|Comma|Period|Slash|Minus|Equal)$/.test(code) && !reserved.has(code); }
export function validateControls(value: unknown): Controls {
  const s = (value && typeof value === 'object' ? value : {}) as Partial<Controls>;
  const keys = {} as Controls['keys'], buttons = {} as Controls['buttons'];
  for (const action of ACTIONS) {
    const saved = s.keys?.[action];
    // Migrate the previous default without overwriting a custom climber binding.
    const list = action === 'climb' && saved?.length === 1 && saved[0] === 'KeyT' ? ['KeyC'] : saved;
    keys[action] = Array.isArray(list) && list.length <= 4 && list.every(validKey) ? [...new Set(list)] : [...DEFAULT_CONTROLS.keys[action]];
    const button = s.buttons?.[action];
    buttons[action] = button === null || (typeof button === 'number' && Number.isInteger(button) && button >= 0 && button < 32) ? button : DEFAULT_CONTROLS.buttons[action];
  }
  // Preserve explicit saved assignments before adding defaults for new actions.
  const explicitKey = (action: Action) => Array.isArray(s.keys?.[action]) && s.keys![action].every(validKey);
  const usedKeys = new Set<string>();
  for (const action of [...ACTIONS].sort((a, b) => Number(explicitKey(b)) - Number(explicitKey(a)))) {
    keys[action] = keys[action].filter(code => { if (usedKeys.has(code)) return false; usedKeys.add(code); return true; });
  }
  const usedButtons = new Set<number>();
  for (const action of [...ACTIONS].sort((a, b) => Number(s.buttons?.[b] !== undefined) - Number(s.buttons?.[a] !== undefined))) {
    const button = buttons[action];
    if (button !== null) { if (usedButtons.has(button)) buttons[action] = null; else usedButtons.add(button); }
  }
  return { keys, buttons, deadzone: typeof s.deadzone === 'number' && Number.isFinite(s.deadzone) ? Math.max(0.05, Math.min(0.5, s.deadzone)) : DEFAULT_CONTROLS.deadzone, gamepad: typeof s.gamepad === 'boolean' ? s.gamepad : true };
}
/** Rebinding swaps conflicting primary assignments and removes conflicting aliases. */
export function bindKey(controls: Controls, action: Action, code: string): Controls {
  if (!validKey(code)) return controls;
  const keys = structuredClone(controls.keys), old = keys[action][0];
  for (const other of ACTIONS) if (other !== action && keys[other].includes(code)) keys[other] = keys[other].filter(k => k !== code).concat(keys[other].length === 1 && old ? [old] : []);
  keys[action] = [code]; return { ...controls, keys };
}
export function bindButton(controls: Controls, action: Action, button: number | null): Controls {
  const buttons = { ...controls.buttons }, previous = buttons[action];
  if (button !== null) for (const other of ACTIONS) if (other !== action && buttons[other] === button) buttons[other] = previous;
  buttons[action] = button;
  return { ...controls, buttons };
}
export function keyLabel(code?: string) { if (!code) return 'Unbound'; return ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift L', ShiftRight: 'Shift R', Space: 'Space' } as Record<string, string>)[code] ?? code.replace(/^Key|^Digit/, '').replace('Numpad', 'Num '); }
export function axisValue(value: number, deadzone: number) {
  if (!Number.isFinite(value) || Math.abs(value) <= deadzone) return 0;
  return Math.sign(value) * Math.min(1, (Math.abs(value) - deadzone) / (1 - deadzone));
}
export function readActions(keys: ReadonlySet<string>, controls: Controls, pad?: Pick<Gamepad, 'axes' | 'buttons'> | null): Record<Action, number> {
  const actions = {} as Record<Action, number>;
  for (const action of ACTIONS) {
    const button = controls.buttons[action];
    actions[action] = keys && controls.keys[action].some(k => keys.has(k)) ? 1 : controls.gamepad && button !== null && pad?.buttons[button]?.pressed ? 1 : 0;
  }
  if (controls.gamepad && pad) {
    const x = axisValue(pad.axes[0] ?? 0, controls.deadzone), y = axisValue(pad.axes[1] ?? 0, controls.deadzone), turn = axisValue(pad.axes[2] ?? 0, controls.deadzone);
    actions.forward = Math.max(actions.forward, -y); actions.backward = Math.max(actions.backward, y);
    actions.left = Math.max(actions.left, -x); actions.right = Math.max(actions.right, x);
    actions.turnLeft = Math.max(actions.turnLeft, -turn); actions.turnRight = Math.max(actions.turnRight, turn);
  }
  return actions;
}
