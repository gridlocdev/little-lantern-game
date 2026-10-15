// Mushroom Hollow: caps to bounce on.
import {
    EngineObject3D, InstancedMesh3D, Light3D, Mesh, WHITE, buildCylinder, buildMatrix, buildSphere, hsl, max,
    render3D, time, timeDelta, vec3,
} from '../../platform/engine.js';
import { state, writeSave } from '../../game/state.js';
import { TAU } from '../../lib/math.js';
import { mtx, obj3 } from '../../platform/mesh.js';
import { rr } from '../../platform/random.js';
import { SPH, SPH_LO } from '../../player/part-meshes.js';
import { camNear } from '../../render/camera.js';
import { addTodo } from '../../ui/journal.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { addClearing } from '../../world/clearings.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const save = state.slice('mushrooms', { bounceBest: 0 });

const mushrooms = [];
class MushroomCaps extends EngineObject3D
{
    constructor() { super(vec3(P.mushrooms.x, 0, P.mushrooms.z)); this.castShadow = true; }
    render3D()
    {
        if (!camNear(this.pos3D, 150)) return;
        for (const m of mushrooms)
        {
            const sq = m.solid.squash || 0;
            m.solid.squash = max(0, sq - timeDelta * 3);
            const wob = Math.sin(time * 18) * sq;
            const sy = 1 - sq * .35 + wob * .1, sx = 1 + sq * .2;
            render3D.drawMesh(SPH, mtx(undefined, m.top, vec3(), vec3(m.r * 2 * sx, m.r * .95 * sy, m.r * 2 * sx)), undefined, m.color);
            const e = render3D.emissive; render3D.emissive = 1;
            for (const d of m.dots) render3D.drawMesh(SPH_LO, mtx(undefined, m.top.add(vec3(d.x * m.r * sx, d.y * m.r * .45 * sy, d.z * m.r * sx)), vec3(), vec3(m.r * .22)), undefined, m.dot);
            render3D.emissive = e;
        }
    }
}
function buildMushrooms()
{
    const cx = P.mushrooms.x, cz = P.mushrooms.z;
    // [dx, dz, cap radius, stem height]: three low caps you can jump onto from the ground, the rest are reached by bouncing
    const spots = [[0, 0, 2.2, 1], [4, 3, 1.7, 3.2], [-3.5, 4, 1.8, 2.6], [1, 7.5, 1.6, 4.4], [-5, -2, 2, 1], [6.5, -1.5, 1.5, 4.6], [3, -5, 1.9, 1.1], [-2, -6.5, 1.5, 3.6], [-6.5, 7, 1.4, 5.4], [8, 6, 1.4, 5.5]];
    spots.forEach(([dx, dz, r, h], i)=>
    {
        const x = cx + dx, z = cz + dz, y = heightAt(x, z);
        const hue = [.85, .55, .95, .48, .75][i % 5];
        obj3(vec3(x, y + h / 2, z), buildCylinder(.5 + r * .15, h, 10, true), hsl(.12, .2, .82));
        const top = vec3(x, y + h, z);
        const dots = [];
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rr(0, .5), rad = rr(.3, .75); dots.push(vec3(Math.cos(a) * rad, Math.sqrt(1 - rad * rad) * .9, Math.sin(a) * rad)); }
        const solid = addSolid({ kind: 'circle', x, z, r: r * .95, top: y + h + r * .44, platformOnly: true, bounce: true, hue, onBounce: recordBounce });
        addSolid({ kind: 'circle', x, z, r: .55 + r * .15, top: y + h - .2 });
        mushrooms.push({ top, r, color: hsl(hue, .55, .55), dot: hsl(hue + .1, .8, .8), dots, solid });
        new Light3D(top.add(vec3(0, r * .5, 0)), 7, hsl(hue, .7, .6), .9);
    });
    new MushroomCaps;
    // little glowing ones around
    const small = new InstancedMesh3D(new Mesh().combine(buildCylinder(.08, .3, 6), vec3(0, .15, 0), hsl(.12, .2, .8)).combine(buildSphere(1, 8, 6), buildMatrix(vec3(0, .32, 0), undefined, vec3(.3, .14, .3)), WHITE), 60, undefined, WHITE);
    small.emissive = .8; small.castShadow = false;
    for (let i = 0; i < 60; i++)
    {
        const a = rr(0, TAU), rad = rr(2, 16), x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad, s = rr(.6, 1.6);
        small.setMatrixAt(i, buildMatrix(vec3(x, heightAt(x, z), z), vec3(0, rr(0, 3), 0), vec3(s)));
        small.setColorAt(i, hsl([.85, .55, .95, .48][i % 4], .7, .72));
    }
    PLACE_NAMES.push({ name: 'Mushroom Hollow', sub: 'jump on the caps', x: cx, z: cz, r: 12, zone: 'island' });
    addClearing(cx, cz, 15);
}

function recordBounce(chain)
{
    if (chain > save.bounceBest) { save.bounceBest = chain; writeSave(); }
}
export const mushroomsFeature = {
    build()
    {
        buildMushrooms();
        addTodo(90, 'Bounce five times in a row on the mushrooms', ()=> save.bounceBest >= 5);
    },
};
