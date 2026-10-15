// Solids: circles and turned boxes on the ground, walls below their top and floors on it.
import { dist2 } from '../lib/math.js';

// a solid is a circle or a turned box on the ground: a wall below its top, a floor on top of it
const SOLID_CELL = 8;
const solidGrid = new Map();
const solidKey = (cx, cz)=> cx * 10007 + cz;
export function addSolid(s)
{
    s.zone ||= 'island';
    s.bottom ??= -1e9;
    if (s.kind === 'box') { s.c = Math.cos(s.yaw || 0); s.s = Math.sin(s.yaw || 0); }
    const ext = s.kind === 'box' ? Math.hypot(s.hx, s.hz) : s.r;
    for (let cz = Math.floor((s.z - ext) / SOLID_CELL); cz <= Math.floor((s.z + ext) / SOLID_CELL); cz++)
    for (let cx = Math.floor((s.x - ext) / SOLID_CELL); cx <= Math.floor((s.x + ext) / SOLID_CELL); cx++)
    {
        const k = solidKey(cx, cz);
        if (!solidGrid.has(k)) solidGrid.set(k, []);
        solidGrid.get(k).push(s);
    }
    return s;
}
function removeSolid(s)
{
    for (const list of solidGrid.values())
    {
        const i = list.indexOf(s);
        if (i >= 0) list.splice(i, 1);
    }
}
export const solidsAt = (x, z)=> solidGrid.get(solidKey(Math.floor(x / SOLID_CELL), Math.floor(z / SOLID_CELL))) || [];
// local box coordinates
export function boxLocal(s, x, z)
{
    const dx = x - s.x, dz = z - s.z;
    return [dx * s.c - dz * s.s, dx * s.s + dz * s.c];
}
export function solidContains(s, x, z, pad = 0)
{
    if (s.kind === 'circle') return dist2(x, z, s.x, s.z) < s.r + pad;
    const [lx, lz] = boxLocal(s, x, z);
    return Math.abs(lx) < s.hx + pad && Math.abs(lz) < s.hz + pad;
}
export const solidTop = (s, x, z)=> s.topFn ? s.topFn(x, z) : s.top;
