import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTROLS, axisValue, bindKey, bindButton, readActions, validateControls } from './controls';
describe('player controls', () => {
  it('retains WASD, intake and shoot when the driver releases only turn', () => {
    const keys = new Set(['KeyW', 'KeyD', 'ShiftLeft', 'Space', 'KeyJ']);
    expect(readActions(keys, DEFAULT_CONTROLS)).toMatchObject({ forward: 1, right: 1, intake: 1, shoot: 1, turnLeft: 1 });
    keys.delete('KeyJ');
    expect(readActions(keys, DEFAULT_CONTROLS)).toMatchObject({ forward: 1, right: 1, intake: 1, shoot: 1, turnLeft: 0 });
  });
  it('combines controller translation, turning, intake and shoot independently', () => {
    const buttons = Array.from({ length: 8 }, (_, i) => ({ pressed: i === 4 || i === 7 })) as GamepadButton[];
    const actions = readActions(new Set(), DEFAULT_CONTROLS, { axes: [.5, -.8, -.6], buttons });
    expect(actions).toMatchObject({ intake: 1, shoot: 1 });
    expect(actions.forward).toBeGreaterThan(.5); expect(actions.right).toBeGreaterThan(.2); expect(actions.turnLeft).toBeGreaterThan(.4);
  });
  it('adds an independent intake key and gamepad button without overwriting saved assignments', () => {
    expect(DEFAULT_CONTROLS.keys.switchIntake).toEqual(['KeyN']);
    const c = validateControls({ keys: { forward: ['KeyN'] }, buttons: { shoot: 3 } });
    expect(c.keys.forward).toEqual(['KeyN']); expect(c.keys.switchIntake).toEqual([]);
    expect(c.buttons.shoot).toBe(3); expect(c.buttons.switchIntake).toBeNull();
    expect(readActions(new Set(['KeyN']), bindKey(c, 'switchIntake', 'KeyN')).switchIntake).toBe(1);
  });
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
