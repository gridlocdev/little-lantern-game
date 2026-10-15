// The rod, line and bobber.
import { EngineObject3D, PI, WHITE, clamp, hsl, min, render3D, time, vec3 } from '../../platform/engine.js';
import { drawFish } from './fish-meshes.js';
import { mtx } from '../../platform/mesh.js';
import { moth } from '../../player/mothling.js';
import { SPH, SPH_LO } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';

export class FishingRig extends EngineObject3D
{
    constructor(session) { super(vec3()); this.castShadow = false; this.session = session; }
    render3D()
    {
        const F = this.session();
        if (!F || !moth.rodTip) return;
        const tip = moth.rodTip;
        if (F.state !== 'aim' && F.state !== 'caught' && F.state !== 'done')
        {
            const b = F.bob;
            const sag = F.state === 'reel' ? .1 : .6;
            const pts = [];
            for (let i = 0; i <= 10; i++)
            {
                const t = i / 10;
                pts.push(tip.lerp(b, t).add(vec3(0, -Math.sin(t * PI) * sag, 0)));
            }
            for (let i = 0; i < 10; i++) render3D.drawLine(pts[i], pts[i + 1], .018, hsl(.6, .2, .85, .8));
            // the bobber: a little glowing moon on the water
            const m = mtx(undefined, b, vec3(F.tilt || 0, 0, 0));
            render3D.drawMesh(SPH, mtx(m, vec3(0, .06, 0), vec3(), vec3(.22)), undefined, hsl(.9, .6, .7));
            render3D.drawMesh(SPH, mtx(m, vec3(0, .15, 0), vec3(), vec3(.2, .1, .2)), undefined, WHITE);
            const e = render3D.emissive; render3D.emissive = 1.4;
            render3D.drawMesh(SPH_LO, mtx(m, vec3(0, .26, 0), vec3(), vec3(.07)), undefined, F.state === 'bite' ? hsl(.0, .9, .7) : hsl(.13, 1, .7));
            render3D.emissive = e;
        }
        if (F.flyFish)
        {
            const ff = F.flyFish, t = clamp(ff.t);
            const p = ff.from.lerp(ff.to, t).add(vec3(0, Math.sin(t * PI) * 1.8, 0));
            const s = ff.f.size[1] / 100 * .9 + .15;
            const yaw = Math.atan2(ff.to.x - ff.from.x, ff.to.z - ff.from.z);
            drawFish(ff.f, mtx(undefined, p, vec3(t * 6, yaw, Math.sin(time * 20) * .3), vec3(min(s, 1.1))));
        }
        if (F.holdFish)
        {
            const s = min(F.holdFish.sizeCm / 100 * .9 + .2, 1.1);
            const p = moth.handPos.lerp(moth.handL, .5).add(vec3(0, .25, 0));
            drawFish(F.holdFish.f, mtx(undefined, p, vec3(0, player.yaw + PI / 2, Math.sin(time * 9) * .15), vec3(s)));
        }
    }
    renderTransparent() {}
}
