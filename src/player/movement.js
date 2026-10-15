// Walking, running, jumping, gliding and landing.
import { hsl, max, min, render3D, timeDelta, vec2, vec3 } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { activity } from '../game/activity.js';
import { state } from '../game/state.js';
import { mix, wrapAngle } from '../lib/math.js';
import { input } from '../platform/input.js';
import { Mothling, setMoth } from './mothling.js';
import { player } from './player.js';
import { cam, kickCamera } from '../render/camera.js';
import { burst } from '../render/particles.js';
import { uiOpen } from '../ui/dom.js';
import { fadeTransition } from '../ui/fade.js';
import { toast } from '../ui/toast.js';
import { groundInfo, pushOutOfSolids, walkable } from '../world/ground.js';
import { HOUSE_IN, P, insideIsland } from '../world/layout.js';
import { heightAt } from '../world/terrain.js';

const GRAV = 22;
const JUMP_VEL = 8.6; // apex about 1.7 m, enough to land on the low mushroom caps
function updatePlayer()
{
    const dt = timeDelta;
    const free = state.mode === 'play' && !activity.current && !uiOpen();
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
    if (!activity.current || !activity.current.ownsPhysics)
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
    if (player.pos.y < (player.zone === 'house' ? HOUSE_IN.y - 20 : -30) && !activity.current) driftBack();
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
        kickCamera(.02 + min(player.bounceChain, 6) * .008);
        burst(player.pos.add(vec3(0, .1, 0)), hsl(on.hue || .85, .8, .7), 14, .08, .25);
        on.onBounce?.(player.bounceChain);
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

export const playerSystem = {
    // the mothling appears at the crossing, facing the pond
    buildLate()
    {
        player.pos = vec3(P.spawn.x, heightAt(P.spawn.x, P.spawn.z), P.spawn.z);
        player.lastSafe = player.pos.copy();
        player.yaw = Math.atan2(-(P.pond.x - P.spawn.x), -(P.pond.z - P.spawn.z));
        cam.yaw = player.yaw; cam.pitch = .28;
        setMoth(new Mothling);
    },
    update: updatePlayer,
    updatePost() { render3D.shadowCenter = player.pos.add(vec3(0, 1, 0)); },
};
