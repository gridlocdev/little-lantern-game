// Starlight Pond.
import {
    InstancedMesh3D, Light3D, WHITE, buildCylinder, buildMatrix, buildSphere, hsl, max, vec3,
} from '../../platform/engine.js';
import { TAU } from '../../lib/math.js';
import { obj3 } from '../../platform/mesh.js';
import { rr } from '../../platform/random.js';
import { discMesh, waterShader } from '../../render/water.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { addClearing } from '../clearings.js';
import { P } from '../layout.js';
import { WATER_Y, heightAt } from '../terrain.js';

export function buildPond()
{
    const w = obj3(vec3(P.pond.x, WATER_Y, P.pond.z), discMesh(P.pond.r + .6), WHITE, { emissive: 1, castShadow: false });
    w.shader = waterShader(P.pond.x, P.pond.z, P.pond.r);
    const L = new Light3D(vec3(P.pond.x, WATER_Y + .7, P.pond.z), 16, hsl(.66, .8, .62), 1.5);
    // stones around the shore and glowing lily pads
    const stones = new InstancedMesh3D(buildSphere(1, 6, 4, false), 70, undefined, hsl(.74, .1, .4));
    for (let i = 0; i < 70; i++)
    {
        const a = i / 70 * TAU + rr(-.04, .04), r = P.pond.r - .9 + rr(-.2, .5);
        const x = P.pond.x + Math.cos(a) * r, z = P.pond.z + Math.sin(a) * r, s = rr(.25, .5);
        stones.setMatrixAt(i, buildMatrix(vec3(x, max(heightAt(x, z), WATER_Y - .05), z), vec3(rr(0, 3), rr(0, 3), 0), vec3(s * 1.3, s * .55, s)));
        stones.setColorAt(i, hsl(rr(.72, .78), .12, rr(.3, .46)));
    }
    const pads = new InstancedMesh3D(buildCylinder(1, .04, 14), 14, undefined, hsl(.48, .45, .3));
    const buds = new InstancedMesh3D(buildSphere(.22, 8, 6), 14, undefined, WHITE);
    buds.emissive = 1.2;
    for (let i = 0; i < 14; i++)
    {
        const a = rr(0, TAU), r = rr(1.5, P.pond.r - 2.4);
        const x = P.pond.x + Math.cos(a) * r, z = P.pond.z + Math.sin(a) * r, s = rr(.5, .9);
        pads.setMatrixAt(i, buildMatrix(vec3(x, WATER_Y + .02, z), vec3(0, rr(0, 3), 0), vec3(s, 1, s)));
        buds.setMatrixAt(i, buildMatrix(vec3(x + .1, WATER_Y + .12, z)));
        buds.setColorAt(i, hsl([.9, .55, .12][i % 3], .8, .75));
    }
    addClearing(2, -1, 21);
    PLACE_NAMES.push({ name: 'Starlight Pond', sub: 'cosmic fish swim here', x: P.pond.x, z: P.pond.z, r: P.pond.r + 3, zone: 'island' });
    addClearing(P.pond.x, P.pond.z, P.pond.r + 1);
}
