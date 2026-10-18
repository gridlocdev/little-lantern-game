import { state } from '../../game/state.js';

// The snail's part of the save: whether you have met Oswin, and how racing him has gone.
export const save = state.slice('snail', { met: false, raced: false, wins: 0, best: 0 });
