// Picks what the mothling would use: the closest thing in reach that it faces, while nothing else has control.
import { activity } from '../game/activity.js';
import { updateInteract } from '../game/interact.js';
import { state } from '../game/state.js';
import { player } from './player.js';
import { uiOpen } from '../ui/dom.js';

export const interactionSystem = {
    update() { updateInteract(player, state.mode === 'play' && !activity.current && !uiOpen()); },
};
