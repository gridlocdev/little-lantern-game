import { benchFeature } from './bench/index.js';
import { chimesFeature } from './chimes/index.js';
import { fallenStarsFeature } from './fallen-stars/index.js';
import { fishingFeature } from './fishing/index.js';
import { houseFeature } from './house/index.js';
import { introFeature } from './intro/index.js';
import { moonletFeature } from './moonlet/index.js';
import { mushroomsFeature } from './mushrooms/index.js';
import { overlookFeature } from './overlook/index.js';
import { sheepFeature } from './sheep/index.js';
import { snailFeature } from './snail/index.js';
import { swingFeature } from './swing/index.js';
import { telescopeFeature } from './telescope/index.js';

// Every feature, in build order. Build order is the order of draws from the seeded world random, so a feature that
// draws (swing, chimes, moonlet, mushrooms, overlook, fishing's pier, sheep) must keep its place or the island's
// scenery moves. Adding a feature: one import and one entry here.
export const features = [
    houseFeature, benchFeature, snailFeature, swingFeature, chimesFeature, moonletFeature, mushroomsFeature,
    overlookFeature, telescopeFeature, fishingFeature, sheepFeature, fallenStarsFeature,
    introFeature,       // draws nothing; listed last anyway
];
