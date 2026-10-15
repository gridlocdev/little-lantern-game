// The jar that shows the stardust you have collected: specks swirl inside and twinkle, and the more you have, the
// more of them there are and the brighter the jar glows.
import { EngineObject3D, Light3D, clamp, hsl, min, render3D, time, vec3 } from '../../platform/engine.js';
import { core } from '../../game/progress.js';
import { mtx } from '../../platform/mesh.js';
import { CYL, SPH_LO } from '../../player/part-meshes.js';

const FULL = 120;                       // stardust for a full, brightest jar
const speckCount = ()=> min(90, Math.round(core.stardust * .75));
// where speck i is now, and how brightly it twinkles (0..1, with a rare bright flash)
function speck(p, i, fill)
{
    const a = time * (.35 + (i % 7) * .07) + i * 2.4, r = .06 + (i % 5) * .028;
    const h = .06 + ((i * .37) % 1) * .5 * (.35 + fill * .65) + Math.sin(time * .8 + i) * .02;
    const tw = .5 + .5 * Math.sin(time * (2.2 + (i % 4) * .9) + i * 1.7);
    const flash = Math.max(0, Math.sin(time * (.9 + (i % 3) * .3) + i * 4.1)) ** 24;
    return { pos: p.add(vec3(Math.cos(a) * r, h, Math.sin(a) * r)), tw, flash };
}
const TINTS = [hsl(.13, .9, .8), hsl(.11, .7, .9), hsl(.55, .5, .9), hsl(.8, .4, .92)];   // gold, cream, ice, lilac

export class StardustJar extends EngineObject3D
{
    constructor(pos)
    {
        super(pos);
        this.castShadow = false;
        this.light = new Light3D(pos.add(vec3(0, .5, 0)), 4, hsl(.13, .8, .6), 0);
        new JarGlass(this);
    }
    render3D()
    {
        const p = this.pos3D, fill = clamp(core.stardust / FULL);
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .68, 0)), vec3(), vec3(.3, .1, .3)), undefined, hsl(.08, .4, .4));
        const e = render3D.emissive; render3D.emissive = .9;
        for (let i = 0, n = speckCount(); i < n; i++)
        {
            const s = speck(p, i, fill);
            render3D.drawMesh(SPH_LO, mtx(undefined, s.pos, vec3(), vec3(.014 + s.tw * .012 + s.flash * .02)), undefined, TINTS[i % 4]);
        }
        render3D.emissive = e;
        // the room light from the jar breathes a little, and grows as it fills
        this.light.intensity = core.stardust ? (.5 + fill * 1.6) * (.9 + Math.sin(time * 1.3) * .1) : 0;
    }
}

// the glass, a soft glow inside it and the twinkles, drawn see-through after everything solid
class JarGlass extends EngineObject3D
{
    constructor(jar) { super(jar.pos3D.copy()); this.jar = jar; this.transparent = true; this.castShadow = false; }
    render3D()
    {
        const p = this.jar.pos3D, fill = clamp(core.stardust / FULL);
        if (core.stardust)
        {
            render3D.drawSoftDisc(p.add(vec3(0, .3, 0)), .45 + fill * .3, hsl(.12, .8, .65, .06 + fill * .14 + Math.sin(time * 1.3) * .02));
            for (let i = 0, n = speckCount(); i < n; i++)
            {
                const s = speck(p, i, fill);
                if (s.tw > .75 || s.flash > .1) render3D.drawSoftDisc(s.pos, .05 + s.flash * .12, hsl(.13, .7, .85, (s.tw - .75) * 1.2 + s.flash * .7));
            }
        }
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .32, 0)), vec3(), vec3(.42, .64, .42)), undefined, hsl(.6, .3, .85, .18));
    }
}
