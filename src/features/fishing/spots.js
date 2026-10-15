import { addFishingSpot } from './minigame.js';
import { waters } from '../../world/waters.js';

// Places to fish: every body of water the world registers.
export function buildFishingSpots() { for (const w of waters) addFishingSpot(w); }
