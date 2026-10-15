// Catmull-Rom curve sampling. Pure, so it runs under node --test.
import { dist2 } from './math.js';

// catmull-rom through 2D points, sampled about every step meters
export function sampleCurve(pts, step = 1)
{
    const out = [];
    for (let i = 0; i < pts.length - 1; i++)
    {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const len = dist2(p1[0], p1[1], p2[0], p2[1]);
        const n = Math.max(2, Math.ceil(len / step));
        for (let k = 0; k < n; k++)
        {
            const t = k / n, t2 = t * t, t3 = t2 * t;
            const f = (a, b, c, d)=> .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
            out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
}
