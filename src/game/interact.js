// Things the player can use: each has a position, a reach and an action. The closest one the player faces gets the prompt.
import { abs, vec3 } from '../platform/engine.js';
import { input } from '../platform/input.js';

const interactables = [];
export function addInteract(o)
{
    o.zone ||= 'island';
    o.r ||= 2;
    interactables.push(o);
    return o;
}
export let focusItem = null;
export function updateInteract(player, enabled)
{
    focusItem = null;
    if (!enabled) return;
    let best = 1e9;
    const fwd = vec3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    for (const it of interactables)
    {
        if (it.zone !== player.zone) continue;
        if (it.when && !it.when()) continue;
        const pos = typeof it.pos === 'function' ? it.pos() : it.pos;
        const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > it.r || abs(pos.y - player.pos.y) > (it.dy || 3)) continue;
        const facing = d > .01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
        const score = d - facing * .8 - (it.priority || 0);
        if (score < best) { best = score; focusItem = it; }
    }
    if (focusItem && input.act())
    {
        const it = focusItem;
        focusItem = null;
        it.act();
    }
}
