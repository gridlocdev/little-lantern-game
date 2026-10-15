// Where things are in and around the house: its size, its door, and room coordinates.
import { vec3 } from '../../platform/engine.js';
import { HOUSE_IN } from '../../world/layout.js';

export const HOUSE = { W: 8, D: 7, H: 4 };

export const ROOM = { w: 12, d: 9, h: 4.2 };
export const hin = (x, y, z)=> HOUSE_IN.add(vec3(x, y, z));
// furniture the mothling walks between, in room coordinates: the bookshelf against the west wall and the armchair,
// which faces the fire (its front is toward -z)
export const SHELF = { x: -5.6, z: -1.4 };
export const CHAIR = { x: -2.6, z: -1.2 };
export const BED = { x: 4.1, z: -2.6 };          // the bed's middle; its pillow end is toward -z, against the back wall
