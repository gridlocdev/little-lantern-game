// Places you can arrive at, and their titles.
import { state } from '../game/state.js';
import { dist2 } from '../lib/math.js';
import { player } from '../player/player.js';
import { showPlace } from './toast.js';

// places you can arrive at
export const PLACE_NAMES = [];
let currentPlace = null;
export function updatePlaces()
{
    let here = null;
    for (const p of PLACE_NAMES)
        if (p.zone === player.zone && dist2(player.pos.x, player.pos.z, p.x, p.z) < p.r) { here = p; break; }
    if (here !== currentPlace)
    {
        currentPlace = here;
        if (here && state.mode === 'play') showPlace(here.name, here.sub);
    }
}
