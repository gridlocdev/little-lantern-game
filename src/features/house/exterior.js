// The crooked house, from outside.
import {
    EngineObject3D, Light3D, Mesh, PI, ParticleEmitter3D, WHITE, buildBox, buildCylinder, buildMatrix, buildSphere,
    buildTorus, hsl, vec2, vec3,
} from '../../platform/engine.js';
import { enterHouse } from './doors.js';
import { HOUSE } from './plan.js';
import { addInteract } from '../../game/interact.js';
import { mtx, triMesh } from '../../platform/mesh.js';
import { texPlank, texRoof, texStone } from '../../render/textures.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { addClearing } from '../../world/clearings.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

let houseWindowLight;
function prismRoof(w, d, h, over)
{
    const hw = w / 2 + over, hd = d / 2 + over;
    const pts = [], idx = [], uvs = [], nrm = [];
    const slopeL = vec3(-h, hw, 0).normalize(), slopeR = vec3(h, hw, 0).normalize();
    const quad = (a, b, c2, d2, n, u)=>
    {
        const k = pts.length;
        pts.push(a, b, c2, d2); nrm.push(n, n, n, n); uvs.push(...u);
        idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    };
    const s = Math.hypot(hw, h) / 2;
    quad(vec3(-hw, 0, hd), vec3(0, h, hd), vec3(0, h, -hd), vec3(-hw, 0, -hd), slopeL, [vec2(0, 0), vec2(s, 0), vec2(s, hd), vec2(0, hd)]);
    quad(vec3(0, h, hd), vec3(hw, 0, hd), vec3(hw, 0, -hd), vec3(0, h, -hd), slopeR, [vec2(s, 0), vec2(0, 0), vec2(0, hd), vec2(s, hd)]);
    const m = triMesh(pts, idx, nrm, WHITE, uvs);
    m.doubleSided = true;
    return m;
}
export function buildHouseExterior()
{
    const { W, D, H } = HOUSE;
    const hx = P.house.x, hz = P.house.z, y0 = heightAt(hx, hz) - .1;
    const base = mtx(undefined, vec3(hx, y0, hz), vec3(0, 0, .018));
    const place = (mesh, tex, color = WHITE, opts)=>
    {
        const o = new EngineObject3D(vec3(), mesh, tex, color);
        o.localMatrix = base;
        Object.assign(o, opts);
        return o;
    };
    const walls = buildBox(vec3(W, H, D)); walls.scaleUVs(vec2(2.4, 1.4));
    walls.transform(buildMatrix(vec3(0, H / 2 + .3, 0)));
    place(walls, texPlank, hsl(.68, .12, .78));
    const found = buildBox(vec3(W + .5, .7, D + .5)); found.scaleUVs(vec2(3, .5));
    found.transform(buildMatrix(vec3(0, .2, 0)));
    place(found, texStone);
    const gable = new Mesh();
    for (const z of [D / 2, -D / 2])
    {
        const g = triMesh([vec3(-W / 2, 0, 0), vec3(W / 2, 0, 0), vec3(0, 3.4, 0)], z > 0 ? [0, 1, 2] : [0, 2, 1], vec3(0, 0, Math.sign(z)), WHITE,
            [vec2(0, 1), vec2(2.4, 1), vec2(1.2, 0)]);
        gable.combine(g, vec3(0, H + .3, z));
    }
    place(gable, texPlank, hsl(.68, .12, .72));
    const roof = prismRoof(W, D, 3.4, .55); roof.scaleUVs(vec2(1.3, 1.3));
    roof.transform(buildMatrix(vec3(0, H + .3, 0)));
    place(roof, texRoof);
    const wood = hsl(.75, .25, .2);
    const trim = new Mesh();
    for (const [x, z] of [[-W / 2, D / 2], [W / 2, D / 2], [-W / 2, -D / 2], [W / 2, -D / 2]]) trim.combine(buildBox(vec3(.3, H, .3)), vec3(x, H / 2 + .3, z), wood);
    trim.combine(buildBox(vec3(W + .3, .25, .3)), vec3(0, H + .3, D / 2), wood);
    // door, knob, step, window frames
    trim.combine(buildBox(vec3(1.5, 2.6, .18)), vec3(-1.7, 1.6, D / 2 + .05), hsl(.78, .35, .22));
    trim.combine(buildBox(vec3(1.8, .2, .28)), vec3(-1.7, 3, D / 2 + .08), wood);
    trim.combine(buildSphere(.14, 8, 6), vec3(-1.2, 1.6, D / 2 + .2), hsl(.12, .6, .55));
    trim.combine(buildBox(vec3(2.2, .35, 1.3)), vec3(-1.7, .2, D / 2 + .7), hsl(.74, .1, .4));
    const ring = buildTorus(1.5, .16, 24, 6); ring.transform(buildMatrix(undefined, vec3(PI / 2, 0, 0)));
    trim.combine(ring, vec3(1.8, 2.4, D / 2 + .08), wood);
    trim.combine(buildBox(vec3(.1, 1.4, .1)), vec3(1.8, 2.4, D / 2 + .1), wood);
    trim.combine(buildBox(vec3(1.4, .1, .1)), vec3(1.8, 2.4, D / 2 + .1), wood);
    // side window
    trim.combine(buildBox(vec3(.18, 1.5, 1.3)), vec3(W / 2 + .02, 2.4, -.6), wood);
    // chimney
    trim.combine(buildBox(vec3(1, 3, 1)), vec3(2.2, H + 2.4, -1.2), hsl(.74, .1, .38));
    trim.combine(buildBox(vec3(1.25, .25, 1.25)), vec3(2.2, H + 3.95, -1.2), hsl(.74, .1, .32));
    place(trim, undefined, WHITE);
    const glass = new Mesh()
        .combine(buildCylinder(1.35, .06, 24), buildMatrix(vec3(1.8, 2.4, D / 2 + .03), vec3(PI / 2, 0, 0)))
        .combine(buildBox(vec3(.08, 1.2, 1.1)), vec3(W / 2 + .06, 2.4, -.6));
    place(glass, undefined, hsl(.1, .9, .62), { emissive: 1.4, castShadow: false });
    const wpos = base.transformPoint(vec3(1.8, 2.4, D / 2 + 1.2));
    houseWindowLight = new Light3D(wpos, 9, hsl(.09, .9, .6), 1.6);
    houseWindowLight.glow = 1.2;
    // smoke that rises and turns into stars
    const top = base.transformPoint(vec3(2.2, H + 4.1, -1.2));
    new ParticleEmitter3D(top, .4, 0, 3.2, .25, undefined,
        hsl(.72, .15, .55, .22), hsl(.72, .1, .6, .18), hsl(.13, .5, 1, .95), hsl(.6, .4, 1, .9),
        11, .7, .07, .018, .997, .00035, .3, .4, true);
    addSolid({ kind: 'box', x: hx, z: hz, hx: W / 2 + .2, hz: D / 2 + .2, yaw: 0, top: 99 });
    addClearing(hx, hz, 7, true);
    const door = base.transformPoint(vec3(-1.7, 0, D / 2 + 1.2));
    addInteract({ pos: vec3(door.x, heightAt(door.x, door.z), door.z), r: 2.2, label: 'Go inside', act: ()=> enterHouse(), priority: 1 });
    PLACE_NAMES.push({ name: 'The Crooked House', sub: 'home, more or less', x: hx, z: hz + 2, r: 7.5, zone: 'island' });
    HOUSE.door = door;
}
