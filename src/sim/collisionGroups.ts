// Upper 16 bits are membership; lower 16 bits are the accepted counterpart groups.
export const CollisionGroups = {
  field: 0x0001ffff,
  // The chassis follows bump height through its level suspension platform.
  // Fuel, probes and ray queries still use the original bump triangles.
  bump: 0x0001fffb,
  fuel: 0x0002ffff,
  groundFuel: 0x0002fffb,
  chassis: 0x0004ffff,
  wheelFuel: 0x00040002,
  probe: 0x0008ffff,
};
