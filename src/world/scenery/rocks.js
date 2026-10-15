// Scattered rocks.
import { InstancedMesh3D, buildMatrix, buildSphere, hsl, vec3 } from '../../platform/engine.js';
import { TAU, dist2 } from '../../lib/math.js';
import { rr } from '../../platform/random.js';
import { isClear } from '../clearings.js';
import { addSolid } from '../collision.js';
import { P, insideIsland } from '../layout.js';
import { roadDist } from '../road-field.js';
import { heightAt } from '../terrain.js';

export function buildRocks()
{
    const set = new InstancedMesh3D(buildSphere(1, 6, 4, false), 170, undefined, hsl(.74, .1, .42));
    let n = 0, tries = 0;
    while (n < 170 && tries++ < 5000)
    {
        const a = rr(0, TAU), r = Math.sqrt(rr(0, 1)) * 102;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!insideIsland(x, z, 4) || roadDist(x, z) < 3.5 || !isClear(x, z, 1)) continue;
        if (dist2(x, z, P.pond.x, P.pond.z) < P.pond.r + 2) continue;
        const s = Math.pow(rr(0, 1), 2) * 1.5 + .3;
        set.setMatrixAt(n, buildMatrix(vec3(x, heightAt(x, z) - s * .25, z), vec3(rr(0, 3), rr(0, 3), rr(0, 3)),
            vec3(s * rr(.8, 1.5), s * rr(.5, .9), s)));
        set.setColorAt(n, hsl(rr(.72, .78), rr(.08, .2), rr(.3, .45)));
        if (s > .7) addSolid({ kind: 'circle', x, z, r: s * .85, top: heightAt(x, z) + s * .5 });
        n++;
    }
    set.count = n;
}
