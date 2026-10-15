// The moonflower on the windowsill, which grows when watered.
import { EngineObject3D, Light3D, buildMatrix, hsl, min, render3D, time, vec3 } from '../../platform/engine.js';
import { furniture } from './room-state.js';
import { save } from './save.js';
import { core } from '../../game/progress.js';
import { writeSave } from '../../game/state.js';
import { TAU } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { moth } from '../../player/mothling.js';
import { CYL, SPH_LO } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { burst } from '../../render/particles.js';
import { say } from '../../ui/dialog.js';
import { toast } from '../../ui/toast.js';

export class Moonflower extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = true; this.shown = save.flower; this.light = new Light3D(pos.add(vec3(0, 3.4, .4)), 4, hsl(.55, .8, .7), 0); }
    sync() { this.shown = save.flower; }
    render3D()
    {
        const p = this.pos3D.add(vec3(0, 2.5, 0)), st = this.shown;
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .15, 0)), vec3(), vec3(.45, .3, .45)), undefined, hsl(.04, .45, .45));
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .29, 0)), vec3(), vec3(.4, .02, .4)), undefined, hsl(.07, .3, .2));
        if (st < 1) return;
        const h = .2 + st * .18;
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .3 + h / 2, 0)), vec3(0, 0, Math.sin(time) * .04), vec3(.04, h, .04)), undefined, hsl(.4, .45, .4));
        for (let k = 0; k < min(st, 3) * 2; k++)
            render3D.drawMesh(SPH_LO, mtx(undefined, p.add(vec3(0, .35 + k * .08, 0)), vec3(0, k * 2.2, .7), vec3(.22, .03, .1)).multiply(buildMatrix(vec3(.5, 0, 0))), undefined, hsl(.38, .5, .45));
        const e = render3D.emissive;
        render3D.emissive = st >= 4 ? 1.4 + Math.sin(time * 2) * .2 : .4;
        const bloom = st >= 4 ? 1 : st === 3 ? .45 : 0;
        if (bloom > 0)
            for (let k = 0; k < 6; k++)
                render3D.drawMesh(SPH_LO, mtx(undefined, p.add(vec3(0, .3 + h + .05, 0)), vec3(.3 * (1 - bloom), k / 6 * TAU, .5 * bloom + .2), vec3(.22 * bloom + .05, .03, .1)).multiply(buildMatrix(vec3(.6, 0, 0))), undefined, hsl(.56, .7, .82));
        render3D.drawMesh(SPH_LO, mtx(undefined, p.add(vec3(0, .32 + h, 0)), vec3(), vec3(.09 + bloom * .05)), undefined, hsl(.13, .9, .8));
        render3D.emissive = e;
        this.light.intensity = st >= 4 ? 1.3 : 0;
    }
}
export function waterFlower()
{
    if (save.flower >= 4) return say('The moonflower', 'It is in full bloom and glowing like a small, polite moon.');
    if (save.flowerWatered === core.visits) return toast('Already watered. It grows a little each time you come home.');
    save.flowerWatered = core.visits;
    save.flower++;
    writeSave();
    player.hold = 'can';
    moth.reach = 1;
    setTimeout(()=> { player.hold = 'lantern'; furniture.flower.sync(); burst(furniture.flower.pos3D.add(vec3(0, 3, 0)), hsl(.45, .7, .7), 12, .03, .15); }, 900);
    toast(['A tiny sprout pokes up.', 'It has leaves now.', 'A bud, glowing faintly.', 'It blooms! The whole room turns a little blue.'][save.flower - 1]);
}
