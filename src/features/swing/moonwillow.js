// The Moonwillow tree the swing hangs from.
import { EngineObject3D, hsl, render3D, time, vec3 } from '../../platform/engine.js';
import { TAU } from '../../lib/math.js';
import { rr } from '../../platform/random.js';
import { camNear } from '../../render/camera.js';

export class Moonwillow extends EngineObject3D
{
    constructor(base)
    {
        super(base.copy());
        this.castShadow = false;
        this.fronds = [];
        for (let i = 0; i < 46; i++)
        {
            const a = rr(0, TAU), r = rr(1.5, 6.5);
            this.fronds.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: rr(7.6, 9.4), len: rr(2.5, 5.5), ph: rr(0, TAU), hue: rr(0, 1) < .5 ? .5 : .85 });
        }
    }
    render3D()
    {
        const b = this.pos3D;
        if (!camNear(b, 110)) return;
        for (const f of this.fronds)
        {
            const pts = [];
            for (let k = 0; k <= 5; k++)
            {
                const t = k / 5;
                const sway = Math.sin(time * 1.1 + f.ph + t * 2) * .35 * t;
                pts.push(b.add(vec3(f.x + sway, f.y - t * f.len, f.z + sway * .6)));
            }
            const c = hsl(f.hue, .55, .5);
            render3D.drawRibbon(pts, [.05, .1, .12, .1, .07, .03], undefined, c);
        }
    }
}
