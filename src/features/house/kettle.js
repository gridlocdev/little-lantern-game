// The kettle, and tea.
import { EngineObject3D, PI, hsl, rand, render3D, timeDelta, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { houseState } from './room-state.js';
import { save } from './save.js';
import { writeSave } from '../../game/state.js';
import { mtx } from '../../platform/mesh.js';
import { moth } from '../../player/mothling.js';
import { CYL, SPH, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { burst } from '../../render/particles.js';
import { toast } from '../../ui/toast.js';

export class Kettle extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = true; }
    update()
    {
        if (houseState.kettle > 0 && !houseState.kettleReady)
        {
            houseState.kettle += timeDelta;
            if (rand() < timeDelta * houseState.kettle * 2) burst(this.pos3D.add(vec3(.2, .35, 0)), hsl(0, 0, .9, .35), 2, .02, .25, 1.5, .001, false);
            if (houseState.kettle > 4)
            {
                houseState.kettleReady = true;
                playSfx('whistle', this.pos3D, .8);
                if (player.zone === 'house') toast('The kettle whistles.');
            }
        }
        else if (houseState.kettleReady && rand() < timeDelta * 4) burst(this.pos3D.add(vec3(.2, .35, 0)), hsl(0, 0, .9, .3), 1, .02, .3, 1.5, .001, false);
    }
    render3D()
    {
        const m = mtx(undefined, this.pos3D, vec3(0, .4, 0));
        const c = hsl(.55, .35, .5);
        render3D.drawMesh(SPH, mtx(m, vec3(), vec3(), vec3(.5, .4, .5)), undefined, c);
        render3D.drawMesh(CYL, mtx(m, vec3(.27, .05, 0), vec3(0, 0, -.9), vec3(.07, .3, .07)), undefined, c);
        render3D.drawMesh(TORUS, mtx(m, vec3(0, .26, 0), vec3(PI / 2, 0, 0), vec3(.3, .3, .2)), undefined, hsl(.75, .2, .2));
    }
}
export function drinkTea()
{
    if (!houseState.cupFull) return;
    houseState.cupFull = false;
    player.pose = 'cup';
    playSfx('sip', player.pos, .8);
    setTimeout(()=> playSfx('sip', player.pos, .7, 1.1), 500);
    setTimeout(()=>
    {
        player.pose = 'free'; player.hold = 'lantern';
        save.tea++; writeSave();
        moth.warm = 30;
        toast('Warm all the way down to your wings.');
    }, 1300);
}
