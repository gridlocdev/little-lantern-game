// The terrain sampling grid shared by heights and the road field.
import { clamp } from '../platform/engine.js';

export const HALF = 128, STEP = 1, GN = 2 * HALF / STEP + 1;
export function gridSample(arr, x, z)
{
    const gx = clamp((x + HALF) / STEP, 0, GN - 1.001), gz = clamp((z + HALF) / STEP, 0, GN - 1.001);
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const a = arr[j * GN + i], b = arr[j * GN + i + 1], c = arr[(j + 1) * GN + i], d = arr[(j + 1) * GN + i + 1];
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}
