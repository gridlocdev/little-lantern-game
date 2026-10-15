// Swaying grass, drawn as instanced chunks near the camera.
import { InstancedMesh3D, MOBILE, buildMatrix, hsl, render3D, rgb, time, vec3 } from '../../platform/engine.js';
import { TAU, dist2 } from '../../lib/math.js';
import { triMesh } from '../../platform/mesh.js';
import { fbm } from '../../platform/noise.js';
import { rr } from '../../platform/random.js';
import { player } from '../../player/player.js';
import { gfx } from '../../render/quality.js';
import { grassClear } from '../clearings.js';
import { solidContains, solidsAt } from '../collision.js';
import { HALF } from '../grid.js';
import { P, insideIsland } from '../layout.js';
import { roadDist } from '../road-field.js';
import { heightAt, normalAt } from '../terrain.js';

// grass tufts: a few meshes that sway, drawn as instances in chunks near the camera
const grassMeshes = [], grassChunks = [];
function buildGrass()
{
    const VARIANTS = 4;
    for (let v = 0; v < VARIANTS; v++)
    {
        const pts = [], cols = [], nrm = [], idx = [], base = [];
        const blades = 6;
        for (let b = 0; b < blades; b++)
        {
            const a = b / blades * TAU + rr(-.3, .3), off = rr(0, .18);
            const ox = Math.cos(a) * off, oz = Math.sin(a) * off;
            const face = rr(0, TAU), fx = Math.cos(face), fz = Math.sin(face);
            const h = rr(.3, .6), w = rr(.04, .06), lean = rr(.06, .2);
            const k = pts.length;
            const n = vec3(fx, .5, fz).normalize();
            for (const [t, ww] of [[0, w], [.55, w * .7]])
            {
                const lx = ox + Math.cos(a) * lean * t * t, lz = oz + Math.sin(a) * lean * t * t;
                pts.push(vec3(lx - fz * ww, h * t, lz + fx * ww), vec3(lx + fz * ww, h * t, lz - fx * ww));
                base.push(t, t);
                const c = hsl(.74, .42, .16 + t * .2);
                cols.push(c, c); nrm.push(n, n);
            }
            pts.push(vec3(ox + Math.cos(a) * lean, h, oz + Math.sin(a) * lean)); base.push(1); cols.push(hsl(.73, .38, .5)); nrm.push(n);
            idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2, k + 2, k + 3, k + 4);
        }
        const mesh = triMesh(pts, idx, nrm, cols);
        mesh.doubleSided = true;
        mesh.dynamicDraw = true;
        mesh.basePoints = pts.map((p)=> p.copy());
        mesh.heightT = base;
        mesh.phase = v * 1.7;
        grassMeshes.push(mesh);
    }
    const CH = 24, N = Math.ceil(2 * HALF / CH);
    const density = MOBILE ? .55 : 1.05;
    for (let cz = 0; cz < N; cz++)
    for (let cx = 0; cx < N; cx++)
    {
        const x0 = -HALF + cx * CH, z0 = -HALF + cz * CH;
        const lists = grassMeshes.map(()=> []);
        const target = Math.round(CH * CH * density);
        for (let k = 0; k < target; k++)
        {
            const x = x0 + rr(0, CH), z = z0 + rr(0, CH);
            if (!insideIsland(x, z, 2)) continue;
            if (roadDist(x, z) < 2.1) continue;
            if (dist2(x, z, P.pond.x, P.pond.z) < P.pond.r - .7) continue;
            if (!grassClear(x, z)) continue;
            if (solidsAt(x, z).some((s)=> s.zone === 'island' && !s.platformOnly && s.kind === 'box' && solidContains(s, x, z))) continue;
            const n = normalAt(x, z);
            if (n.y < .78) continue;
            if (fbm(x * .06 + 3, z * .06 + 1, 2) < .32 && rr(0, 1) < .65) continue;
            const sc = rr(.75, 1.35), kk = rr(.8, 1.2);
            lists[k % 4].push([buildMatrix(vec3(x, heightAt(x, z) - .03, z), vec3(0, rr(0, TAU), 0), vec3(sc, sc * rr(.8, 1.5), sc)),
                rgb(kk * rr(.9, 1.08), kk * rr(.88, 1.02), kk)]);
        }
        lists.forEach((list, v)=>
        {
            if (!list.length) return;
            const set = new InstancedMesh3D(grassMeshes[v], list.length);
            list.forEach(([m, c], i)=> { set.setMatrixAt(i, m); set.setColorAt(i, c); });
            set.castShadow = false;
            set.center = vec3(x0 + CH / 2, 0, z0 + CH / 2);
            set.full = list.length;
            grassChunks.push(set);
        });
    }
}
function updateGrass()
{
    const t = time, c = render3D.camera.pos, far = gfx.low ? 46 : MOBILE ? 58 : 78;
    for (const g of grassChunks)
    {
        const d = Math.hypot(g.center.x - c.x, g.center.z - c.z);
        g.count = d < far && player.zone === 'island' ? g.full : 0;
    }
    for (const m of grassMeshes)
    {
        const gust = .5 + .5 * Math.sin(t * .37 + m.phase);
        const sx = (Math.sin(t * 1.3 + m.phase) * .06 + .05) * (.6 + gust * .8);
        const sz = Math.cos(t * 1.05 + m.phase * 1.3) * .045;
        for (let i = 0; i < m.points.length; i++)
        {
            const b = m.basePoints[i], k = m.heightT[i] * m.heightT[i];
            const p = m.points[i];
            p.x = b.x + sx * k; p.z = b.z + sz * k; p.y = b.y - (sx * sx + sz * sz) * k * .8;
        }
        m.dirty = true;
    }
}

export const grassSystem = { always: true, build: buildGrass, update: updateGrass };
