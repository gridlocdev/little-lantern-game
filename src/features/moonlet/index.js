// The light bridge and the Moonlet at its end.
import {
    EngineObject3D, Light3D, MOBILE, Mesh, PI, WHITE, buildLathe, buildSphere, hsl, max, min, noise2D,
    render3D, time, timeDelta, vec3,
} from '../../platform/engine.js';
import { musicCue } from '../../audio/music.js';
import { addSoundPlace } from '../../audio/places.js';
import { PENTA, bell } from '../../audio/sfx.js';
import { events } from '../../game/events.js';
import { addInteract } from '../../game/interact.js';
import { state, writeSave } from '../../game/state.js';
import { TAU, dist2, mix, sstep } from '../../lib/math.js';
import { mtx, obj3, triMesh } from '../../platform/mesh.js';
import { fbm } from '../../platform/noise.js';
import { rr } from '../../platform/random.js';
import { BOXM } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { startSit } from '../../player/sit.js';
import { discMesh, waterShader } from '../../render/water.js';
import { buildHeron } from './heron.js';
import { playBridgeScene } from './scene.js';
import { addTodo } from '../../ui/journal.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { toast } from '../../ui/toast.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';
import { addWater } from '../../world/waters.js';

const save = state.slice('moonlet', { bridge: false, moonlet: false, hammock: false, heronMet: false, heronTip: 0, calfCaught: false, heronThanked: false });

const bridgeSlabs = [];
let moonletY = 0;
const moonletHeight = (x, z)=>
{
    const d = dist2(x, z, P.moonlet.x, P.moonlet.z);
    const pool = 1 - sstep(3, 4.4, d);
    return moonletY + (1 - sstep(0, P.moonlet.r, d)) * .9 - pool * .9 + (noise2D(x * .2, z * .2) - .5) * .25 * (1 - pool);
};
class BridgeSlabs extends EngineObject3D
{
    constructor() { super(vec3()); this.castShadow = true; }
    render3D()
    {
        const e = render3D.emissive;
        render3D.emissive = .7;
        for (const s of bridgeSlabs)
        {
            if (s.show <= 0) continue;
            s.show = min(1, s.show + timeDelta * 1.5);
            const bob = Math.sin(time * 1.2 + s.i * .7) * .04;
            render3D.drawMesh(BOXM, mtx(undefined, s.pos.add(vec3(0, bob - .12, 0)), vec3(0, s.yaw + Math.sin(s.i * 1.7) * .15, 0), vec3(2 * s.show, .18, 1.5 * s.show)), undefined, hsl(.6 + Math.sin(s.i) * .06, .55, .55, 1));
        }
        render3D.emissive = e;
    }
}
// The hammock: a striped cloth that sags between two spreader bars and curls up at the sides, gathered at each end into
// ropes tied to the crystal posts. Built in world space from the middle of the ground under it and the way it runs.
const HAMMOCK = { half: 1.2, width: 1, seat: .55, sag: .32, curl: .16, bar: .85, post: 1.5, tie: 1.3 };
function hammockMesh(at, along)
{
    const H = HAMMOCK, across = vec3(-along.z, 0, along.x);
    const P = (x, y, z)=> at.add(along.scale(x)).add(vec3(0, y, 0)).add(across.scale(z));
    const pts = [], idx = [], nrm = [], cols = [];
    const NU = 18, NV = 8;
    const stripe = [hsl(.92, .45, .62), hsl(.92, .45, .62), hsl(.8, .3, .74), hsl(.8, .3, .74)];
    for (let i = 0; i <= NU; i++)
    for (let j = 0; j <= NV; j++)
    {
        const u = i / NU * 2 - 1, v = j / NV * 2 - 1;
        const w = H.width / 2 * (1 - .8 * Math.abs(u) ** 4);     // gathered toward the bars
        pts.push(P(u * H.half, H.seat + H.sag * u * u + H.curl * v * v * (1 - u * u), v * w));
        nrm.push(vec3(0, 1, 0));
        cols.push(stripe[j % stripe.length]);
    }
    for (let i = 0; i < NU; i++)
    for (let j = 0; j < NV; j++)
    {
        const a = i * (NV + 1) + j, b = a + NV + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    // a four-sided tube from a to b, for the ropes and the bars
    const tube = (a, b, r, col)=>
    {
        const d = b.subtract(a).normalize(), side = d.cross(Math.abs(d.y) > .9 ? vec3(1, 0, 0) : vec3(0, 1, 0)).normalize(), up = d.cross(side);
        const base = pts.length;
        for (const p of [a, b])
        for (let k = 0; k < 4; k++)
        {
            const ang = k / 4 * TAU, off = side.scale(Math.cos(ang) * r).add(up.scale(Math.sin(ang) * r));
            pts.push(p.add(off)); nrm.push(off.normalize()); cols.push(col);
        }
        for (let k = 0; k < 4; k++)
        {
            const k2 = (k + 1) % 4;
            idx.push(base + k, base + 4 + k, base + k2, base + k2, base + 4 + k, base + 4 + k2);
        }
    };
    const wood = hsl(.08, .35, .42), rope = hsl(.12, .25, .78);
    for (const s of [-1, 1])
    {
        const endY = H.seat + H.sag, gather = H.width / 2 * .2;
        tube(P(s * H.half, endY, -gather - .1), P(s * H.half, endY, gather + .1), .04, wood);
        const knot = P(s * H.post, H.tie, 0);
        for (const z of [-gather - .08, 0, gather + .08]) tube(P(s * H.half, endY, z), knot, .015, rope);
    }
    const m = triMesh(pts, idx, nrm, cols);
    m.computeNormals(true);
    m.doubleSided = true;
    return m;
}
function buildMoonlet()
{
    const a = P.bridgeStart, m = P.moonlet;
    const startY = heightAt(a.x, a.z);
    moonletY = startY + 2.5;
    // bridge slabs every 2.2 m from the edge to the moonlet's rim
    const dx = m.x - a.x, dz = m.z - a.z, L = Math.hypot(dx, dz) - m.r + 1.5;
    const ux = dx / Math.hypot(dx, dz), uz = dz / Math.hypot(dx, dz);
    const yaw = Math.atan2(ux, uz);
    const n = Math.ceil(L / 2.25);
    // collision boxes overlap their neighbours by more than walkable()'s .15 inset, so there is no void gap between slabs
    const slabHz = L / n / 2 + .35;
    for (let i = 0; i <= n; i++)
    {
        const t = i / n, x = a.x + ux * (2 + L * t), z = a.z + uz * (2 + L * t);
        const y = mix(startY + .15, moonletY + .2, sstep(0, 1, t)) + Math.sin(t * PI) * 1.2;
        const s = { i, pos: vec3(x, y, z), yaw, show: save.bridge ? 1 : 0 };
        s.solid = addSolid({ kind: 'box', x, z, hx: 1.15, hz: slabHz, yaw, top: y, floor: true, platformOnly: true, disabled: !save.bridge });
        bridgeSlabs.push(s);
    }
    new BridgeSlabs;
    // the floating islet itself: a grassy dome with a pool, and a crystal root below
    const pts = [], cols = [], idx = [], nrm = [];
    const RINGS = 14, SEG = 48;
    pts.push(vec3(m.x, moonletHeight(m.x, m.z), m.z)); cols.push(hsl(.6, .4, .2)); nrm.push(vec3(0, 1, 0));
    for (let r = 1; r <= RINGS; r++)
    for (let k = 0; k < SEG; k++)
    {
        const ang = k / SEG * TAU, rad = r / RINGS * (m.r + 1);
        const x = m.x + Math.cos(ang) * rad, z = m.z + Math.sin(ang) * rad;
        const y = r === RINGS ? moonletY - .6 : moonletHeight(x, z);
        pts.push(vec3(x, y, z));
        const g = fbm(x * .2, z * .2, 2);
        cols.push(rad < 4.5 ? hsl(.62, .3, .18) : hsl(.68 + g * .08, .4, .26 + g * .1));
        nrm.push(vec3(0, 1, 0));
    }
    const ring = (r)=> r === 0 ? 0 : 1 + (r - 1) * SEG;
    for (let k = 0; k < SEG; k++) idx.push(0, ring(1) + (k + 1) % SEG, ring(1) + k);
    for (let r = 1; r < RINGS; r++)
    for (let k = 0; k < SEG; k++)
    {
        const a0 = ring(r) + k, a1 = ring(r) + (k + 1) % SEG, b0 = ring(r + 1) + k, b1 = ring(r + 1) + (k + 1) % SEG;
        idx.push(a0, a1, b0, a1, b1, b0);
    }
    const top = triMesh(pts, idx, nrm, cols);
    top.computeNormals(true);
    top.doubleSided = true;
    obj3(vec3(), top, WHITE, { castShadow: false });
    const root = new Mesh();
    const prof = [[0, -14], [3, -10], [7, -5], [10, -2.5], [m.r + .9, -.6]];
    root.combine(buildLathe(prof, 18, false), undefined, hsl(.77, .45, .3));
    obj3(vec3(m.x, moonletY, m.z), root, WHITE, { emissive: .25 });
    for (let i = 0; i < 8; i++)
        obj3(vec3(m.x + rr(-5, 5), moonletY - rr(6, 12), m.z + rr(-5, 5)), buildSphere(1, 4, 2), hsl(.75, .7, .65),
            { emissive: .9, scale3D: vec3(rr(.6, 1.2), rr(2.5, 5), rr(.6, 1.2)), castShadow: false });
    // the moon pool
    const pool = obj3(vec3(m.x, moonletY - .25, m.z), discMesh(4.3), WHITE, { emissive: 1, castShadow: false });
    pool.shader = waterShader(m.x, m.z, 4.3, 1);
    new Light3D(vec3(m.x, moonletY + .6, m.z), 12, hsl(.13, .7, .65), 1.4);
    addSolid({ kind: 'circle', x: m.x, z: m.z, r: m.r + .4, topFn: moonletHeight, floor: true, platformOnly: true });
    addSolid({ kind: 'circle', x: m.x, z: m.z, r: 3.4, top: 99 });
    addSoundPlace({ name: 'water', at: ()=> m, near: 5.5, far: 16 });     // the pool laps, and a frog lives in it
    addWater({
        kind: 'moonlet', reach: 2.5, r: 2.4,
        pos: ()=> { const d = vec3(player.pos.x - m.x, 0, player.pos.z - m.z); const l = d.length() || 1; return vec3(m.x + d.x / l * 4.6, moonletY, m.z + d.z / l * 4.6); },
        center: ()=> vec3(m.x, moonletY, m.z),
        clamp: (p)=> { const d = vec3(p.x - m.x, 0, p.z - m.z); const l = min(d.length(), 3); const k = d.length() > .01 ? l / d.length() : 0; return vec3(m.x + d.x * k, moonletY - .22, m.z + d.z * k); },
    });
    // hammock between two crystal posts
    const hx = m.x + Math.cos(.8) * 9, hz = m.z + Math.sin(.8) * 9, hy = moonletHeight(hx, hz);
    const hyaw = rr(0, PI);
    const side = vec3(Math.cos(hyaw), 0, -Math.sin(hyaw));
    for (const s of [-1.7, 1.7])
    {
        const p = vec3(hx, hy, hz).add(side.scale(s));
        obj3(p.add(vec3(0, 1.1, 0)), buildSphere(1, 5, 3), hsl(.55, .7, .65), { scale3D: vec3(.45, 2.4, .45), emissive: .7 });
        addSolid({ kind: 'circle', x: p.x, z: p.z, r: .35, top: hy + 2.3 });
    }
    obj3(vec3(), hammockMesh(vec3(hx, hy, hz), side), WHITE, { castShadow: true });
    let cue = null;
    addInteract({ pos: vec3(hx, hy, hz), r: 2.2, label: 'Lie in the hammock', when: ()=> true, act: ()=>
    {
        // curled up on her side along the cloth, facing out over the pool
        startSit(vec3(hx, hy + HAMMOCK.seat, hz), hyaw, { pose: 'hammock', height: 0, out: 1.3, hint: `${MOBILE ? 'Use' : 'E'}|Get up`,
            onSit: ()=> { if (!save.hammock) { save.hammock = true; writeSave(); } cue = musicCue('ending'); toast('The whole sky turns slowly around you.'); },
            onEnd: ()=> { cue?.release(); cue = null; },
            cam: ()=> ({ target: vec3(hx, hy + 1, hz), dist: 9, yaw: time * .08, pitch: .5 }) });
    } });
    // moonflowers
    for (let i = 0; i < 40; i++)
    {
        const ang = rr(0, TAU), rad = rr(5, m.r - .5), x = m.x + Math.cos(ang) * rad, z = m.z + Math.sin(ang) * rad;
        obj3(vec3(x, moonletHeight(x, z) + .3, z), buildSphere(.2, 6, 4), hsl(.13, .8, .78), { emissive: 1, castShadow: false });
    }
    // Ardea fishes from the far side of the pool, facing you as you come over the bridge
    const across = Math.atan2(P.bridgeStart.z - m.z, P.bridgeStart.x - m.x) + PI - .45;
    const ax = m.x + Math.cos(across) * 5.1, az = m.z + Math.sin(across) * 5.1;
    buildHeron({ pos: vec3(ax, moonletHeight(ax, az), az), center: vec3(m.x, 0, m.z), waterY: moonletY - .23, ground: moonletHeight, save });
    PLACE_NAMES.push({ name: 'The Moonlet', sub: 'a piece of the island that wandered off', x: m.x, z: m.z, r: m.r + 1, zone: 'island' });
}
function bridgeAppear(i)
{
    if (i >= bridgeSlabs.length) return;
    const s = bridgeSlabs[i];
    s.show = max(s.show, .01);
    s.solid.disabled = false;
    bell(PENTA[i % PENTA.length], s.pos, .5);
    setTimeout(()=> bridgeAppear(i + 1), 160);
}
function checkMoonletVisit()
{
    if (save.moonlet) return;
    if (dist2(player.pos.x, player.pos.z, P.moonlet.x, P.moonlet.z) < P.moonlet.r)
    {
        save.moonlet = true; writeSave();
        toast('You crossed to the Moonlet. Something big is moving in the pool.');
    }
}

// every slab at once, when the cutscene is skipped or ends
function bridgeAll()
{
    for (const s of bridgeSlabs) { s.show = max(s.show, .01); s.solid.disabled = false; }
}
// the song from Amethyst Hill unfolds the bridge the first time it is played
function answerMoonSong()
{
    if (!save.bridge)
    {
        save.bridge = true; writeSave();
        playBridgeScene({ unfold: ()=> bridgeAppear(0), finish: bridgeAll, moonletY });
    }
    else toast('The moon hums along.');
}
export const moonletFeature = {
    build()
    {
        buildMoonlet();
        events.on('moon-song-played', answerMoonSong);
        addTodo(50, 'Play the song carved on Amethyst Hill', ()=> save.bridge);
        addTodo(60, 'Cross the light bridge to the Moonlet', ()=> save.moonlet);
        addTodo(70, 'Rest in the Moonlet hammock', ()=> save.hammock);
    },
    update: checkMoonletVisit,
};
