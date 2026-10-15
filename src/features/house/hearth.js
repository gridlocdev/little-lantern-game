// The fire in the hearth.
import { EngineObject3D, hsl, rand, render3D, time, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { furniture, houseState } from './room-state.js';
import { player } from '../../player/player.js';

// the fire in the hearth
export class HearthFire extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = false; this.additive = true; this.nextCrackle = 0; }
    update()
    {
        const on = houseState.fire;
        furniture.fireLight.intensity = on ? 2.1 + Math.sin(time * 9) * .25 + Math.sin(time * 23) * .15 : .35;
        if (on && player.zone === 'house' && time > this.nextCrackle) { this.nextCrackle = time + rand(.2, 1.4); playSfx('crackle', this.pos3D, rand(.2, .5)); }
    }
    render3D()
    {
        const on = houseState.fire ? 1 : .25;
        for (let i = 0; i < 6; i++)
        {
            const x = (i - 2.5) * .18, h = (.5 + Math.sin(time * 7 + i * 2) * .15) * on;
            render3D.drawSoftDisc(this.pos3D.add(vec3(x, h * .5, 0)), h * 1.3, hsl(.06 + i * .01, 1, .55, .8));
        }
        render3D.drawSoftDisc(this.pos3D.add(vec3(0, .25, 0)), 1.6 * on, hsl(.08, 1, .5, .4));
    }
}
