// The camera: an orbit that follows the mothling, a slow circle around the island on the title screen, or whatever
// the current activity (or cutscene) points it at. When what it follows changes, it glides from where it was instead
// of jumping. Anything can briefly draw its eye to a point (focusCamera) or punch in on an impact (kickCamera).
import {
    PI, clamp, gamepadIsDown, gamepadStick, keyIsDown, min, mouseDeltaScreen, mouseIsDown, mouseWheel, pointerLockIsActive, render3D, time, timeDelta,
    timeReal, vec3,
} from '../platform/engine.js';
import { activity } from '../game/activity.js';
import { loadSetting, state } from '../game/state.js';
import { mix, wrapAngle } from '../lib/math.js';
import { pointerOnCanvas } from '../platform/input.js';
import { player } from '../player/player.js';
import { uiOpen } from '../ui/dom.js';
import { HOUSE_IN, insideIsland } from '../world/layout.js';
import { heightAt } from '../world/terrain.js';

// sens: how fast the mouse turns the camera, 1 by default (the menu's mouse sensitivity slider)
export const cam = { yaw: 0, pitch: .3, dist: 7, distT: 7, manualT: -99, look: vec3(), fov: PI / 3, house: false, sens: 1 };

// what the camera shows, before focus and kicks
const view = { pos: vec3(0, 40, 175), look: vec3(), fov: PI / 3, roll: 0 };
let source = '', blend = null, blendOut = 1.8, focus = null, kick = 0, kickTarget = 0;

// a sine ease: it starts and settles gently and never rushes in the middle (a cubic ease moves three times faster
// than average halfway through, which reads as a lurch)
const ease = (x)=> (1 - Math.cos(PI * x)) / 2;
// every glide between views takes at least this long; anything quicker feels like a cut that went wrong
const MIN_BLEND = 1.6;
const orbitPos = (look, d, yaw, pitch)=> look.add(vec3(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d));

// Draws the camera's eye toward a point for a while: pull is how far the view turns to it (0..1), zoom narrows the
// view (1 is none). Returns a handle whose release() lets go early; without dur it holds until released.
export function focusCamera(point, { pull = .45, zoom = .82, dur = Infinity, rise = .5, fall = .7 } = {})
{
    // eased in and out slowly, and never zoomed hard, so a glance never snaps
    const f = { point, pull, zoom: mix(1, zoom, .7), dur, rise: Math.max(.9, rise * 1.8), fall: Math.max(1.2, fall * 1.7), t: 0, out: -1 };
    focus = f;
    return { release() { if (f.out < 0) f.out = f.t; } };
}
// a quick punch in that settles, for impacts; amount is a fraction of the field of view
export const kickCamera = (amount = .08)=> { kickTarget = Math.max(kickTarget, amount * .45); };

// ---------------------------------------------------------------- where each mode wants the camera
function orbitInput(dt)
{
    // orbit by dragging on the world or the right stick; zoom with the wheel, or the right stick up and down while the
    // left bumper or trigger is held
    if (state.mode !== 'play' || activity.current?.lockCamera || uiOpen()) return;
    // with the mouse captured (ui/cursor.js) it turns the camera without a button held
    if ((pointerLockIsActive() || (mouseIsDown(0) && pointerOnCanvas)) && !activity.current?.mouseHold)
    {
        const d = mouseDeltaScreen;
        cam.yaw -= d.x * .0055 * cam.sens;
        cam.pitch = clamp(cam.pitch + d.y * .0045 * cam.sens, -.15, 1.25);
        if (d.length() > 0) cam.manualT = time;
    }
    const rs = gamepadStick(1);
    const zooming = gamepadIsDown(4) || gamepadIsDown(6);
    if (rs.length() > .1)
    {
        cam.yaw -= rs.x * dt * 2.4;
        if (zooming) cam.distT = clamp(cam.distT - rs.y * dt * 9, 3, 16);
        else cam.pitch = clamp(cam.pitch - rs.y * dt * 1.6, -.15, 1.25);
        cam.manualT = time;
    }
    if (keyIsDown('KeyZ')) { cam.yaw += dt * 1.8; cam.manualT = time; }
    if (keyIsDown('KeyC')) { cam.yaw -= dt * 1.8; cam.manualT = time; }
    if (mouseWheel) cam.distT = clamp(cam.distT + mouseWheel * .9, 3, 16);
}
function wanted(dt)
{
    if (state.mode === 'title')
        return { key: 'title', look: vec3(0, -6, 0), pos: orbitPos(vec3(0, -6, 0), 175, timeReal * .03 + 2.2, .32), fov: PI / 3, blendIn: 2.6 };

    orbitInput(dt);
    cam.dist = mix(cam.dist, cam.distT, min(1, dt * 6));
    let target, dist = cam.dist, yaw = cam.yaw, pitch = cam.pitch, key = player.zone;
    const a = activity.current;
    if (a && a.cam)
    {
        const c = a.cam();
        key = 'act:' + a.name;
        // a fixed camera that looks at something; a cutscene sets exact so it is not smoothed
        if (c.pos) return { key, pos: c.pos, look: c.look, fov: c.fov || PI / 3, roll: c.roll || 0, smooth: c.exact ? 0 : c.snap || 4, blendIn: a.camBlend };
        target = c.target; dist = c.dist ?? dist;
        if (c.yaw !== undefined) cam.yaw += wrapAngle(c.yaw - cam.yaw) * min(1, dt * 2.5);
        if (c.pitch !== undefined) cam.pitch = mix(cam.pitch, c.pitch, min(1, dt * 2.5));
        yaw = cam.yaw; pitch = cam.pitch;
    }
    else if (player.zone === 'house')
    {
        target = player.pos.add(vec3(0, .9, 0));
        target = vec3(clamp(target.x, HOUSE_IN.x - 3, HOUSE_IN.x + 3), target.y, clamp(target.z, HOUSE_IN.z - 2.5, HOUSE_IN.z + 1.5));
        yaw = 0; pitch = .82; dist = 11;
        cam.yaw = 0; cam.pitch = .82;
    }
    else
    {
        target = player.pos.add(vec3(0, 1.1, 0));
        // drift behind the mothling while it walks, unless you just moved the camera
        if (player.speed > 1 && time - cam.manualT > 1.6 && state.mode === 'play')
            cam.yaw += wrapAngle(player.yaw - cam.yaw) * min(1, dt * .9);
        yaw = cam.yaw; pitch = cam.pitch;
    }
    cam.look = cam.look.length() ? cam.look.lerp(target, min(1, dt * 10)) : target;
    // pull in so the ground never hides the mothling
    let d = dist;
    if (player.zone === 'island')
    {
        for (let i = 0; i < 6; i++)
        {
            const p = orbitPos(cam.look, d, yaw, pitch);
            if (!insideIsland(p.x, p.z, -2) || p.y > heightAt(p.x, p.z) + .6) break;
            d *= .82;
        }
    }
    return { key, look: cam.look, pos: orbitPos(cam.look, d, yaw, pitch), fov: PI / 3, roll: 0, smooth: 0, blendIn: a?.camBlend };
}

// ---------------------------------------------------------------- moving between them
function updateCamera()
{
    const dt = timeDelta || 1 / 60;
    const w = wanted(dt);
    if (w.key !== source)
    {
        const was = source;
        source = w.key;
        const zoneChange = (was === 'island' || was === 'house') && (w.key === 'island' || w.key === 'house');
        if (zoneChange)
        {
            // a new place behind a fade: start a little further out and settle in
            const back = w.pos.subtract(w.look).scale(.45);
            blend = { from: { pos: w.pos.add(back).add(vec3(0, 1.5, 0)), look: w.look.copy(), fov: w.fov, roll: 0 }, t: 0, dur: 2.4, arc: 0 };
        }
        else
        {
            const asked = was === 'title' ? w.blendIn ?? 2.6 : was.startsWith('act:') && !w.key.startsWith('act:') ? blendOut : w.blendIn ?? 1.8;
            const dur = Math.max(MIN_BLEND, asked * 1.3);
            blend = dur > 0 && was ? { from: { pos: view.pos.copy(), look: view.look.copy(), fov: view.fov, roll: view.roll }, t: 0, dur, arc: .12 } : null;
        }
        blendOut = activity.current?.camBlendOut ?? 1.8;
    }

    let pos = w.pos, look = w.look, fov = w.fov, roll = w.roll || 0;
    if (w.smooth && !blend)
    {
        const k = min(1, dt * w.smooth);
        pos = view.pos.lerp(w.pos, k); look = view.look.lerp(w.look, k); fov = mix(view.fov, w.fov, min(1, dt * 4)); roll = mix(view.roll, roll, k);
    }
    if (blend)
    {
        blend.t += dt;
        const k = ease(min(1, blend.t / blend.dur)), f = blend.from;
        // glide along a gentle arc rather than a straight line, so long moves lift over the ground
        const lift = Math.sin(PI * k) * f.pos.distance(w.pos) * blend.arc;
        pos = f.pos.lerp(w.pos, k).add(vec3(0, lift, 0));
        look = f.look.lerp(w.look, k); fov = mix(f.fov, w.fov, k); roll = mix(f.roll, roll, k);
        if (blend.t >= blend.dur) blend = null;
    }
    view.pos = pos; view.look = look; view.fov = fov; view.roll = roll;

    // emphasis on top of the view
    let fLook = look, fFov = fov;
    if (focus)
    {
        const f = focus;
        f.t += dt;
        if (f.out < 0 && f.t >= f.dur) f.out = f.t;
        const into = ease(min(1, f.t / f.rise)), outOf = f.out < 0 ? 1 : 1 - ease(min(1, (f.t - f.out) / f.fall));
        const k = into * outOf;
        const point = typeof f.point === 'function' ? f.point() : f.point;
        fLook = look.lerp(point, f.pull * k);
        fFov = fov * mix(1, f.zoom, k);
        if (f.out >= 0 && f.t - f.out >= f.fall) focus = null;
    }
    // a kick swells in over a few frames and eases away, rather than jumping the zoom
    kick = mix(kick, kickTarget, min(1, dt * 14));
    kickTarget *= Math.exp(-dt * 3.5);
    const R = render3D.camera;
    R.pos = pos;
    R.lookAt(fLook);
    R.rotation.z = roll;
    R.fov = fFov * (1 - kick);
}
export const camNear = (p, d)=> render3D.camera.pos.distanceSquared(p) < d * d;

export const cameraSystem = {
    build() { const s = parseFloat(loadSetting('mouse')); if (s > 0) cam.sens = s; },
    updatePost: updateCamera,
};
