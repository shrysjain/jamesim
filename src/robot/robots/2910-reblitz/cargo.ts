import type { Vec3 } from '../../../field/types';
import type { HopperVolume } from '../../types';
import { packedCargo } from '../../cargoPacking';
export const REBLITZ_VOLUME: HopperVolume = { frontX: -.63897, backX: .30, halfWidth: .34845, floorY: -.10, ceilingY: .327, frontTravel: .29845, slopedFront: true };
const pocket: Vec3 = [.13, .04, 0];
export const REBLITZ_CARGO = packedCargo(REBLITZ_VOLUME, [0, 0, .012, 0], [pocket]).slice(0, 64);
export const REBLITZ_FEEDER_POCKET = REBLITZ_CARGO.length;
REBLITZ_CARGO.push(pocket);
