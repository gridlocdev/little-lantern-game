import {
    PI, abs, clamp, gamepadIsDown, gamepadStick, gamepadWasPressed, hsl, keyDirection, keyIsDown, keyWasPressed,
    max, min, mouseDeltaScreen, mouseIsDown, mouseWheel, render3D, time, timeDelta, usingGamepadInput, vec2, vec3,
} from './platform/engine.js';
import { playSfx } from './audio.js';
import { mix, wrapAngle } from './core.js';
import { burst } from './fx.js';
import { HOUSE_IN } from './house.js';
import { player } from './player.js';
import { save, writeSave } from './save.js';
import { fadeTransition, toast, uiOpen } from './ui.js';
import { boxLocal, heightAt, insideIsland, solidContains, solidTop, solidsAt } from './world.js';

// ================================================================ INPUT, MOVEMENT, CAMERA, INTERACTION
export let gameMode = 'title';      // title, play, ui
export let activity = null;         // an activity that has taken over the mothling: {name, update(), cancel(), cam}
export const setGameMode = (m)=> { gameMode = m; };
export const setActivity = (a)=> { activity = a; };
export const cam = { yaw: 0, pitch: .3, dist: 7, distT: 7, manualT: -99, look: vec3(), fov: PI / 3, house: false };
export const touchState = { jump: false, act: false, jumpHeld: false, actHeld: false, journal: false };
export let pointerOnCanvas = false;
document.addEventListener('pointerdown', (e)=> { pointerOnCanvas = e.target && e.target.tagName === 'CANVAS'; });

export const input = {
    move()
    {
        let v = keyDirection();
        const g = gamepadStick(0);
        if (g.length() > .1) v = g;
        return v.length() > 1 ? v.normalize() : v;
    },
    jump: ()=> keyWasPressed('Space') || gamepadWasPressed(0) || touchState.jump,
    jumpHeld: ()=> keyIsDown('Space') || gamepadIsDown(0) || touchState.jumpHeld,
    act: ()=> keyWasPressed('KeyE') || keyWasPressed('KeyF') || keyWasPressed('Enter') || gamepadWasPressed(2) || touchState.act,
    actHeld: ()=> keyIsDown('KeyE') || keyIsDown('KeyF') || keyIsDown('Space') || gamepadIsDown(2) || gamepadIsDown(0) || touchState.actHeld || touchState.jumpHeld || (mouseIsDown(0) && pointerOnCanvas && activity?.mouseHold),
    back: ()=> keyWasPressed('Escape') || keyWasPressed('KeyQ') || gamepadWasPressed(1),
    run: ()=> keyIsDown('ShiftLeft') || keyIsDown('ShiftRight') || gamepadIsDown(5) || gamepadIsDown(7) || (gamepadStick(0).length() > .95 && usingGamepadInput()),
    journal: ()=> keyWasPressed('KeyJ') || keyWasPressed('Tab') || gamepadWasPressed(3) || touchState.journal,
    pause: ()=> keyWasPressed('Escape') || gamepadWasPressed(9),
};
export function clearTouchPresses() { touchState.jump = touchState.act = touchState.journal = false; }

// ---------------------------------------------------------------- ground and collision
export function groundInfo(x, z, feetY)
{
    // returns the highest floor at or just under the feet, and what it is
    let y = -1e9, on;
    if (player.zone === 'island' && insideIsland(x, z, .6)) y = heightAt(x, z);
    for (const s of solidsAt(x, z))
    {
        if (s.zone !== player.zone || s.disabled) continue;
        if (!solidContains(s, x, z)) continue;
        const top = solidTop(s, x, z);
        if (top <= feetY + .45 && top > y) { y = top; on = s; }
    }
    return { y, on };
}
function pushOutOfSolids(p, feetY)
{
    for (const s of solidsAt(p.x, p.z))
    {
        if (s.zone !== player.zone || s.disabled || s.platformOnly) continue;
        const top = solidTop(s, p.x, p.z);
        if (feetY >= top - .45 || feetY + 1.2 < s.bottom) continue;
        const PR = .32;
        if (s.kind === 'circle')
        {
            const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r + PR;
            if (d < m && d > 1e-5) { p.x = s.x + dx / d * m; p.z = s.z + dz / d * m; }
        }
        else
        {
            let [lx, lz] = boxLocal(s, p.x, p.z);
            const ex = s.hx + PR, ez = s.hz + PR;
            if (Math.abs(lx) < ex && Math.abs(lz) < ez)
            {
                if (ex - Math.abs(lx) < ez - Math.abs(lz)) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez;
                p.x = s.x + lx * s.c + lz * s.s;
                p.z = s.z - lx * s.s + lz * s.c;
            }
        }
    }
}
// is this a spot the mothling may stand: on the island, or on something built over the void
function walkable(x, z, feetY)
{
    if (player.zone === 'island' && insideIsland(x, z, 1.2)) return true;
    for (const s of solidsAt(x, z))
        if (s.zone === player.zone && !s.disabled && s.floor && solidContains(s, x, z, -.15) && solidTop(s, x, z) <= feetY + .6) return true;
    return false;
}

const GRAV = 22;
const JUMP_VEL = 8.6; // apex about 1.7 m, enough to land on the low mushroom caps
export function updatePlayer()
{
    const dt = timeDelta;
    const free = gameMode === 'play' && !activity && !uiOpen();
    let mv = free ? input.move() : vec2();
    const run = input.run();
    let speedT = mv.length() * (run ? 7.2 : 4.3);
    const fwd = vec3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    const right = vec3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    let wish = right.scale(mv.x).add(fwd.scale(mv.y));
    if (wish.length() > 1e-3) wish = wish.normalize(speedT);
    const k = player.onGround ? 14 : 3.5;
    player.vel = vec3(mix(player.vel.x, wish.x, min(1, k * dt)), player.vel.y, mix(player.vel.z, wish.z, min(1, k * dt)));
    if (wish.length() > .1 && free)
    {
        const targetYaw = Math.atan2(-wish.x, -wish.z);
        player.yaw += wrapAngle(targetYaw - player.yaw) * min(1, dt * 12);
    }
    // jump and glide
    if (free && input.jump() && (player.onGround || player.coyote > 0))
    {
        player.vel.y = JUMP_VEL; player.onGround = false; player.coyote = 0;
        playSfx('jump', player.pos, .6);
    }
    player.coyote = player.onGround ? .12 : max(0, (player.coyote || 0) - dt);
    player.glide = !player.onGround && player.vel.y < 0 && input.jumpHeld() && free;
    if (!activity || !activity.ownsPhysics)
    {
        player.vel.y -= GRAV * dt;
        if (player.glide) player.vel.y = max(player.vel.y, -2.1);
    }

    // move, one axis at a time so walls let you slide along them
    const feet = player.pos.y;
    const old = player.pos.copy();
    let nx = player.pos.x + player.vel.x * dt, nz = player.pos.z + player.vel.z * dt;
    const np = { x: nx, z: nz };
    pushOutOfSolids(np, feet);
    nx = np.x; nz = np.z;
    if (!walkable(nx, player.pos.z, feet)) nx = player.pos.x;
    if (!walkable(nx, nz, feet)) nz = player.pos.z;
    if (!walkable(nx, nz, feet)) { nx = old.x; nz = old.z; }
    let ny = player.pos.y + player.vel.y * dt;
    const g = groundInfo(nx, nz, max(ny, feet));
    if (ny <= g.y + .001 && player.vel.y <= 0)
    {
        const bounced = !player.onGround && player.airTime > .25 && landed(g.on);
        if (bounced) { ny = g.y; player.airTime = 0; } // landed() already launched us back up
        else { ny = g.y; player.vel.y = 0; player.onGround = true; player.standing = g.on; }
    }
    else if (player.onGround && ny - g.y < .4 && player.vel.y <= 0) { ny = g.y; player.vel.y = 0; player.standing = g.on; }
    else { player.onGround = false; player.standing = undefined; }
    player.airTime = player.onGround ? 0 : player.airTime + dt;
    player.pos = vec3(nx, ny, nz);
    player.speed = Math.hypot(player.vel.x, player.vel.z);
    if (player.onGround && player.zone === 'island' && insideIsland(nx, nz, 2)) player.lastSafe = player.pos.copy();
    // fell into the void: drift back up to safety
    if (player.pos.y < (player.zone === 'house' ? HOUSE_IN.y - 20 : -30) && !activity) driftBack();
    // footsteps
    if (player.onGround && player.speed > 1)
    {
        player.stepT = (player.stepT || 0) + dt * player.speed * .55;
        if (player.stepT > 1) { player.stepT = 0; playSfx(player.standing?.wood ? 'stepWood' : 'step', undefined, .35); }
    }
}
function landed(on)
{
    if (on && on.bounce)
    {
        player.bounceChain = (player.bounceChain || 0) + 1;
        player.vel.y = min(19, 12 + player.bounceChain * 1.4);
        player.onGround = false;
        on.squash = 1;
        playSfx('boing', player.pos, 1, 1 + min(player.bounceChain, 8) * .09);
        burst(player.pos.add(vec3(0, .1, 0)), hsl(on.hue || .85, .8, .7), 14, .08, .25);
        if (player.bounceChain > save.bounceBest) { save.bounceBest = player.bounceChain; writeSave(); }
        if (player.bounceChain >= 3) toast(`Bounce ×${player.bounceChain}`);
        return true;
    }
    player.bounceChain = 0;
    playSfx('land', undefined, .4);
    burst(player.pos.add(vec3(0, .05, 0)), hsl(.75, .3, .6, .6), 6, .03, .2);
}
function driftBack()
{
    fadeTransition(()=>
    {
        if (player.zone === 'house') player.pos = HOUSE_IN.add(vec3(0, .2, 0));
        else player.pos = player.lastSafe.add(vec3(0, .2, 0));
        player.vel = vec3();
        toast('The dream catches you and sets you back down');
    });
    player.vel = vec3(0, 0, 0);
    player.pos = vec3(player.pos.x, player.zone === 'house' ? HOUSE_IN.y - 19 : -29, player.pos.z);
}

// ---------------------------------------------------------------- camera
export function updateCamera()
{
    const dt = timeDelta;
    // orbit by dragging on the world, the right stick, or the wheel
    if (gameMode === 'play' && !activity?.lockCamera && !uiOpen())
    {
        if (mouseIsDown(0) && pointerOnCanvas && !activity?.mouseHold)
        {
            const d = mouseDeltaScreen;
            cam.yaw -= d.x * .0055;
            cam.pitch = clamp(cam.pitch + d.y * .0045, -.15, 1.25);
            if (d.length() > 0) cam.manualT = time;
        }
        const rs = gamepadStick(1);
        if (rs.length() > .1) { cam.yaw -= rs.x * dt * 2.4; cam.pitch = clamp(cam.pitch - rs.y * dt * 1.6, -.15, 1.25); cam.manualT = time; }
        if (keyIsDown('KeyZ')) { cam.yaw += dt * 1.8; cam.manualT = time; }
        if (keyIsDown('KeyC')) { cam.yaw -= dt * 1.8; cam.manualT = time; }
        if (mouseWheel) cam.distT = clamp(cam.distT + mouseWheel * .9, 3, 16);
    }
    cam.dist = mix(cam.dist, cam.distT, min(1, dt * 6));

    let target, dist = cam.dist, yaw = cam.yaw, pitch = cam.pitch, fov = PI / 3;
    if (activity && activity.cam)
    {
        const c = activity.cam();
        if (c.pos) // a fixed camera that looks at something
        {
            const R = render3D.camera;
            R.pos = R.pos.lerp(c.pos, min(1, dt * (c.snap || 4)));
            cam.look = cam.look.lerp(c.look, min(1, dt * (c.snap || 4)));
            R.lookAt(cam.look);
            R.fov = mix(R.fov, c.fov || PI / 3, min(1, dt * 4));
            return;
        }
        target = c.target; dist = c.dist ?? dist; yaw = c.yaw ?? yaw; pitch = c.pitch ?? pitch;
        if (c.yaw !== undefined) cam.yaw += wrapAngle(c.yaw - cam.yaw) * min(1, dt * 2.5), yaw = cam.yaw;
        if (c.pitch !== undefined) cam.pitch = mix(cam.pitch, c.pitch, min(1, dt * 2.5)), pitch = cam.pitch;
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
        if (player.speed > 1 && time - cam.manualT > 1.6 && gameMode === 'play')
        {
            const behind = player.yaw;
            cam.yaw += wrapAngle(behind - cam.yaw) * min(1, dt * .9);
        }
        yaw = cam.yaw; pitch = cam.pitch;
    }
    cam.look = cam.look.length() ? cam.look.lerp(target, min(1, dt * 10)) : target;
    // pull in so the ground never hides the mothling
    let d = dist;
    if (player.zone === 'island')
    {
        for (let i = 0; i < 6; i++)
        {
            const r = Math.cos(pitch) * d;
            const cx = cam.look.x + Math.sin(yaw) * r, cz = cam.look.z + Math.cos(yaw) * r;
            const cy = cam.look.y + Math.sin(pitch) * d;
            if (!insideIsland(cx, cz, -2) || cy > heightAt(cx, cz) + .6) break;
            d *= .82;
        }
    }
    render3D.camera.orbit(cam.look, d, yaw, pitch);
    render3D.camera.fov = mix(render3D.camera.fov, fov, min(1, dt * 4));
}

// ---------------------------------------------------------------- interaction prompts
const interactables = [];
export function addInteract(o)
{
    o.zone ||= 'island';
    o.r ||= 2;
    interactables.push(o);
    return o;
}
export let focusItem = null;
export function updateInteract()
{
    focusItem = null;
    if (gameMode !== 'play' || activity || uiOpen()) return;
    let best = 1e9;
    const fwd = vec3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    for (const it of interactables)
    {
        if (it.zone !== player.zone) continue;
        if (it.when && !it.when()) continue;
        const pos = typeof it.pos === 'function' ? it.pos() : it.pos;
        const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > it.r || abs(pos.y - player.pos.y) > (it.dy || 3)) continue;
        const facing = d > .01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
        const score = d - facing * .8 - (it.priority || 0);
        if (score < best) { best = score; focusItem = it; }
    }
    if (focusItem && input.act())
    {
        const it = focusItem;
        focusItem = null;
        it.act();
    }
}
