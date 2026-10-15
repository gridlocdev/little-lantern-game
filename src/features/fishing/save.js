import { state } from '../../game/state.js';

// Fishing's part of the save.
export const save = state.slice('fishing', { fish: {}, best: {}, aquarium: [], released: 0 });
