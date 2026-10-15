// The star cat, asleep in a different place each time.
import { EngineObject3D, hsl, max, rand, randInt, render3D, time, timeDelta, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { hin } from './plan.js';
import { save } from './save.js';
import { writeSave } from '../../game/state.js';
import { TAU } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { moth } from '../../player/mothling.js';
import { CONE, SPH, SPH_LO, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { burst } from '../../render/particles.js';
import { toast } from '../../ui/toast.js';

// the star cat, asleep in a different place each time
export const CAT_SPOTS = [vec3(.3, .05, .5), vec3(-2.6, .62, -1.25), vec3(3.6, 1, -2.2), vec3(4, .82, .2)];
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
    pet()
    {
        this.purr = 3;
        moth.reach = 1.5;
        playSfx('purr', this.pos3D, 1);
        burst(this.pos3D.add(vec3(0, .5, 0)), hsl(.13, .9, .75), 10, .03, .12);
        save.cat++; writeSave();
        if (save.cat === 1) toast('The star cat purrs. Little stars drift off its back.');
        else if (rand() < .25) setTimeout(()=> { toast('The cat stretches, wanders off, and curls up somewhere else.'); this.moveTo(this.spot + 1 + randInt(2)); }, 3200);
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
