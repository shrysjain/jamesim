import { expect, it } from 'vitest';
import { playerCameraFrame } from './playerCamera';
import { FIELD_HALF_LENGTH } from '../field/targets';

it('keeps the driver eye behind its own wall regardless of robot motion or heading', () => {
  for (const alliance of ['blue', 'red'] as const) {
    const a = playerCameraFrame('station', { x: 2, y: .2, z: 3 }, 0, alliance, .4);
    const b = playerCameraFrame('station', { x: -5, y: .5, z: -3 }, Math.PI, alliance, .8);
    expect(a).toEqual(b);
    expect(a.position[0] * (alliance === 'blue' ? 1 : -1)).toBeGreaterThan(FIELD_HALF_LENGTH);
    expect(a.position[2]).toBe(alliance === 'blue' ? 2.1 : -2.1);
    expect(a.position[1]).toBe(1.7); expect(a.target).toEqual([0, .65, 0]);
  }
});

it('moves the POV eye with the chassis and looks along local +X through quarter turns', () => {
  for (const [heading, direction] of [[0, [1, 0]], [Math.PI / 2, [0, -1]], [Math.PI, [-1, 0]], [-Math.PI / 2, [0, 1]]] as const) {
    const p = { x: 3, y: .4, z: -2 };
    const frame = playerCameraFrame('pov', p, heading, 'blue', .6);
    expect(frame.position).toEqual([3, 1, -2]);
    expect(frame.target[0] - frame.position[0]).toBeCloseTo(direction[0] * 5);
    expect(frame.target[2] - frame.position[2]).toBeCloseTo(direction[1] * 5);
    expect(frame.target[1]).toBe(frame.position[1]);
    expect(playerCameraFrame('pov', p, heading, 'red', .6)).toEqual(frame);
    expect(p).toEqual({ x: 3, y: .4, z: -2 });
  }
});
