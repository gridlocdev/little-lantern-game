// Benches to sit on, and the bench by the pond with its lantern.
import {
    Light3D, Mesh, PI, WHITE, buildBox, buildCone, buildCylinder, buildMatrix, buildSphere, hsl, vec3,
} from '../../platform/engine.js';
import { addInteract } from '../../game/interact.js';
import { obj3 } from '../../platform/mesh.js';
import { startSit } from '../../player/sit.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

function benchMesh()
{
    const wood = hsl(.75, .2, .42), dark = hsl(.75, .2, .22);
    const m = new Mesh();
    for (let i = 0; i < 3; i++) m.combine(buildBox(vec3(1.9, .07, .16)), vec3(0, .48, -.18 + i * .18), wood);
    for (let i = 0; i < 2; i++) m.combine(buildBox(vec3(1.9, .14, .05)), buildMatrix(vec3(0, .78 + i * .24, -.33), vec3(-.15, 0, 0)), wood);
    for (const [x, z] of [[-.82, .15], [.82, .15], [-.82, -.24], [.82, -.24]]) m.combine(buildBox(vec3(.09, .48, .09)), vec3(x, .24, z), dark);
    for (const x of [-.82, .82]) m.combine(buildBox(vec3(.07, .62, .07)), buildMatrix(vec3(x, .8, -.32), vec3(-.15, 0, 0)), dark);
    return m;
}
function placeBench(x, z, yaw, zone = 'island', y)
{
    y ??= heightAt(x, z);
    obj3(vec3(x, y, z), benchMesh(), WHITE, { rotation3D: vec3(0, yaw + PI, 0) });
    addSolid({ kind: 'box', x, z, hx: 1, hz: .38, yaw, top: y + .55, zone, wood: true });
    const seat = vec3(x, y, z);
    addInteract({ pos: seat, r: 1.8, zone, label: 'Sit', act: ()=> startSit(seat, yaw) });
}
function buildBenchArea()
{
    const yaw = Math.atan2(-(P.pond.x - P.bench.x), -(P.pond.z - P.bench.z));
    placeBench(P.bench.x, P.bench.z, yaw);
    // curved lantern post with a blue flame
    const lx = P.bench.x - 1.6, lz = P.bench.z + .4, ly = heightAt(lx, lz);
    const curve = [vec3(0, 0, 0), vec3(0, 1.6, 0), vec3(.05, 2.6, 0), vec3(.35, 2.95, 0), vec3(.75, 2.8, 0)];
    const post = new Mesh();
    for (let i = 0; i < curve.length - 1; i++)
    {
        const a = curve[i], b = curve[i + 1], d = b.subtract(a), L = d.length();
        const m = buildMatrix(a.lerp(b, .5), vec3(0, 0, -Math.atan2(d.x, d.y)), vec3(1, L, 1));
        post.combine(buildCylinder(.1, 1, 6), m, hsl(.72, .2, .16));
    }
    post.combine(buildCone(.4, .2, 6), vec3(.75, 2.7, 0), hsl(.72, .2, .16));
    obj3(vec3(lx, ly, lz), post);
    obj3(vec3(lx + .75, ly + 2.4, lz), buildSphere(.28, 10, 8), hsl(.58, .9, .7), { emissive: 1.6, castShadow: false });
    const L = new Light3D(vec3(lx + .75, ly + 2.4, lz), 9, hsl(.58, .8, .66), 1.5);
    L.glow = 1.4;
    addSolid({ kind: 'circle', x: lx, z: lz, r: .2, top: 3 });
}

export const benchFeature = { build: buildBenchArea };
