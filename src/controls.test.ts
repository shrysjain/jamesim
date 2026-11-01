import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTROLS, axisValue, bindKey, readActions, validateControls } from './controls';
describe('player controls', () => {
  it('validates saved inputs and survives corrupt bindings', () => {
    const c = validateControls({ keys: { shoot: ['Escape'] }, deadzone: NaN, buttons: { shoot: -2 } });
    expect(c).toEqual(DEFAULT_CONTROLS);
    c.keys.shoot.push('KeyZ'); expect(DEFAULT_CONTROLS.keys.shoot).toEqual(['Space']);
  });
  it('swaps primary bindings without losing another action', () => {
    const c = bindKey(DEFAULT_CONTROLS, 'shoot', 'KeyQ');
    expect(c.keys.shoot).toEqual(['KeyQ']); expect(c.keys.reverse).toEqual(['Space']);
    expect(readActions(new Set(['KeyQ']), c).shoot).toBe(1);
    expect(readActions(new Set(['KeyQ']), c).reverse).toBe(0);
  });
  it('rescales the deadzone and combines keyboard and controller input', () => {
    expect(axisValue(0.1, .15)).toBe(0); expect(axisValue(1, .15)).toBe(1);
    const c = readActions(new Set(['ShiftLeft']), DEFAULT_CONTROLS, { axes: [1, -1, 0], buttons: [] });
    expect(c).toMatchObject({ intake: 1, forward: 1, right: 1, turnLeft: 0 });
  });
});
