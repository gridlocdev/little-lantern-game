// Shooting stars.
import { EngineObject3D, PI, hsl, max, min, rand, render3D, timeDelta, vec3 } from '../platform/engine.js';
import { TAU } from '../lib/math.js';

const skyEvents = [];
export class ShootingStar extends EngineObject3D
{
    // falling ones land on the island and leave a fallen star to collect
    constructor(target, onLand)
    {
        super(vec3());
        this.additive = true; this.castShadow = false;
        this.target = target;
        this.onLand = onLand;
        this.life = 0;
        if (target)
        {
            const dir = vec3(rand(-1, 1), 0, rand(-1, 1)).normalize();
            this.start = target.add(dir.scale(160)).add(vec3(0, 190, 0));
            this.end = target;
            this.duration = 2.6;
        }
        else
        {
            const a = rand(TAU), el = rand(.25, .7);
            const d = vec3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
            const side = vec3(-d.z, rand(-.4, -.1), d.x).normalize();
            this.rel = true;
            this.start = d.scale(650);
            this.end = this.start.add(side.scale(rand(160, 260)));
            this.duration = rand(.9, 1.6);
        }
    }
    update()
    {
        this.life += timeDelta / this.duration;
        if (this.life >= 1)
        {
            if (this.target) this.onLand?.(this.target);
            this.destroy();
        }
    }
    render3D()
    {
        const t = this.life, o = this.rel ? render3D.camera.pos : vec3();
        const head = this.start.lerp(this.end, t).add(o);
        const tail = this.start.lerp(this.end, max(0, t - .22)).add(o);
        const fade = Math.sin(min(1, t * 1.2) * PI) * .9 + .1;
        const w = this.rel ? 1.6 : .9;
        render3D.drawRibbon([tail, tail.lerp(head, .7), head], [0, w * .6, w], undefined,
            [hsl(.6, .6, .9, 0), hsl(.6, .6, .9, .5 * fade), hsl(.12, .5, 1, fade)]);
        render3D.drawSoftDisc(head, this.rel ? 9 : 3.5, hsl(.12, .4, 1, fade));
    }
}
