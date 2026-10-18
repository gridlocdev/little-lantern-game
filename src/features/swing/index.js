// The Moonwillow swing: pump to swing higher, let go at the top to glide.
import {
    EngineObject3D, Matrix4, Mesh, PI, abs, buildCylinder, buildMatrix, buildSphere, clamp, hsl, max,
    render3D, time, timeDelta, vec3,
} from '../../platform/engine.js';
import { bell, playSfx } from '../../audio/sfx.js';
import { Moonwillow } from './moonwillow.js';
import { activity } from '../../game/activity.js';
import { addInteract } from '../../game/interact.js';
import { state, writeSave } from '../../game/state.js';
import { clearTouchPresses, input } from '../../platform/input.js';
import { mtx, obj3 } from '../../platform/mesh.js';
import { BOXM, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { sparkleColumn } from '../../render/particles.js';
import { addTodo } from '../../ui/journal.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { toast } from '../../ui/toast.js';
import { addClearing } from '../../world/clearings.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const save = state.slice('swing', { swingHigh: false, swingFlight: false });

let swingState = null;
const SWING = {};
function buildSwing()
{
    const x = P.swing.x, z = P.swing.z, y = heightAt(x, z);
    // the swing hangs from a long branch and swings toward the island's middle
    const toCenter = Math.atan2(-x, -z);
    SWING.dirYaw = toCenter;
    SWING.dir = vec3(Math.sin(toCenter), 0, Math.cos(toCenter)).normalize();
    SWING.side = vec3(SWING.dir.z, 0, -SWING.dir.x);
    const trunkPos = vec3(x, y, z).add(SWING.side.scale(-4.2));
    SWING.pivot = vec3(x, y + 7.2, z);
    SWING.len = 5.4;
    const bark = hsl(.78, .2, .2);
    const tree = new Mesh()
        .combine(buildCylinder(1.5, 8, 9, true), vec3(0, 4, 0), bark)
        .combine(buildCylinder(2.2, 1.2, 9, true), vec3(0, .5, 0), bark)
        .combine(buildSphere(7, 10, 8, false), vec3(1.5, 9.3, 0), hsl(.5, .35, .26))
        .combine(buildSphere(5.5, 10, 8, false), vec3(4.6, 9.8, 1.2), hsl(.82, .3, .3))
        .combine(buildSphere(5, 10, 8, false), vec3(-1.8, 10.2, -1.6), hsl(.55, .35, .3));
    const t = obj3(trunkPos, tree);
    t.rotation3D = vec3(0, Math.atan2(SWING.side.x, SWING.side.z) - PI / 2, 0);
    // the branch from the trunk out over the swing
    const branchEnd = SWING.pivot.add(SWING.side.scale(2.2)), branchStart = trunkPos.add(vec3(0, 6.8, 0));
    const bd = branchEnd.subtract(branchStart);
    const mid = branchStart.lerp(branchEnd, .5);
    const branch = obj3(mid, buildCylinder(.55, 1, 8, true), bark);
    branch.localMatrix = Matrix4.lookAt(mid, mid.add(bd)).multiply(buildMatrix(undefined, vec3(-PI / 2, 0, 0), vec3(1, bd.length() + .6, 1)));
    addSolid({ kind: 'circle', x: trunkPos.x, z: trunkPos.z, r: 1.1, top: 99 });
    new Moonwillow(trunkPos);
    new SwingSet();
    addInteract({ pos: vec3(x, y, z), r: 2.4, label: 'Sit on the swing', act: startSwing });
    PLACE_NAMES.push({ name: 'Moonwillow Swing', sub: 'lean in at the top of each swing', x, z, r: 9, zone: 'island' });
    addClearing(x, z, 17);
}
class SwingSet extends EngineObject3D
{
    constructor() { super(SWING.pivot.copy()); this.castShadow = true; }
    render3D()
    {
        const th = swingState ? swingState.angle : Math.sin(time * .8) * .04;
        const { pivot, dir, side, len } = SWING;
        const down = vec3(0, -1, 0).scale(Math.cos(th)).add(dir.scale(Math.sin(th)));
        const seat = pivot.add(down.scale(len));
        for (const s of [-.55, .55])
        {
            const top = pivot.add(side.scale(s)), bot = seat.add(side.scale(s));
            render3D.drawLine(top, bot, .05, hsl(.12, .3, .6));
        }
        const seatYaw = Math.atan2(dir.x, dir.z);
        render3D.drawMesh(BOXM, mtx(undefined, seat, vec3(th, seatYaw, 0), vec3(.5, .08, 1.3)).multiply(buildMatrix(undefined, vec3(0, PI / 2, 0))), undefined, hsl(.75, .2, .45));
        SWING.seat = seat;
        if (swingState && swingState.window > 0)
        {
            const e = render3D.emissive; render3D.emissive = 1;
            render3D.drawMesh(TORUS, mtx(undefined, seat.add(vec3(0, .1, 0)), vec3(), vec3(1.4 + swingState.window, .3, 1.4 + swingState.window)), undefined, hsl(.13, .9, .7, .6));
            render3D.emissive = e;
        }
    }
}
function startSwing()
{
    swingState = player.swing = { angle: 0, vel: 0, lastSign: 0, window: 0, peak: 0, high: false };
    player.pose = 'swing';
    player.yaw = SWING.dirYaw;
    activity.start({
        name: 'swing', ownsPhysics: true,
        update: updateSwing,
        cancel()
        {
            swingState = player.swing = null; activity.end(); player.pose = 'free'; player.extraPitch = 0;
        },
        hint: ()=> swingState.window > 0 ? '{use}|Lean in now!' : '{use}|Lean in at the top · {jump} lets go · {back} gets off',
        cam: ()=> ({ target: SWING.pivot.add(vec3(0, -3.2, 0)), dist: 13, yaw: Math.atan2(SWING.side.x, SWING.side.z), pitch: .12 }),
    });
}
function updateSwing()
{
    const S = swingState, dt = timeDelta;
    const g = 9.8 / SWING.len;
    S.vel += -g * Math.sin(S.angle) * dt;
    S.vel *= 1 - dt * .06;
    S.angle += S.vel * dt;
    const sign = Math.sign(S.vel);
    if (sign !== S.lastSign && S.lastSign !== 0)
    {
        S.window = .32; // just reached a turning point
        S.peak = abs(S.angle);
        playSfx('creak', SWING.pivot, .5, .9 + S.peak * .2);
    }
    S.lastSign = sign || S.lastSign;
    S.window = max(0, S.window - dt);
    if (input.act())
    {
        if (S.window > 0 || abs(S.angle) < .03)
        {
            const kick = abs(S.angle) < .03 ? 1.1 : .55 + (1.45 - abs(S.angle)) * .25;
            S.vel += (S.angle > 0 ? -1 : S.angle < 0 ? 1 : 1) * kick;
            S.window = 0;
            playSfx('whoosh', player.pos, .4, 1.4);
        }
        else S.vel *= .93;
    }
    S.angle = clamp(S.angle, -1.5, 1.5);
    if (!S.high && S.peak > 1.15)
    {
        S.high = true;
        save.swingHigh = true; writeSave();
        toast('So high you could touch the moon!');
        sparkleColumn(SWING.seat, hsl(.13, .9, .75), 40, 3);
        [0, 4, 7, 11, 14].forEach((n, i)=> setTimeout(()=> bell(n + 12, undefined, .4), i * 90));
    }
    // seat the mothling, tilted with the swing
    const { pivot, dir, len } = SWING;
    const down = vec3(0, -1, 0).scale(Math.cos(S.angle)).add(dir.scale(Math.sin(S.angle)));
    const seat = pivot.add(down.scale(len));
    player.pos = seat.add(vec3(0, .02, 0));
    player.extraPitch = S.angle;
    player.vel = vec3();
    if (input.jump() && abs(S.vel) < .45 && abs(S.angle) < .25)
    {
        endSwing(false);
        player.pos = seat.add(SWING.dir.scale(-1.2)).add(vec3(0, .5, 0));
        clearTouchPresses();
        return;
    }
    if (input.jump())
    {
        // let go: fly along the swing's path, wings open
        const tangent = vec3(0, -1, 0).scale(-Math.sin(S.angle)).add(dir.scale(Math.cos(S.angle)));
        const speed = S.vel * len;
        player.vel = tangent.scale(speed).add(vec3(0, 2.5, 0));
        if (abs(S.angle) > .9 && S.vel * S.angle > -0.2 && player.vel.y > 0)
        {
            save.swingFlight = true; writeSave();
            toast('Wheee! Hold jump to glide.');
        }
        endSwing(true);
        clearTouchPresses();
        return;
    }
    if (input.back())
    {
        endSwing(false);
        player.pos = seat.add(SWING.dir.scale(-1.2)).add(vec3(0, .5, 0));
    }
}
function endSwing(fly)
{
    swingState = player.swing = null; activity.end();
    player.pose = 'free'; player.extraPitch = 0;
    player.onGround = false;
    if (!fly) player.vel = vec3();
}

export const swingFeature = {
    build()
    {
        buildSwing();
        addTodo(30, 'Swing high enough to touch the moon', ()=> save.swingHigh);
        addTodo(40, 'Let go of the swing at the very top and glide', ()=> save.swingFlight);
    },
};
