// The jagged amethyst root under the island.
import {
    EngineObject3D, InstancedMesh3D, PI, buildMatrix, buildSphere, clamp, hsl, min, noise2D, vec3,
} from '../platform/engine.js';
import { TAU, sstep } from '../lib/math.js';
import { mixColor } from '../platform/color.js';
import { triMesh } from '../platform/mesh.js';
import { rr } from '../platform/random.js';
import { EDGE_Y, edgeR } from './layout.js';

// the jagged amethyst root under the island
export function buildUnderside()
{
    const ANG = 180, LV = 30, DEPTH = 80;
    const pts = [], cols = [], idx = [];
    for (let l = 0; l <= LV; l++)
    {
        const t = l / LV;
        for (let a = 0; a <= ANG; a++)
        {
            const th = a / ANG * TAU, R0 = edgeR(th), cx = Math.cos(th), sz = Math.sin(th);
            const jag = l === 0 ? 0 : (noise2D(cx * 3 + t * 6 + 9, sz * 3 - t * 5) - .5) * .6 * Math.sin(min(t, .95) * PI);
            const rad = l === LV ? 0 : l === 1 ? R0 * .995 : R0 * Math.pow(1 - t, .8) * (1 + jag);
            const y = l === 0 ? EDGE_Y : l === 1 ? EDGE_Y - 2.5 : EDGE_Y - 2.5 - t * DEPTH + (noise2D(cx * 5 + 2, sz * 5 + t * 8) - .5) * 7 * t;
            pts.push(vec3(cx * rad, y, sz * rad));
            const glow = sstep(.55, 1, t);
            cols.push(mixColor(mixColor(hsl(.76, .28, .2), hsl(.77, .45, .26), sstep(0, .5, t)), hsl(.76, .75, .5), glow));
        }
    }
    for (let l = 0; l < LV; l++)
    for (let a = 0; a < ANG; a++)
    {
        const i0 = l * (ANG + 1) + a, i1 = i0 + 1, i2 = i0 + ANG + 1, i3 = i2 + 1;
        idx.push(i0, i1, i2, i1, i3, i2);
    }
    const mesh = triMesh(pts, idx, undefined, cols);
    mesh.computeNormals(false);
    mesh.doubleSided = true;
    const o = new EngineObject3D(vec3(), mesh);
    o.emissive = .22;
    o.castShadow = false;
    // hanging crystals
    const crystal = buildSphere(1, 4, 2);
    const set = new InstancedMesh3D(crystal, 46, undefined, hsl(.76, .7, .6));
    set.emissive = .85; set.castShadow = false;
    for (let i = 0; i < 46; i++)
    {
        const tip = i < 14;
        const a = rr(0, TAU), rad = tip ? rr(0, 10) : rr(20, 70);
        const t = tip ? 1 : 1 - Math.pow(rad / 95, 1 / .8);
        const y = tip ? rr(-80, -60) : EDGE_Y - 2.5 - clamp(t, 0, 1) * DEPTH * .95 - 2;
        set.setMatrixAt(i, buildMatrix(vec3(Math.cos(a) * rad, y, Math.sin(a) * rad), vec3(rr(-.3, .3), rr(0, 3), rr(-.3, .3)),
            vec3(rr(1, 2.4), rr(4, 11), rr(1, 2.4))));
        set.setColorAt(i, hsl(rr(.72, .8), .7, rr(.5, .7)));
    }
}
