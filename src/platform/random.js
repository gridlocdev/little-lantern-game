// The seeded world random. Scenery placement depends on the order of every draw from it,
// so the build order in main.js and features/index.js must stay stable or the island's scenery moves.
import { RandomGenerator } from './engine.js';

// world random, seeded so the island is the same every visit
export const WR = new RandomGenerator(90210);
export const rr = (a, b)=> WR.float(a, b);
