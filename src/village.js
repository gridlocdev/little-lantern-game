import {
    EngineObject3D, Light3D, Mesh, PI, ParticleEmitter3D, WHITE, buildBox, buildCone, buildCylinder, buildMatrix,
    buildSphere, buildTorus, hsl, render3D, time, vec2, vec3,
} from './platform/engine.js';
import { addInteract } from './game/interact.js';
import { enterHouse } from './house.js';
import { mtx, obj3, triMesh } from './platform/mesh.js';
import { CAPS, CYL, SPH, SPH_LO, TORUS } from './player/part-meshes.js';
import { player } from './player/player.js';
import { startSit } from './player/sit.js';
import { camNear } from './render/camera.js';
import { texPlank, texRoof, texStone } from './render/textures.js';
import { say } from './ui/dialog.js';
import { PLACE_NAMES } from './ui/places.js';
import { addClearing } from './world/clearings.js';
import { addSolid } from './world/collision.js';
import { P } from './world/layout.js';
import { heightAt } from './world/terrain.js';

// ---------------------------------------------------------------- the crooked house
export const HOUSE = { W: 8, D: 7, H: 4 };
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

// ---------------------------------------------------------------- bench and its lantern
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
export function buildBenchArea()
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

// ---------------------------------------------------------------- Oswin the lantern snail
const SNAIL_LINES = [
    ['Oh, hello, little lantern. I am Oswin. I carry my house on my back, so I never have to walk home.',
        'The pond by the crooked house is full of fish that fell out of the sky. Stand at the edge and you can fish for them.'],
    ['The crystals on Amethyst Hill each hum one note.', 'Someone carved a song on the stone up there. Play it in order and the moon may answer.'],
    ['The swing on the willow hill goes higher if you lean in at the very top of each swing.', 'Let go at the top and your wings will do the rest.'],
    ['Stars fall here sometimes. Look for a pillar of light and run to it before it fades.', 'Bring the stardust home. The jar on your shelf likes it.'],
    ['The pier on the south edge goes nowhere at all, which is why the strangest fish live at the end of it.'],
    ['The telescope on Observatory Hill sees shapes in the stars. Hold it still on one and the shape will show itself.',
        'There is also something very large out there that sings. Do not be frightened. It only wants company.'],
    ['If you are tired, your bed will take you to a different sky. I have been asleep for most of this conversation.'],
];
let snailLine = 0;
class Snail extends EngineObject3D
{
    constructor(pos)
    {
        super(pos);
        this.castShadow = true;
        this.yaw = -2.4;
        this.light = new Light3D(pos.add(vec3(0, 1.1, 0)), 6, hsl(.5, .8, .6), 1.3);
        this.light.glow = 1;
    }
    render3D()
    {
        if (!camNear(this.pos3D, 90)) return;
        const t = time, m = mtx(undefined, this.pos3D, vec3(0, this.yaw, 0));
        const body = hsl(.58, .25, .62), shell = hsl(.82, .35, .45);
        const stretch = 1 + Math.sin(t * 1.3) * .04;
        render3D.drawMesh(CAPS, mtx(m, vec3(0, .25, 0), vec3(PI / 2, 0, 0), vec3(.8, 1.5 * stretch, .55)), undefined, body);
        render3D.drawMesh(SPH, mtx(m, vec3(0, .55, -.65 * stretch), vec3(), vec3(.42)), undefined, body);
        for (const s of [-1, 1])
        {
            render3D.drawMesh(CYL, mtx(m, vec3(s * .1, .85, -.7 * stretch), vec3(.3, 0, s * .2), vec3(.04, .4, .04)), undefined, body);
            render3D.drawMesh(SPH_LO, mtx(m, vec3(s * .16, 1.04, -.62 * stretch), vec3(), vec3(.11)), undefined, hsl(.7, .5, .15));
        }
        for (let i = 0; i < 4; i++)
            render3D.drawMesh(TORUS, mtx(m, vec3(0, .78 + i * .05, .25), vec3(PI / 2, 0, 0), vec3(1.1 - i * .25, .9 - i * .2, 1.1 - i * .25)), undefined, shell.lerp(WHITE, i * .08));
        const e = render3D.emissive; render3D.emissive = 1.3;
        render3D.drawMesh(SPH_LO, mtx(m, vec3(0, .8, .25), vec3(), vec3(.32 + Math.sin(t * 2) * .02)), undefined, hsl(.5, .8, .7));
        render3D.emissive = e;
    }
}
export function buildSnail()
{
    const x = P.snail.x, z = P.snail.z;
    const s = new Snail(vec3(x, heightAt(x, z), z));
    addSolid({ kind: 'circle', x, z, r: .7, top: 1.2 });
    addInteract({ pos: vec3(x, heightAt(x, z), z), r: 2.6, label: 'Talk to Oswin', act: ()=>
    {
        player.yaw = Math.atan2(-(x - player.pos.x), -(z - player.pos.z));
        say('Oswin the lantern snail', SNAIL_LINES[snailLine % SNAIL_LINES.length]);
        snailLine++;
    } });
}
