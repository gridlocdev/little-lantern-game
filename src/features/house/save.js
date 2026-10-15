import { state } from '../../game/state.js';

// The house's part of the save.
export const save = state.slice('house', { flower: 0, flowerWatered: -1, cat: 0, tea: 0, books: {}, slept: 0, outfitsTried: undefined });
