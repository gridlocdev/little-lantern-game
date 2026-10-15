// Spots kept clear when scenery is scattered.
import { dist2 } from '../lib/math.js';

// keep spots clear for scenery placement
export const clearings = [];
export const addClearing = (x, z, r, noGrass = false)=> clearings.push({ x, z, r, noGrass });
export const isClear = (x, z, pad = 0)=> !clearings.some((c)=> dist2(x, z, c.x, c.z) < c.r + pad);
export const grassClear = (x, z)=> !clearings.some((c)=> c.noGrass && dist2(x, z, c.x, c.z) < c.r);
