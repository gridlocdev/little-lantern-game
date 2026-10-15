// Terrain heights: what the mothling walks on, and the surface the terrain mesh draws.
import { clamp, max, vec3 } from '../platform/engine.js';
import { dist2, mix, sstep } from '../lib/math.js';
import { fbm } from '../platform/noise.js';
import { GN, HALF, STEP, gridSample } from './grid.js';
import { EDGE_Y, HILLS, P, edgeAt } from './layout.js';
import { roadDist } from './road-field.js';

function shapeH(x, z)
{
    let h = (fbm(x * .011 + 7, z * .011 - 3, 3) - .5) * 9;
    for (const k of HILLS)
    {
        const dx = x - k.x, dz = z - k.z;
        h += k.h * Math.exp(-(dx * dx + dz * dz) / (2 * k.s * k.s));
    }
    return h;
}
const VILLAGE_H = max(1.2, shapeH(0, 0));
export const WATER_Y = VILLAGE_H - .3;
const FLATS = [
    { x: 2, z: -2, r: 24, fall: 14, h: VILLAGE_H },
    { x: P.chimes.x, z: P.chimes.z, r: 8.5, fall: 7 },
    { x: P.telescope.x, z: P.telescope.z, r: 5, fall: 6 },
    { x: P.swing.x, z: P.swing.z, r: 7, fall: 6 },
    { x: P.overlook.x, z: P.overlook.z, r: 7, fall: 5 },
    { x: P.pierBase.x, z: P.pierBase.z, r: 5, fall: 5 },
    { x: P.bridgeStart.x, z: P.bridgeStart.z, r: 5, fall: 4 },
];
for (const f of FLATS) if (f.h === undefined) f.h = shapeH(f.x, f.z);

// ---------------------------------------------------------------- terrain heights
function heightRaw(x, z)
{
    const r = Math.hypot(x, z), Rr = edgeAt(x, z);
    let h = shapeH(x, z);
    const detail = (fbm(x * .08 + 3, z * .08 + 8, 3) - .5) * 1.8;
    let flat = 0, flatH = 0;
    for (const f of FLATS)
    {
        const m = 1 - sstep(f.r, f.r + f.fall, dist2(x, z, f.x, f.z));
        if (m > flat) { flat = m; flatH = f.h; }
    }
    const rm = 1 - sstep(2.2, 5.5, roadDist(x, z));
    h += detail * (1 - max(rm, flat));
    h = mix(h, flatH, flat);
    const pd = dist2(x, z, P.pond.x, P.pond.z);
    const bowl = 1 - sstep(P.pond.r - 3, P.pond.r + .4, pd);
    h = mix(h, VILLAGE_H - 1.7 + sstep(0, P.pond.r, pd) * .6, bowl);
    const e = sstep(Rr - 16, Rr, r);
    return mix(h, EDGE_Y, Math.pow(e, 1.4));
}
const heights = new Float32Array(GN * GN);
for (let j = 0; j < GN; j++)
for (let i = 0; i < GN; i++)
{
    const x = -HALF + i * STEP, z = -HALF + j * STEP;
    heights[j * GN + i] = Math.hypot(x, z) > edgeAt(x, z) + 1.5 ? EDGE_Y : heightRaw(x, z);
}
export const heightAt = (x, z)=> gridSample(heights, x, z);
// the drawn terrain sinks into a bed under the roads, deeper where it is steep, so a road never sinks into the
// hillside between its vertices; walking still uses heightAt, which is where the road surface is
const gridH = (i, j)=> heights[clamp(j, 0, GN - 1) * GN + clamp(i, 0, GN - 1)];
export const gridNormal = (i, j)=> vec3(gridH(i - 1, j) - gridH(i + 1, j), 2 * STEP, gridH(i, j - 1) - gridH(i, j + 1)).normalize();
export function drawnH(i, j)
{
    const bed = (.06 + .25 * (1 / max(.3, gridNormal(i, j).y) - 1)) * (1 - sstep(1.6, 2.8, roadDist(-HALF + i * STEP, -HALF + j * STEP)));
    return gridH(i, j) - bed;
}
// the height of the terrain mesh as drawn: grid cells split into two triangles along one diagonal
export function terrainMeshY(x, z)
{
    const gx = clamp((x + HALF) / STEP, 0, GN - 1.001), gz = clamp((z + HALF) / STEP, 0, GN - 1.001);
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const a = drawnH(i, j), b = drawnH(i + 1, j), c = drawnH(i, j + 1), d = drawnH(i + 1, j + 1);
    return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
export function normalAt(x, z)
{
    const e = .6;
    return vec3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
}
