// The telescope on Observatory Hill, and the constellations and whale you can find with it.
import {
    EngineObject3D, MOBILE, PI, WHITE, buildCylinder, clamp, gamepadStick, hsl, min, mouseDeltaScreen, mouseIsDown,
    mouseWheel, render3D, time, timeDelta, vec3,
} from '../../platform/engine.js';
import { bell, playSfx } from '../../audio/sfx.js';
import { CONSTELLATIONS } from './constellations-data.js';
import { activity } from '../../game/activity.js';
import { addInteract } from '../../game/interact.js';
import { state, writeSave } from '../../game/state.js';
import { TAU } from '../../lib/math.js';
import { clearTouchPresses, input, pointerOnCanvas, touchState } from '../../platform/input.js';
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
            for (const s of c.stars) render3D.drawSoftDisc(cam.add(s.scale(R)), (scope ? 3 : 5.5) + focus * 2, hsl(.6, .3, 1, .7 + Math.sin(time * 2 + s.x * 30) * .2));
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
    $('scopeHint').textContent = MOBILE ? 'Drag to look around. Tap Jump to step back.' : 'Drag, or use the arrow keys, to look around. Scroll to zoom. Q to step back.';
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
}
function updateTelescope()
{
    const dt = timeDelta;
    if (mouseIsDown(0) && pointerOnCanvas) { scope.yaw += mouseDeltaScreen.x * .0016 * scope.fov; scope.pitch = clamp(scope.pitch + mouseDeltaScreen.y * .0016 * scope.fov, .05, 1.45); }
    const k = input.move(), rs = gamepadStick(1);
    scope.yaw -= (k.x + rs.x) * dt * scope.fov * 1.2;
    scope.pitch = clamp(scope.pitch + (k.y + rs.y) * dt * scope.fov * 1.2, .05, 1.45);
    if (mouseWheel) scope.fov = clamp(scope.fov * (1 + mouseWheel * .12), PI / 28, PI / 5);
    SCOPE.yaw = scope.yaw; SCOPE.pitch = scope.pitch;
    const dir = vec3(-Math.sin(scope.yaw) * Math.cos(scope.pitch), Math.sin(scope.pitch), -Math.cos(scope.yaw) * Math.cos(scope.pitch));
    let best = null, bestDot = Math.cos(.09);
    for (const c of CONSTELLATIONS) { const d = dir.dot(c.dir); if (d > bestDot) { bestDot = d; best = c; } }
    if (best !== scope.focus) { scope.focus = best; scope.focusT = 0; }
    if (best)
    {
        scope.focusT = min(1, scope.focusT + dt / 1.3);
        if (scope.focusT >= 1 && !save.sky[best.id])
        {
            save.sky[best.id] = true; writeSave();
            [0, 7, 12, 16].forEach((n, i)=> setTimeout(()=> bell(n + 7, undefined, .45), i * 130));
            toast(`You found a constellation: ${best.name}. ${best.desc}`, 5200);
        }
    }
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
    if (input.back() || input.act() || (MOBILE && touchState.jump)) { clearTouchPresses(); endTelescope(); }
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
