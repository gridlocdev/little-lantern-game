// Ground and collision queries for a walker in a zone.
import { player } from '../player/player.js';
import { boxLocal, solidContains, solidTop, solidsAt } from './collision.js';
import { insideIsland } from './layout.js';
import { heightAt } from './terrain.js';

export function groundInfo(x, z, feetY)
{
    // returns the highest floor at or just under the feet, and what it is
    let y = -1e9, on;
    if (player.zone === 'island' && insideIsland(x, z, .6)) y = heightAt(x, z);
    for (const s of solidsAt(x, z))
    {
        if (s.zone !== player.zone || s.disabled) continue;
        if (!solidContains(s, x, z)) continue;
        const top = solidTop(s, x, z);
        if (top <= feetY + .45 && top > y) { y = top; on = s; }
    }
    return { y, on };
}
export function pushOutOfSolids(p, feetY)
{
    for (const s of solidsAt(p.x, p.z))
    {
        if (s.zone !== player.zone || s.disabled || s.platformOnly) continue;
        const top = solidTop(s, p.x, p.z);
        if (feetY >= top - .45 || feetY + 1.2 < s.bottom) continue;
        const PR = .32;
        if (s.kind === 'circle')
        {
            const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r + PR;
            if (d < m && d > 1e-5) { p.x = s.x + dx / d * m; p.z = s.z + dz / d * m; }
        }
        else
        {
            let [lx, lz] = boxLocal(s, p.x, p.z);
            const ex = s.hx + PR, ez = s.hz + PR;
            if (Math.abs(lx) < ex && Math.abs(lz) < ez)
            {
                if (ex - Math.abs(lx) < ez - Math.abs(lz)) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez;
                p.x = s.x + lx * s.c + lz * s.s;
                p.z = s.z - lx * s.s + lz * s.c;
            }
        }
    }
}
// is this a spot the mothling may stand: on the island, or on something built over the void
export function walkable(x, z, feetY)
{
    if (player.zone === 'island' && insideIsland(x, z, 1.2)) return true;
    for (const s of solidsAt(x, z))
        if (s.zone === player.zone && !s.disabled && s.floor && solidContains(s, x, z, -.15) && solidTop(s, x, z) <= feetY + .6) return true;
    return false;
}
