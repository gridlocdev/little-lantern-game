// The orbit camera that follows the mothling, or whatever an activity points it at.
import {
    PI, clamp, gamepadStick, keyIsDown, min, mouseDeltaScreen, mouseIsDown, mouseWheel, render3D, time, timeDelta,
    timeReal, vec3,
} from '../platform/engine.js';
import { activity } from '../game/activity.js';
import { state } from '../game/state.js';
import { mix, wrapAngle } from '../lib/math.js';
import { pointerOnCanvas } from '../platform/input.js';
import { player } from '../player/player.js';
import { uiOpen } from '../ui/dom.js';
import { HOUSE_IN, insideIsland } from '../world/layout.js';
import { heightAt } from '../world/terrain.js';

export const cam = { yaw: 0, pitch: .3, dist: 7, distT: 7, manualT: -99, look: vec3(), fov: PI / 3, house: false };

// ---------------------------------------------------------------- camera
function updateCamera()
{
    const dt = timeDelta;
    // orbit by dragging on the world, the right stick, or the wheel
    if (state.mode === 'play' && !activity.current?.lockCamera && !uiOpen())
    {
        if (mouseIsDown(0) && pointerOnCanvas && !activity.current?.mouseHold)
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
    if (activity.current && activity.current.cam)
    {
        const c = activity.current.cam();
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
        if (player.speed > 1 && time - cam.manualT > 1.6 && state.mode === 'play')
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
export const camNear = (p, d)=> render3D.camera.pos.distanceSquared(p) < d * d;

export const cameraSystem = {
    // the title screen slowly circles the island
    updatePost() { state.mode === 'title' ? render3D.camera.orbit(vec3(0, -6, 0), 175, timeReal * .03 + 2.2, .32) : updateCamera(); },
};
