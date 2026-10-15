// The cobbled road meshes.
import { EngineObject3D, Mesh, WHITE, max, min, vec2, vec3 } from '../platform/engine.js';
import { texCobble } from '../render/textures.js';
import { ROADS } from './road-field.js';
import { heightAt, normalAt, terrainMeshY } from './terrain.js';

// height of a road edge vertex at (ex, ez) on road ri whose centre is at (x, z)
const roadEdgeY = (x, z, ex, ez, ri)=> max(heightAt(ex, ez), heightAt(x, z) - .3) + .07 + ri * .006;
// raise any stretch of road where the terrain mesh would show through, sampling across each road quad
function liftRoadClear(P2, clearance = .04)
{
    for (let pass = 0; pass < 3; pass++)
    {
        let moved = false;
        for (let a = 0; a + 3 < P2.length; a += 2)
        {
            const q = [P2[a], P2[a + 1], P2[a + 2], P2[a + 3]];
            let worst = -1e9;
            for (let u = 0; u <= 1.001; u += .125)
            for (let v = 0; v <= 1.001; v += .125)
            {
                const w = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
                const x = q.reduce((t, p, k)=> t + p.x * w[k], 0), z = q.reduce((t, p, k)=> t + p.z * w[k], 0);
                const y = q.reduce((t, p, k)=> t + p.y * w[k], 0);
                worst = max(worst, terrainMeshY(x, z) + clearance - y);
            }
            if (worst > 0) { for (const p of q) p.y += worst; moved = true; }
        }
        if (!moved) break;
    }
}
function buildRoads()
{
    const mesh = new Mesh;
    ROADS.forEach((pts, ri)=>
    {
        const P2 = [], idx = [], N2 = [], UV = [];
        let len = 0;
        const W = 3.3;
        for (let i = 0; i < pts.length; i++)
        {
            const [x, z] = pts[i];
            const [nx, nz] = pts[min(pts.length - 1, i + 1)], [px, pz] = pts[max(0, i - 1)];
            let tx = nx - px, tz = nz - pz;
            const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
            const lx = -tz, lz = tx;
            // texture along the length walked, so cobbles on a climb are not stretched
            if (i) len += Math.hypot(x - pts[i - 1][0], heightAt(x, z) - heightAt(pts[i - 1][0], pts[i - 1][1]), z - pts[i - 1][1]);
            for (const side of [-1, 1])
            {
                const ex = x + lx * W / 2 * side, ez = z + lz * W / 2 * side;
                P2.push(vec3(ex, roadEdgeY(x, z, ex, ez, ri), ez));
                N2.push(normalAt(ex, ez));
                UV.push(vec2(side < 0 ? 0 : 1, len / 3.3));
            }
            if (i)
            {
                const a = (i - 1) * 2, b = a + 1, c = a + 2, d = a + 3;
                // a,b previous left/right, c,d current; up facing
                const cross = (P2[b].x - P2[a].x) * (P2[c].z - P2[a].z) - (P2[b].z - P2[a].z) * (P2[c].x - P2[a].x);
                if (cross > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
            }
        }
        liftRoadClear(P2);
        mesh.addTriangles(P2, idx, N2, UV, WHITE);
    });
    mesh.doubleSided = true;
    const o = new EngineObject3D(vec3(), mesh, texCobble);
    o.castShadow = false;
}

export const roadSystem = { build: buildRoads };
