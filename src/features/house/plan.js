// Where things are in and around the house: its size, its door, and room coordinates.
import { vec3 } from '../../platform/engine.js';
import { HOUSE_IN } from '../../world/layout.js';

export const HOUSE = { W: 8, D: 7, H: 4 };

export const ROOM = { w: 12, d: 9, h: 4.2 };
export const hin = (x, y, z)=> HOUSE_IN.add(vec3(x, y, z));
