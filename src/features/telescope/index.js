// The telescope on Observatory Hill, and the constellations and whale you can find with it.
import {
    EngineObject3D, MOBILE, PI, WHITE, buildCylinder, clamp, gamepadStick, hsl, max, min, mouseDeltaScreen, mouseIsDown,
    render3D, time, timeDelta, vec3,
} from '../../platform/engine.js';
import { bell, playSfx } from '../../audio/sfx.js';
import { CONSTELLATIONS } from './constellations-data.js';
import { activity } from '../../game/activity.js';
import { addInteract } from '../../game/interact.js';
import { state, writeSave } from '../../game/state.js';
import { TAU, mix, wrapAngle } from '../../lib/math.js';
import { clearTouchPresses, input, pointerOnCanvas } from '../../platform/input.js';
import { mtx, obj3 } from '../../platform/mesh.js';
import { CYL, SPH_LO } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { texStone } from '../../render/textures.js';
import { whale } from '../../sky/whale.js';
import { $ } from '../../ui/dom.js';
import { addJournalSection, addTodo } from '../../ui/journal.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { toast } from '../../ui/toast.js';
import { addClearing } from '../../world/clearings.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const save = state.slice('telescope', { sky: {}, whale: false });

for (const c of CONSTELLATIONS)
{
    const dir = vec3(Math.sin(c.az) * Math.cos(c.el), Math.sin(c.el), -Math.cos(c.az) * Math.cos(c.el));
    const right = vec3(dir.z, 0, -dir.x).normalize(), up = right.cross(dir).normalize().scale(-1);
    c.dir = dir;
    c.stars = c.pts.map(([x, y])=> dir.add(right.scale(x * .07)).add(up.scale(y * .07)).normalize());
}
let scope = null;
class ConstellationSky extends EngineObject3D
{
    constructor() { super(vec3()); this.additive = true; this.castShadow = false; }
    render3D()
    {
        const cam = render3D.camera.pos, R = 640;
        for (const c of CONSTELLATIONS)
        {
            const found = save.sky[c.id];
            const focus = scope && scope.focus === c ? scope.focusT : 0;
            const reveal = scope?.reveal?.c === c ? scope.reveal.t : -1;
            const size = (scope ? 4.5 : 5.5) + focus * 2 + (reveal >= 0 ? 2 + Math.sin(reveal * 6) * .5 : 0);
            for (const s of c.stars) render3D.drawSoftDisc(cam.add(s.scale(R)), size, hsl(.6, .3, 1, .75 + Math.sin(time * 2 + s.x * 30) * .2));
            if (reveal >= 0)
            {
                // the lines draw in one after another, joining the stars up
                const k = clamp(reveal / REVEAL_DRAW) * c.lines.length;
                c.lines.forEach(([a, b], i)=>
                {
                    const f = clamp(k - i);
                    if (f > 0) render3D.drawLine(cam.add(c.stars[a].scale(R)), cam.add(c.stars[a].lerp(c.stars[b], f).scale(R)), 1.4, hsl(.13, .7, .85, .9));
                });
                continue;
            }
            const la = found ? .28 : focus * .5;
            if (la > 0)
                for (const [a, b] of c.lines)
                    render3D.drawLine(cam.add(c.stars[a].scale(R)), cam.add(c.stars[b].scale(R)), scope ? .8 : 1.6, hsl(.55, .6, .85, la));
        }
    }
}
function buildTelescope()
{
    const t = P.telescope, y = heightAt(t.x, t.z);
    obj3(vec3(t.x, y - .2, t.z), buildCylinder(7, .5, 20), WHITE, { tileInfo: texStone });
    const brass = hsl(.11, .55, .5);
    for (let k = 0; k < 3; k++)
    {
        const a = k / 3 * TAU;
        obj3(vec3(t.x + Math.cos(a) * .45, y + .8, t.z + Math.sin(a) * .45), buildCylinder(.07, 1.7, 6), hsl(.75, .2, .25),
            { rotation3D: vec3(Math.sin(a) * .25, 0, -Math.cos(a) * .25) });
    }
    SCOPE.base = vec3(t.x, y + 1.65, t.z);
    new TelescopeTube();
    addSolid({ kind: 'circle', x: t.x, z: t.z, r: .7, top: y + 2 });
    addInteract({ pos: vec3(t.x, y, t.z), r: 2.3, label: 'Look through the telescope', act: startTelescope });
    new ConstellationSky();
    PLACE_NAMES.push({ name: 'Observatory Hill', sub: 'the stars are closer up here', x: t.x, z: t.z, r: 8, zone: 'island' });
    addClearing(t.x, t.z, 7);
    addClearing(t.x, t.z, 3.6, true);
}
const SCOPE = { yaw: .4, pitch: .6 };
class TelescopeTube extends EngineObject3D
{
    constructor() { super(SCOPE.base.copy()); this.castShadow = true; }
    render3D()
    {
        if (scope) return;     // the camera is at the eyepiece, so the tube would fill the view
        const m = mtx(undefined, SCOPE.base, vec3(SCOPE.pitch, SCOPE.yaw, 0));
        render3D.drawMesh(CYL, mtx(m, vec3(0, 0, -.5), vec3(PI / 2, 0, 0), vec3(.34, 2.2, .34)), undefined, hsl(.11, .55, .5));
        render3D.drawMesh(CYL, mtx(m, vec3(0, 0, -1.55), vec3(PI / 2, 0, 0), vec3(.44, .25, .44)), undefined, hsl(.11, .6, .6));
        render3D.drawMesh(CYL, mtx(m, vec3(0, 0, .65), vec3(PI / 2, 0, 0), vec3(.16, .3, .16)), undefined, hsl(.75, .2, .25));
        render3D.drawMesh(SPH_LO, mtx(m, vec3(), vec3(), vec3(.3)), undefined, hsl(.75, .2, .25));
    }
}
function startTelescope()
{
    scope = { yaw: SCOPE.yaw, pitch: SCOPE.pitch, fov: PI / 9, focus: null, focusT: 0, whaleT: 0 };
    player.pose = 'look';
    const t = P.telescope;
    player.yaw = Math.atan2(-(t.x - player.pos.x), -(t.z - player.pos.z));
    $('scope').hidden = false;
    buildMarks();
    $('scopeHint').textContent = MOBILE ? 'Drag to look around and pinch to zoom. Gold arrows point to constellations. Tap Back to step away.' : 'Drag, or use the arrow keys, to look around. Gold arrows point to constellations. Scroll to zoom. Q to step back.';
    activity.start({
        name: 'telescope', ownsPhysics: false, lockCamera: true,
        update: updateTelescope,
        cancel: endTelescope,
        hint: ()=> '',
        cam: ()=>
        {
            const dir = vec3(-Math.sin(scope.yaw) * Math.cos(scope.pitch), Math.sin(scope.pitch), -Math.cos(scope.yaw) * Math.cos(scope.pitch));
            const eye = SCOPE.base.add(vec3(0, .3, 0));
            return { pos: eye, look: eye.add(dir.scale(50)), fov: scope.fov, snap: 12 };
        },
    });
}
function endTelescope()
{
    scope = null; activity.end(); player.pose = 'free';
    $('scope').hidden = true;
    $('scopeCap').classList.remove('show');
}
// how long the found-a-constellation moment takes: gliding onto it, the lines drawing in, then a pause to read
const REVEAL_DRAW = 1.8, REVEAL_END = 5.2;
const scopeDir = (yaw, pitch)=> vec3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));

// a small arrow on the rim of the eyepiece for each constellation, pointing the way to turn
const marks = [];
function buildMarks()
{
    if (marks.length) return;
    for (const c of CONSTELLATIONS)
    {
        const el = document.createElement('div');
        el.className = 'scope-mark';
        el.innerHTML = '<i></i><span></span>';
        $('scope').appendChild(el);
        marks.push({ c, el });
    }
}
function updateMarks(dir)
{
    const right = dir.cross(vec3(0, 1, 0)).normalize(), up = right.cross(dir);
    const rim = min(innerWidth, innerHeight) * .34 - 22;           // the eyepiece circle in style.css is 34vmin
    const inView = scope.fov * .5 * .62;                            // how far from the middle a star is still inside it
    for (const { c, el } of marks)
    {
        const found = save.sky[c.id];
        const away = Math.acos(clamp(dir.dot(c.dir), -1, 1));
        const a = Math.atan2(c.dir.dot(up), c.dir.dot(right));     // which way round the rim, behind you included
        el.dataset.away = away.toFixed(3); el.dataset.angle = a.toFixed(3);
        el.classList.toggle('found', !!found);
        el.hidden = !!scope.reveal || away < inView;
        if (el.hidden) continue;
        el.style.transform = `translate(${Math.cos(a) * rim}px, ${-Math.sin(a) * rim}px)`;
        /** @type {HTMLElement} */ (el.firstElementChild).style.transform = `rotate(${-a}rad)`;
        el.style.opacity = String(found ? .45 : mix(1, .45, clamp((away - .3) / 2.2)));   // brighter the nearer you are
        el.lastElementChild.textContent = found ? c.name : '';
    }
}
function startReveal(c)
{
    save.sky[c.id] = true; writeSave();
    scope.reveal = { c, t: 0, yaw: scope.yaw + wrapAngle(-c.az - scope.yaw), pitch: c.el, fov: .5 };
    scope.focus = null;
    playSfx('shimmer', undefined, .4);
    [0, 7, 12, 16].forEach((n, i)=> setTimeout(()=> bell(n + 7, undefined, .35), 500 + i * 160));
    $('scopeCapName').textContent = c.name;
    $('scopeCapDesc').textContent = c.desc;
    $('scopeRing').style.setProperty('--p', '0');
}
function updateReveal(dt)
{
    const r = scope.reveal, k = min(1, dt * 2.2);
    r.t += dt;
    scope.yaw = mix(scope.yaw, r.yaw, k); scope.pitch = mix(scope.pitch, r.pitch, k); scope.fov = mix(scope.fov, r.fov, k);
    if (r.t > REVEAL_DRAW * .6) $('scopeCap').classList.add('show');
    // after the lines are drawn, any key or click carries on; it ends on its own a moment later
    if (r.t > REVEAL_END || (r.t > REVEAL_DRAW + .4 && (input.act() || input.back() || input.jump())))
    {
        scope.reveal = null;
        $('scopeCap').classList.remove('show');
        toast(`Found: ${r.c.name}`, 2600);
        clearTouchPresses();
    }
}
function updateTelescope()
{
    const dt = timeDelta;
    if (scope.reveal)
    {
        updateReveal(dt);
        SCOPE.yaw = scope.yaw; SCOPE.pitch = scope.pitch;
        updateMarks(scopeDir(scope.yaw, scope.pitch));
        return;
    }
    if (mouseIsDown(0) && pointerOnCanvas && !input.pinching()) { scope.yaw += mouseDeltaScreen.x * .0016 * scope.fov; scope.pitch = clamp(scope.pitch + mouseDeltaScreen.y * .0016 * scope.fov, .05, 1.45); }
    const k = input.move(), rs = gamepadStick(1);
    scope.yaw -= (k.x + rs.x) * dt * scope.fov * 1.2;
    scope.pitch = clamp(scope.pitch + (k.y + rs.y) * dt * scope.fov * 1.2, .05, 1.45);
    const zoom = input.zoom();
    if (zoom) scope.fov = clamp(scope.fov * (1 + zoom * .12), PI / 28, PI / 5);
    SCOPE.yaw = scope.yaw; SCOPE.pitch = scope.pitch;
    const dir = scopeDir(scope.yaw, scope.pitch);
    updateMarks(dir);
    // a constellation near the middle of the view comes into focus; the ring in the middle fills as it does
    let best = null, bestDot = Math.cos(max(.12, scope.fov * .3));
    for (const c of CONSTELLATIONS) { const d = dir.dot(c.dir); if (d > bestDot) { bestDot = d; best = c; } }
    if (best !== scope.focus) { scope.focus = best; scope.focusT = 0; }
    if (best) scope.focusT = min(1, scope.focusT + dt / 1);
    $('scopeRing').style.setProperty('--p', best && !save.sky[best.id] ? String(scope.focusT) : '0');
    if (best && scope.focusT >= 1 && !save.sky[best.id]) return startReveal(best);
    // the whale, if it is in view
    const w = whale.pos3D.subtract(render3D.camera.pos).normalize();
    if (w.dot(dir) > Math.cos(scope.fov * .45))
    {
        scope.whaleT += dt;
        if (scope.whaleT > 1 && !save.whale)
        {
            save.whale = true; writeSave();
            toast('It is a whale made of starlight, as big as a hill. It looks right back at you.', 5200);
            playSfx('whale', undefined, .9);
        }
    }
    if (input.back() || input.act()) { clearTouchPresses(); endTelescope(); }
}

export const telescopeFeature = {
    build()
    {
        buildTelescope();
        addTodo(130, 'Spot the star whale through the telescope', ()=> save.whale);
        addTodo(140, 'Find all four constellations', ()=> Object.keys(save.sky).length >= 4);
        addJournalSection('sky', 20, ()=> CONSTELLATIONS.map((c)=>
        {
            const f = save.sky[c.id];
            return ['', f ? c.name : 'An unnamed shape', f ? c.desc : 'Look through the telescope on Observatory Hill.', '', !f, !!f];
        }));
        addJournalSection('sky', 30, ()=> [['', save.whale ? 'The star whale' : 'Something large',
            save.whale ? 'It circles the island slowly and sings every minute or so.' : 'Something sings out in the dark beyond the island.', '', !save.whale, save.whale]]);
    },
};
