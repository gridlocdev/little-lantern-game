// Ripples on the water.
import { EngineObject3D, render3D, timeDelta, vec3 } from '../../platform/engine.js';
import { TAU } from '../../lib/math.js';

// rings on the water, or in the air off the pier
const ripples = [];
export function ripple(pos, color, scale = 1) { ripples.push({ pos: pos.copy(), color, t: 0, scale }); }
export class RippleDrawer extends EngineObject3D
{
    constructor() { super(vec3()); this.additive = true; this.castShadow = false; }
    update() { for (let i = ripples.length; i--;) if ((ripples[i].t += timeDelta) > 1.6) ripples.splice(i, 1); }
    render3D()
    {
        for (const r of ripples)
        {
            const rad = (.2 + r.t * 1.1) * r.scale, a = (1 - r.t / 1.6) * .8;
            const pts = [], side = [];
            for (let i = 0; i <= 24; i++)
            {
                const ang = i / 24 * TAU, d = vec3(Math.cos(ang), 0, Math.sin(ang));
                pts.push(r.pos.add(d.scale(rad)).add(vec3(0, .03, 0)));
                side.push(d);
            }
            render3D.drawRibbon(pts, .06, undefined, r.color.withAlpha(a), side);
        }
    }
}
