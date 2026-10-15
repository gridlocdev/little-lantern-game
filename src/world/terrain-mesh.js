// The island's ground mesh.
import { EngineObject3D, hsl, noise2D, vec2, vec3 } from '../platform/engine.js';
import { dist2, mix, sstep } from '../lib/math.js';
import { mixColor } from '../platform/color.js';
import { triMesh } from '../platform/mesh.js';
import { fbm } from '../platform/noise.js';
import { texDetail } from '../render/textures.js';
import { GN, HALF, STEP } from './grid.js';
import { EDGE_Y, P, edgeAt, edgeR } from './layout.js';
import { roadDist } from './road-field.js';
import { drawnH, gridNormal } from './terrain.js';

let terrainObj;
function terrainColor(x, z, h, slope, rd, r, Rr)
{
    const n1 = fbm(x * .045 + 40, z * .045 - 12, 3);
    const n2 = noise2D(x * .35 + 5, z * .35 + 9);
    let c = hsl(mix(.71, .79, n1), mix(.3, .48, n1), .2 + .09 * n1 + .03 * n2);
    c = mixColor(c, hsl(.74, .22, .44), sstep(8, 16, h) * .55);
    c = mixColor(c, hsl(.75, .12, .26 + .06 * n2), sstep(.6, 1.1, slope));
    const pd = dist2(x, z, P.pond.x, P.pond.z);
    c = mixColor(c, hsl(.68, .3, .13), (1 - sstep(P.pond.r - 1, P.pond.r + 2.5, pd)) * .8);
    c = mixColor(c, hsl(.77, .22, .2), sstep(Rr - 5, Rr, r));
    if (rd < 2) c = mixColor(c, hsl(.74, .2, .2), .5);
    return c;
}
export function buildTerrain()
{
    const pts = [], nrm = [], cols = [], uvs = [], idx = [];
    const vIndex = new Int32Array(GN * GN).fill(-1);
    for (let j = 0; j < GN; j++)
    for (let i = 0; i < GN; i++)
    {
        let x = -HALF + i * STEP, z = -HALF + j * STEP;
        const th = Math.atan2(z, x), Rr = edgeR(th), r = Math.hypot(x, z);
        if (r > Rr + 3) continue;
        let h, n;
        if (r > Rr) { x = Math.cos(th) * Rr; z = Math.sin(th) * Rr; h = EDGE_Y; n = vec3(Math.cos(th) * .3, 1, Math.sin(th) * .3).normalize(); }
        else { h = drawnH(i, j); n = gridNormal(i, j); }
        vIndex[j * GN + i] = pts.length;
        pts.push(vec3(x, h, z));
        nrm.push(n);
        cols.push(terrainColor(x, z, h, Math.hypot(n.x, n.z) / n.y, roadDist(x, z), r, Rr));
        uvs.push(vec2(x / 5, z / 5));
    }
    for (let j = 0; j < GN - 1; j++)
    for (let i = 0; i < GN - 1; i++)
    {
        const a = vIndex[j * GN + i], b = vIndex[j * GN + i + 1], c = vIndex[(j + 1) * GN + i], d = vIndex[(j + 1) * GN + i + 1];
        if (a < 0 || b < 0 || c < 0 || d < 0) continue;
        const x = -HALF + i * STEP + .5, z = -HALF + j * STEP + .5;
        if (Math.hypot(x, z) > edgeAt(x, z) + 1.5) continue;
        idx.push(a, c, b, b, c, d);
    }
    const mesh = triMesh(pts, idx, nrm, cols, uvs);
    terrainObj = new EngineObject3D(vec3(), mesh, texDetail);
    terrainObj.castShadow = true;
}
