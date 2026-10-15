// Released fish swim up and become stars.
import { EngineObject3D, PI, Trail3D, clamp, rand, timeDelta, vec3 } from '../../platform/engine.js';
import { drawFish } from './fish-meshes.js';
import { TAU } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { burst } from '../../render/particles.js';

// released fish swim up and become stars
export class SkyFish extends EngineObject3D
{
    constructor(f, pos)
    {
        super(pos.copy());
        this.f = f; this.start = pos.copy(); this.t = 0;
        this.castShadow = false;
        this.trail = new Trail3D(pos.copy(), 1.6, .25, undefined, f.glow.withAlpha(.8), f.glow.withAlpha(0), true);
        this.addChild(this.trail);
        this.dir = rand(TAU);
    }
    update()
    {
        this.t += timeDelta;
        const t = this.t;
        const r = 1 + t * .8, a = this.dir + t * 2;
        this.pos3D = this.start.add(vec3(Math.cos(a) * r, t * t * 1.4 + t * 2, Math.sin(a) * r));
        if (t > 9) { burst(this.pos3D, this.f.glow, 10, .03, .3); this.destroy(); }
    }
    render3D()
    {
        const t = this.t, a = this.dir + t * 2;
        const s = clamp(1 - (t - 6) / 3) * .7;
        if (s <= 0) return;
        const yaw = Math.atan2(-Math.sin(a), -Math.cos(a)) + PI / 2;
        drawFish(this.f, mtx(undefined, this.pos3D, vec3(-.6, yaw, Math.sin(t * 8) * .2), vec3(s)), 1, 1 + t * .3);
    }
}
