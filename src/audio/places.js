// Places that sound different: near one, the island's music brings in that place's layer (the pond's bells, the
// crystal hill's glass, the cabin's guitar, a fallen star's choir). The world and features add them as they build.
// A place: { name, at() → { x, z } or null when it isn't there right now, near, far } in meters.
import { player } from '../player/player.js';

const places = [];
export const addSoundPlace = (p)=> { places.push(p); return p; };

// how near the player is to the nearest place of that name: 1 within `near`, easing to 0 at `far`, 0 indoors
export function nearness(name)
{
    if (player.zone !== 'island') return 0;
    let best = 0;
    for (const p of places)
    {
        if (p.name !== name) continue;
        const at = p.at();
        if (!at) continue;
        const k = Math.min(1, Math.max(0, (p.far - Math.hypot(player.pos.x - at.x, player.pos.z - at.z)) / (p.far - p.near)));
        best = Math.max(best, k * k * (3 - 2 * k));
    }
    return best;
}
