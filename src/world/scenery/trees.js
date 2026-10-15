// Trees and their glowing fruit.
import {
    InstancedMesh3D, Mesh, WHITE, buildCone, buildCylinder, buildMatrix, buildSphere, hsl, max, vec3,
} from '../../platform/engine.js';
import { TAU, dist2 } from '../../lib/math.js';
import { fbm } from '../../platform/noise.js';
import { WR, rr } from '../../platform/random.js';
import { clearings, isClear } from '../clearings.js';
import { addSolid } from '../collision.js';
import { P, insideIsland } from '../layout.js';
import { roadDist } from '../road-field.js';
import { heightAt, normalAt } from '../terrain.js';

// trees, rocks and glowing flowers
export function buildTrees()
{
    const trunkCol = hsl(.8, .22, .17);
    const puff = (h)=> new Mesh()
        .combine(buildCylinder(.42, h, 7, false), vec3(0, h / 2, 0), trunkCol)
        .combine(buildSphere(3.0, 7, 5, false), vec3(0, h + .6, 0), hsl(.75, .42, .3))
        .combine(buildSphere(2.3, 7, 5, false), vec3(.9, h + 1.5, .3), hsl(.73, .45, .34))
        .combine(buildSphere(1.9, 7, 5, false), vec3(-.7, h + 1.8, -.4), hsl(.77, .4, .37));
    const spire = new Mesh()
        .combine(buildCylinder(.32, 2, 6, false), vec3(0, 1, 0), trunkCol)
        .combine(buildCone(3.2, 3, 7, false), vec3(0, 2.6, 0), hsl(.63, .4, .24))
        .combine(buildCone(2.5, 2.6, 7, false), vec3(0, 3.9, 0), hsl(.64, .42, .28))
        .combine(buildCone(1.7, 2.2, 7, false), vec3(0, 5.1, 0), hsl(.65, .45, .32));
    const meshes = [puff(2.6), puff(3.4), spire];
    const caps = [130, 110, 120];
    const sets = meshes.map((m, i)=> new InstancedMesh3D(m, caps[i]));
    const counts = [0, 0, 0];
    const fruitSet = new InstancedMesh3D(buildSphere(.34, 8, 6), 600, undefined, WHITE);
    fruitSet.emissive = 1.3; fruitSet.castShadow = false;
    let fruits = 0, tries = 0;
    while (tries++ < 9000 && counts.some((c, i)=> c < caps[i]))
    {
        const a = rr(0, TAU), r = Math.sqrt(rr(0, 1)) * 100;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!insideIsland(x, z, 7)) continue;
        if (roadDist(x, z) < 5.5) continue;
        if (!isClear(x, z, 3)) continue;
        if (dist2(x, z, P.pond.x, P.pond.z) < P.pond.r + 6) continue;
        if (fbm(x * .03 + 11, z * .03 - 7, 3) < .47) continue;
        if (normalAt(x, z).y < .8) continue;
        const v = WR.int(3);
        if (counts[v] >= caps[v]) continue;
        const i = counts[v]++;
        const sc = rr(.8, 1.3), yaw = rr(0, TAU), y = heightAt(x, z) - .15;
        sets[v].setMatrixAt(i, buildMatrix(vec3(x, y, z), vec3(0, yaw, 0), vec3(sc)));
        sets[v].setColorAt(i, hsl(0, 0, rr(.85, 1.1)));
        addSolid({ kind: 'circle', x, z, r: .4 * sc, top: 9 });
        clearings.push({ x, z, r: 1.6 });
        if (v < 2 && rr(0, 1) < .45 && fruits < 590)
        {
            const h = v ? 3.4 : 2.6, hue = [.12, .52, .9][WR.int(3)];
            for (let k = 0; k < 5; k++)
            {
                const fa = rr(0, TAU), fr = rr(1.1, 1.6);
                const local = vec3(Math.cos(fa) * fr, h + rr(-.2, 1.4), Math.sin(fa) * fr).scale(sc);
                fruitSet.setMatrixAt(fruits, buildMatrix(vec3(x + local.x, y + local.y, z + local.z)));
                fruitSet.setColorAt(fruits, hsl(hue, .9, .68));
                fruits++;
            }
        }
    }
    sets.forEach((s, i)=> s.count = counts[i]);
    fruitSet.count = max(1, fruits);
}
