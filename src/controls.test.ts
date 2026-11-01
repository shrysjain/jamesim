import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTROLS, axisValue, bindKey, bindButton, readActions, validateControls } from './controls';
describe('player controls', () => {
  it('uses C for the climber and migrates the prior default without changing custom keys', () => {
    expect(DEFAULT_CONTROLS.keys.climb).toEqual(['KeyC']);
    expect(validateControls({ keys: { climb: ['KeyT'] } }).keys.climb).toEqual(['KeyC']);
    expect(validateControls({ keys: { climb: ['KeyZ'] } }).keys.climb).toEqual(['KeyZ']);
  });
  it('preserves a saved key when a newly added action has the same default', () => {
    const before = structuredClone(DEFAULT_CONTROLS); before.keys.forward = ['KeyV'];
    const saved = JSON.parse(JSON.stringify(before)); delete saved.keys.toggleIntake;
    const restored = validateControls(saved);
    expect(restored.keys.forward).toEqual(['KeyV']); expect(restored.keys.toggleIntake).toEqual([]);
    const rebound = bindKey(restored, 'toggleIntake', 'KeyV');
    expect(rebound.keys.toggleIntake).toEqual(['KeyV']); expect(rebound.keys.forward).toEqual([]);
  });
  it('swaps controller button conflicts', () => {
    const c = bindButton(DEFAULT_CONTROLS, 'shoot', 0);
    expect(c.buttons.shoot).toBe(0); expect(c.buttons.climb).toBe(7);
    expect(bindButton(c, 'shoot', null).buttons.shoot).toBeNull();
  });
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
