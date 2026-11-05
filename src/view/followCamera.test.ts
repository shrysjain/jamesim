import { expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { stabilizeFollowCamera } from './followCamera';

it('keeps the viewing angle and distance steady through bumps, acceleration and turns', () => {
  const camera = new PerspectiveCamera(), position = new Vector3(-4.8, 2.9, 0), target = new Vector3(.5, .25, 0);
  for (let tick = 0; tick < 240; tick++) {
    const heading = tick * .04, forward = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const robot = new Vector3(Math.sin(tick * .02) * 4, Math.sin(tick * .08) * .4, tick * .01);
    position.lerp(robot.clone().add(new Vector3(0, 2.9, 0)).addScaledVector(forward, -4.8), 1 - Math.exp(-7 / 60));
    target.lerp(robot.clone().add(new Vector3(0, .25, 0)).addScaledVector(forward, .5), 1 - Math.exp(-10 / 60));
    stabilizeFollowCamera(position, target, forward);
    camera.position.copy(position); camera.lookAt(target);
    expect(Math.asin(-camera.getWorldDirection(new Vector3()).y)).toBeCloseTo(Math.atan(.5), 10);
    expect(position.distanceTo(target)).toBeCloseTo(Math.hypot(5.3, 2.65), 10);
  }
});

it('recovers a coincident camera and target behind the current heading', () => {
  const target = new Vector3(2, 1, -3), position = target.clone();
  stabilizeFollowCamera(position, target, new Vector3(0, 0, -1));
  expect(position.toArray()).toEqual([2, 3.65, 2.3]);
});
