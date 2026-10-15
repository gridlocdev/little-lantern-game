// Distance to the nearest road, sampled on the terrain grid.
import { clamp, max, min } from '../platform/engine.js';
import { sampleCurve } from '../lib/curve.js';
import { GN, HALF, STEP, gridSample } from './grid.js';
import { ROAD_DEFS } from './layout.js';

export const ROADS = ROAD_DEFS.map((d)=> sampleCurve(d, 1));
const roadField = new Float32Array(GN * GN).fill(99);
for (const pts of ROADS)
for (let i = 0; i < pts.length - 1; i++)
{
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const x0 = Math.floor((min(ax, bx) - 7 + HALF) / STEP), x1 = Math.ceil((max(ax, bx) + 7 + HALF) / STEP);
    const z0 = Math.floor((min(az, bz) - 7 + HALF) / STEP), z1 = Math.ceil((max(az, bz) + 7 + HALF) / STEP);
    for (let gz = max(0, z0); gz <= min(GN - 1, z1); gz++)
    for (let gx = max(0, x0); gx <= min(GN - 1, x1); gx++)
    {
        const px = -HALF + gx * STEP, pz = -HALF + gz * STEP;
        const t = clamp(((px - ax) * dx + (pz - az) * dz) / L2);
        const d = Math.hypot(ax + dx * t - px, az + dz * t - pz);
        const k = gz * GN + gx;
        if (d < roadField[k]) roadField[k] = d;
    }
}
export const roadDist = (x, z)=> gridSample(roadField, x, z);
