// The crystal chimes on Amethyst Hill.
import {
    EngineObject3D, Light3D, Mesh, PI, WHITE, buildBox, buildMatrix, buildSphere, hsl, max, render3D, time,
    timeDelta, vec2, vec3,
} from '../../platform/engine.js';
import { PENTA, bell } from '../../audio/sfx.js';
import { CHIME_NAMES, MOON_SONG } from './song-data.js';
import { events } from '../../game/events.js';
import { addInteract } from '../../game/interact.js';
import { TAU } from '../../lib/math.js';
import { canvasTexture, mtx, obj3, triMesh } from '../../platform/mesh.js';
import { rr } from '../../platform/random.js';
import { moth } from '../../player/mothling.js';
import { camNear, focusCamera } from '../../render/camera.js';
import { burst } from '../../render/particles.js';
import { say } from '../../ui/dialog.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { addClearing } from '../../world/clearings.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const CHIME_COLORS = [hsl(.95, .7, .68), hsl(.08, .8, .65), hsl(.15, .85, .65), hsl(.4, .6, .6), hsl(.5, .75, .62), hsl(.6, .7, .7), hsl(.76, .7, .72)];
const chimes = [];
let chimeLast = [];
class ChimeRing extends EngineObject3D
{
    constructor() { super(vec3(P.chimes.x, heightAt(P.chimes.x, P.chimes.z), P.chimes.z)); this.castShadow = true; }
    render3D()
    {
        if (!camNear(this.pos3D, 150)) return;
        for (const c of chimes)
        {
            c.hit = max(0, c.hit - timeDelta * 1.2);
            const sc = 1 + c.hit * .12;
            const e = render3D.emissive;
            render3D.emissive = .55 + c.hit * 1.2 + Math.sin(time * 1.5 + c.i) * .08;
            render3D.drawMesh(c.mesh, mtx(undefined, c.pos, vec3(0, c.yaw + Math.sin(time * 6) * c.hit * .05, 0), vec3(sc)), undefined, c.color);
            render3D.emissive = e;
        }
    }
}
function buildChimes()
{
    const cx = P.chimes.x, cz = P.chimes.z, cy = heightAt(cx, cz);
    for (let i = 0; i < 7; i++)
    {
        const a = i / 7 * TAU + .3, r = 5.6;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = heightAt(x, z);
        const h = 2.2 + i * .35;
        const mesh = new Mesh()
            .combine(buildSphere(1, 6, 3, false), buildMatrix(vec3(0, h * .5, 0), undefined, vec3(.9, h, .9)))
            .combine(buildSphere(1, 5, 3, false), buildMatrix(vec3(.55, h * .3, .2), vec3(0, 0, -.35), vec3(.45, h * .5, .45)))
            .combine(buildSphere(1, 5, 3, false), buildMatrix(vec3(-.45, h * .22, -.3), vec3(.3, 0, .4), vec3(.4, h * .4, .4)));
        const c = { i, pos: vec3(x, y - .2, z), color: CHIME_COLORS[i], mesh, yaw: rr(0, TAU), hit: 0, semi: PENTA[i] + 12 };
        chimes.push(c);
        addSolid({ kind: 'circle', x, z, r: .7, top: y + h });
        addInteract({ pos: vec3(x, y, z), r: 2, label: `Ring the ${CHIME_NAMES[i]} crystal`, act: ()=> ringChime(c) });
    }
    new ChimeRing;
    // the carved stone with the song on it
    const tex = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#4c4566'; g.fillRect(0, 0, s, s);
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; g.strokeRect(10, 10, s - 20, s - 20);
        g.fillStyle = '#d9d0ff'; g.font = 'italic 24px Georgia, serif'; g.textAlign = 'center';
        g.fillText('the moon song', s / 2, 54);
        MOON_SONG.forEach((n, k)=>
        {
            const c = CHIME_COLORS[n];
            g.fillStyle = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
            g.shadowColor = g.fillStyle; g.shadowBlur = 12;
            g.beginPath(); g.arc(38 + k * 36, 130 + (k % 2 ? 18 : -6), 13, 0, TAU); g.fill();
        });
        g.shadowBlur = 0;
        g.fillStyle = '#b8aee0'; g.font = '17px Georgia, serif';
        g.fillText('play them in order', s / 2, 210);
    }, false);
    const stone = obj3(vec3(cx, cy + .9, cz), buildBox(vec3(2.2, 1.8, .45)), hsl(.74, .1, .36));
    const face = triMesh([vec3(-1, -.8, .235), vec3(1, -.8, .235), vec3(1, .8, .235), vec3(-1, .8, .235)], [0, 1, 2, 0, 2, 3], vec3(0, 0, 1), WHITE,
        [vec2(.04, .96), vec2(.96, .96), vec2(.96, .04), vec2(.04, .04)]);
    const faceObj = new EngineObject3D(vec3(cx, cy + .9, cz), face, tex);
    faceObj.emissive = .35;
    const yaw = Math.atan2(P.chimes.x - (-30), P.chimes.z - (-6)) + PI;
    stone.rotation3D = faceObj.rotation3D = vec3(0, Math.atan2(-30 - cx, -6 - cz), 0);
    addSolid({ kind: 'box', x: cx, z: cz, hx: 1.2, hz: .35, yaw: stone.rotation3D.y, top: cy + 1.8 });
    addInteract({ pos: vec3(cx, cy, cz), r: 2.6, label: 'Read the carved stone', act: ()=>
        say('The carved stone', ['Six crystals glow in a row across the stone, under the words "the moon song".',
            `In order: ${MOON_SONG.map((n)=> CHIME_NAMES[n]).join(', ')}.`]) });
    new Light3D(vec3(cx, cy + 3, cz), 14, hsl(.78, .7, .6), 1.4);
    PLACE_NAMES.push({ name: 'Amethyst Hill', sub: 'every crystal hums one note', x: cx, z: cz, r: 10, zone: 'island' });
    addClearing(cx, cz, 13);
}
function ringChime(c)
{
    c.hit = 1;
    bell(c.semi, c.pos, 1);
    focusCamera(c.pos.add(vec3(0, 2, 0)), { pull: .2, zoom: .94, dur: .5, rise: .15 });
    burst(c.pos.add(vec3(0, 2, 0)), c.color, 12, .05, .2);
    moth.reach = 1;
    chimeLast.push(c.i);
    if (chimeLast.length > MOON_SONG.length) chimeLast.shift();
    if (chimeLast.join() === MOON_SONG.join())
    {
        chimeLast = [];
        setTimeout(()=>
        {
            for (const ch of chimes) ch.hit = 1;
            [0, 4, 7, 12, 16, 19].forEach((n, k)=> setTimeout(()=> bell(n + 12, undefined, .5), k * 120));
            events.emit('moon-song-played');
        }, 500);
    }
}

export const chimesFeature = { build: buildChimes };
