// Glowing flowers.
import {
    InstancedMesh3D, Mesh, WHITE, buildCylinder, buildMatrix, buildSphere, hsl, noise2D, vec3,
} from '../../platform/engine.js';
import { TAU, dist2 } from '../../lib/math.js';
import { WR, rr } from '../../platform/random.js';
import { isClear } from '../clearings.js';
import { P, insideIsland } from '../layout.js';
import { roadDist } from '../road-field.js';
import { heightAt } from '../terrain.js';

let flowerSet;
export function buildFlowers()
{
    const petal = new Mesh();
    for (let k = 0; k < 5; k++)
    {
        const a = k / 5 * TAU;
        petal.combine(buildSphere(1, 6, 4), buildMatrix(vec3(Math.cos(a) * .09, 0, Math.sin(a) * .09), vec3(0, -a, 0), vec3(.13, .03, .07)));
    }
    petal.combine(buildSphere(.07, 6, 4), vec3(0, .02, 0));
    const stemSet = new InstancedMesh3D(buildCylinder(.02, 1, 4), 900, undefined, hsl(.5, .4, .25));
    stemSet.castShadow = false;
    flowerSet = new InstancedMesh3D(petal, 900, undefined, WHITE);
    flowerSet.emissive = .95; flowerSet.castShadow = false;
    let n = 0, tries = 0;
    const put = (x, z, hue)=>
    {
        const h = rr(.22, .42), y = heightAt(x, z);
        stemSet.setMatrixAt(n, buildMatrix(vec3(x, y + h / 2, z), undefined, vec3(1, h, 1)));
        flowerSet.setMatrixAt(n, buildMatrix(vec3(x, y + h, z), vec3(rr(-.3, .3), rr(0, 3), rr(-.3, .3)), vec3(rr(.8, 1.3))));
        flowerSet.setColorAt(n, hsl(hue, rr(.5, .8), rr(.7, .82)));
        n++;
    };
    while (n < 820 && tries++ < 12000)
    {
        const a = rr(0, TAU), r = Math.sqrt(rr(0, 1)) * 103;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!insideIsland(x, z, 3) || roadDist(x, z) < 2.4 || !isClear(x, z)) continue;
        if (dist2(x, z, P.pond.x, P.pond.z) < P.pond.r + .6) continue;
        if (noise2D(x * .09 + 50, z * .09) < .62) continue;
        put(x, z, [.55, .62, .85, .12, .95][WR.int(5)]);
    }
    stemSet.count = flowerSet.count = n;
}
