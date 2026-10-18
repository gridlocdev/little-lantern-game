// The star cat, asleep in a different place each time.
import { EngineObject3D, PI, hsl, max, rand, randInt, render3D, time, timeDelta, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { hin } from './plan.js';
import { save } from './save.js';
import { activity } from '../../game/activity.js';
import { writeSave } from '../../game/state.js';
import { TAU, wrapAngle } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { moth } from '../../player/mothling.js';
import { CONE, SPH, SPH_LO, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { focusCamera } from '../../render/camera.js';
import { burst } from '../../render/particles.js';
import { toast } from '../../ui/toast.js';
import { solidContains, solidTop, solidsAt } from '../../world/collision.js';

// the star cat, asleep in a different place each time
export const CAT_SPOTS = [vec3(.3, .05, .5), vec3(-2.6, .62, -1.25), vec3(3.6, 1, -2.2), vec3(4, .82, .2)];
const REACH = .72;          // how far from the cat the mothling stands to stroke it
const STROKE = 1.8;         // seconds of stroking
const SHOULDER = .66;       // the mothling's shoulder, above its feet
export class StarCat extends EngineObject3D
{
    constructor() { super(hin(CAT_SPOTS[0].x, CAT_SPOTS[0].y, CAT_SPOTS[0].z)); this.castShadow = true; this.purr = 0; this.spot = 0; this.yaw = 1; }
    moveTo(i)
    {
        this.spot = i % CAT_SPOTS.length;
        const s = CAT_SPOTS[this.spot];
        this.pos3D = hin(s.x, s.y, s.z);
        this.yaw = rand(TAU);
    }
    // the mothling steps up close, turns to the cat and strokes its back with her free hand; the cat mews and purrs
    pet()
    {
        if (activity.current) return;
        const c = this.pos3D, floorY = player.pos.y, from = player.pos.copy();
        const away = vec3(from.x - c.x, 0, from.z - c.z), far = away.length() || 1;
        // as close as reaching needs, unless furniture is in the way
        const blocked = (x, z)=> solidsAt(x, z).some((s)=> !s.floor && !s.platformOnly && solidContains(s, x, z, .28) && solidTop(s, x, z) > floorY + .25);
        let to = from;
        for (let d = REACH; d < far; d += .1) { const x = c.x + away.x / far * d, z = c.z + away.z / far * d; if (!blocked(x, z)) { to = vec3(x, floorY, z); break; } }
        let t = 0, stroking = false;
        const back = ()=> c.add(vec3(0, .36, 0));       // the cat's back, where the hand goes
        const end = ()=> { player.pose = 'free'; moth.petPitch = -1.3; moth.petLean = .15; activity.end(); };
        activity.start({
            name: 'pet', ownsPhysics: true, pinned: true,
            update: ()=>
            {
                t += timeDelta;
                const k = Math.min(1, t / .45);
                player.pos = from.lerp(to, k * k * (3 - 2 * k)); player.vel = vec3(); player.speed = 0;
                const d = vec3(c.x - player.pos.x, 0, c.z - player.pos.z);
                player.yaw += wrapAngle(Math.atan2(-d.x, -d.z) - player.yaw) * Math.min(1, timeDelta * 10);
                // aim the free arm from the shoulder at the cat's back: down to the rug, out to a shelf
                const dy = back().y - (player.pos.y + SHOULDER), h = Math.max(.25, d.length() - .25);
                moth.petPitch = -(PI / 2 + Math.atan2(dy, h));
                moth.petLean = dy < -.3 ? .32 : .12;
                if (k >= 1 && !stroking) { stroking = true; player.pose = 'pet'; this.stroked(); }
                if (t > .45 + STROKE) end();
            },
            cancel: end,
        });
    }
    stroked()
    {
        this.purr = 3;
        playSfx('meow', this.pos3D, .3, rand(.95, 1.08));
        focusCamera(this.pos3D.add(vec3(0, .4, 0)), { pull: .5, zoom: .78, dur: 2.2 });
        setTimeout(()=> playSfx('purr', this.pos3D, 1), 600);
        burst(this.pos3D.add(vec3(0, .5, 0)), hsl(.13, .9, .75), 10, .03, .12);
        save.cat++; writeSave();
        if (save.cat === 1) toast('The star cat purrs. Little stars drift off its back.');
        else if (rand() < .25) setTimeout(()=> { toast('The cat stretches, wanders off, and curls up somewhere else.'); this.moveTo(this.spot + 1 + randInt(2)); playSfx('meow', this.pos3D, .2, 1.1); }, 3200);
    }
    update() { this.purr = max(0, this.purr - timeDelta); }
    render3D()
    {
        if (player.zone !== 'house') return;
        const m = mtx(undefined, this.pos3D, vec3(0, this.yaw, 0));
        const fur = hsl(.7, .4, .2), breathe = 1 + Math.sin(time * 2) * .03 + this.purr * .01 * Math.sin(time * 40);
        render3D.drawMesh(SPH, mtx(m, vec3(0, .2, 0), vec3(), vec3(.7 * breathe, .4 * breathe, .55)), undefined, fur);
        render3D.drawMesh(SPH, mtx(m, vec3(-.32, .26, -.15), vec3(0, .4, 0), vec3(.32, .28, .3)), undefined, fur);
        for (const s of [-1, 1]) render3D.drawMesh(CONE, mtx(m, vec3(-.36 + s * .02, .44, -.15 + s * .1), vec3(0, 0, .2 * s + (this.purr ? Math.sin(time * 10) * .1 : 0)), vec3(.1, .14, .08)), undefined, fur);
        const tail = Math.sin(time * (this.purr ? 4 : 1)) * .3;
        render3D.drawMesh(TORUS, mtx(m, vec3(.1, .08, .15), vec3(0, tail, 0), vec3(.75, .5, .55)), undefined, fur);
        const e = render3D.emissive; render3D.emissive = 1.2;
        for (let i = 0; i < 7; i++) render3D.drawMesh(SPH_LO, mtx(m, vec3(Math.sin(i * 2.3) * .25, .38 + (i % 3) * .02, Math.cos(i * 1.7) * .2), vec3(), vec3(.035)), undefined, hsl(.13, .9, .85));
        if (this.purr > 0) for (const s of [-1, 1]) render3D.drawMesh(SPH_LO, mtx(m, vec3(-.46, .3, -.15 + s * .08), vec3(), vec3(.04, .015, .04)), undefined, hsl(.55, .8, .8));
        render3D.emissive = e;
    }
}
