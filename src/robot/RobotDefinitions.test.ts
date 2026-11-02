import { describe, expect, it } from 'vitest';
import { ROBOTS } from './registry';
import { validateRobotDefinition } from './validateDefinition';

describe('robot definition contract', () => {
  it('has unique stable IDs matching the registry keys', () => {
    const values = Object.values(ROBOTS);
    expect(new Set(values.map(d => d.id)).size).toBe(values.length);
    for (const [id, definition] of Object.entries(ROBOTS)) expect(definition.id).toBe(id);
  });
  for (const definition of Object.values(ROBOTS)) it(`${definition.id}: valid geometry, capabilities and full-size cargo`, () => {
    expect(validateRobotDefinition(definition)).toEqual([]);
    const slots = definition.cargoSlots;
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      expect(Math.hypot(...slots[i].map((v, k) => v - slots[j][k])), `cargo seeds ${i}/${j}`).toBeGreaterThanOrEqual(.15);
    }
  });
  it('rejects a plausible-looking incomplete robot instead of accepting inherited assumptions', () => {
    const base = Object.values(ROBOTS)[0];
    expect(validateRobotDefinition({ ...base, teamNumber: '9999', id: '9999-test', mass: NaN, cargoSlots: [] })).toEqual(expect.arrayContaining([
      'Name and prepared model path are required.', 'Dimensions, empty mass and inertia must be finite and positive.', 'Provide one finite cargo seed per capacity slot.',
    ]));
    expect(validateRobotDefinition({ ...base, mechanisms: { ...base.mechanisms, turret: true, climb: true } })).toEqual(expect.arrayContaining([
      'A turret requires its bearing pivot.', 'Climb capability and physics profile must agree.',
    ]));
  });
});
