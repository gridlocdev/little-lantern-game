// The jar that shows the stardust you have collected.
import { EngineObject3D, Light3D, clamp, hsl, min, render3D, time, vec3 } from '../../platform/engine.js';
import { core } from '../../game/progress.js';
import { mtx } from '../../platform/mesh.js';
import { CYL, SPH_LO } from '../../player/part-meshes.js';

export class StardustJar extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = false; this.light = new Light3D(pos.add(vec3(0, .5, 0)), 4, hsl(.13, .8, .6), 0); }
    render3D()
    {
        const p = this.pos3D, fill = clamp(core.stardust / 120);
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .32, 0)), vec3(), vec3(.42, .64, .42)), undefined, hsl(.6, .3, .8, .35));
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .68, 0)), vec3(), vec3(.3, .1, .3)), undefined, hsl(.08, .4, .4));
        const e = render3D.emissive; render3D.emissive = 1.5;
        const n = min(40, core.stardust);
        for (let i = 0; i < n; i++)
        {
            const a = time * (.4 + (i % 5) * .1) + i * 2.4, r = .08 + (i % 4) * .03;
            render3D.drawMesh(SPH_LO, mtx(undefined, p.add(vec3(Math.cos(a) * r, .08 + ((i * .37) % 1) * .45 * (.3 + fill * .7), Math.sin(a) * r)), vec3(), vec3(.03)), undefined, hsl(.13, .9, .8));
        }
        render3D.emissive = e;
        this.light.intensity = core.stardust ? .6 + fill * 1.4 : 0;
    }
}
