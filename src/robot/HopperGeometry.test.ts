import { describe, expect, it } from 'vitest';
import { hopperFloorContact, hopperFloorHeight, hopperFloorPoints, hopperObstacleContact } from './hopperGeometry';
import { KEPLER } from './registry';
import { validateRobotDefinition } from './validateDefinition';
import type { HopperObstacle } from './types';

describe('measured hopper contact geometry', () => {
  const cylinder: HopperObstacle = { shape: 'cylinder', center: [0,0,0], halfExtents: [.3,.1,.3] };
  it('resolves round sides, caps and their rounded sphere-contact edge', () => {
    expect(hopperObstacleContact([.35,0,0],cylinder)).toEqual({ distance: expect.closeTo(.05), normal: [1,0,0] });
    expect(hopperObstacleContact([0,.15,0],cylinder)).toEqual({ distance: expect.closeTo(.05), normal: [0,1,0] });
    const edge = hopperObstacleContact([.35,.15,0],cylinder);
    expect(edge.distance).toBeCloseTo(Math.SQRT2*.05);
    expect(edge.normal[0]).toBeCloseTo(Math.SQRT1_2); expect(edge.normal[1]).toBeCloseTo(Math.SQRT1_2);
  });
  it('leaves the recessed bowl open and points its inner wall into the bowl', () => {
    const ring = { ...cylinder, shape: 'annulus' as const, innerRadius: .2 };
    const inner = hopperObstacleContact([.15,0,0],ring);
    expect(inner.distance).toBeCloseTo(.05);
    inner.normal.forEach((component,axis) => expect(component).toBeCloseTo(axis === 0 ? -1 : 0));
    expect(hopperObstacleContact([0,0,0],ring).distance).toBeCloseTo(.2);
    expect(hopperObstacleContact([.25,0,0],ring).distance).toBeLessThan(0);
  });
  it('crops a round raised platform to the measured rectangular frame', () => {
    const ring: HopperObstacle = { ...cylinder, shape: 'annulus', halfExtents: [.5,.1,.5], innerRadius: .2667, clipHalfExtents: [.33,.1,.32] };
    expect(hopperObstacleContact([.42,0,0],ring).distance).toBeCloseTo(.09);
    expect(hopperObstacleContact([.3,0,.1],ring).distance).toBeLessThan(0);
    expect(hopperObstacleContact([0,0,0],ring).distance).toBeCloseTo(.2667);
  });
  it('keeps rotated contact normals in chassis coordinates', () => {
    const contact = hopperObstacleContact([-.15,0,0],{ ...cylinder, angle: Math.PI/2 });
    expect(contact.distance).toBeCloseTo(.05); expect(contact.normal[0]).toBeCloseTo(-1);
  });
  it('supports the finite roller peak after a sphere center has passed it', () => {
    const points = [{x:-.1,y:0},{x:0,y:.1},{x:.1,y:0}];
    const contact = hopperFloorContact([.03,.15,0],KEPLER.hopper.volume!,points);
    expect(contact.distance).toBeCloseTo(Math.hypot(.03,.05));
    expect(contact.normal[0]).toBeCloseTo(.03/Math.hypot(.03,.05));
    expect(contact.normal[1]).toBeGreaterThan(0);
    expect(hopperFloorHeight(-.5,KEPLER.hopper.volume!,points)).toBe(0);
  });
  it('moves and sorts the carriage floor through a fixed bed without mutating authored points', () => {
    const definition = { ...KEPLER, intake: { ...KEPLER.intake, stowTravel:.34417,stowRise:.057 }, hopper: { ...KEPLER.hopper,
      floorProfile: [{x:-.59587,y:-.0356,part:'intake' as const},{x:-.28565,y:-.0395},{x:.11443,y:-.1056}] } };
    const before = JSON.stringify(definition.hopper.floorProfile);
    const points = hopperFloorPoints(definition,{intake:0,hopper:1,hood:0});
    expect(points[0].x).toBeCloseTo(-.28565); expect(points[1].x).toBeCloseTo(-.2517);
    expect(points[1].y).toBeCloseTo(.0214); expect(JSON.stringify(definition.hopper.floorProfile)).toBe(before);
  });
  it('rejects invalid round solids and active contact tuning', () => {
    expect(validateRobotDefinition({...KEPLER,hopper:{...KEPLER.hopper,obstacles:[{...cylinder,halfExtents:[.3,.1,.2]}]}})).not.toEqual([]);
    expect(validateRobotDefinition({...KEPLER,hopper:{...KEPLER.hopper,physics:{restitution:1.2,friction:.2}}})).not.toEqual([]);
  });
});
