// The star whale that circles the island.
import { EngineObject3D, Timer, buildSphere, hsl, rand, render3D, time, timeDelta, vec3 } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { mtx } from '../platform/mesh.js';
import { rr } from '../platform/random.js';

class StarWhale extends EngineObject3D
{
    constructor()
    {
        super(vec3());
        this.additive = true;
        this.castShadow = false;
        this.body = buildSphere(1, 20, 12, true);
        this.fin = buildSphere(1, 10, 6, true);
        this.angle = 2.2;
        this.dots = [];
        for (let i = 0; i < 26; i++) this.dots.push(vec3(rr(-.9, .9), rr(-.25, .35), rr(-.95, .95)).multiply(vec3(.35, .5, 1)));
        this.songTimer = new Timer(12);
    }
    update()
    {
        this.angle += timeDelta * .012;
        const r = 245, a = this.angle;
        this.pos3D = vec3(Math.cos(a) * r, 18 + Math.sin(a * 3) * 22, Math.sin(a) * r);
        this.yaw = -a; // swims tangent to the circle
        if (this.songTimer.elapsed())
        {
            this.songTimer.set(rand(28, 50));
            playSfx('whale', this.pos3D, .9);
        }
    }
    render3D()
    {
        const base = mtx(undefined, this.pos3D, vec3(Math.sin(time * .4) * .05, this.yaw, Math.sin(time * .3) * .06));
        const body = hsl(.58, .7, .55, .16), belly = hsl(.62, .6, .7, .1);
        render3D.drawMesh(this.body, mtx(base, vec3(), vec3(), vec3(14, 11, 44)), undefined, body);
        render3D.drawMesh(this.body, mtx(base, vec3(0, -3, -2), vec3(), vec3(10, 6, 34)), undefined, belly);
        const flap = Math.sin(time * .9) * .35;
        const tail = mtx(base, vec3(0, 0, 22), vec3(flap, 0, 0));
        render3D.drawMesh(this.fin, mtx(tail, vec3(0, 0, 6), vec3(), vec3(16, 1.2, 6)), undefined, body);
        for (const s of [-1, 1])
            render3D.drawMesh(this.fin, mtx(base, vec3(s * 9, -3, -6), vec3(0, s * .4, s * (.5 + flap * .4)), vec3(10, .8, 4)), undefined, body);
        for (const d of this.dots)
        {
            const p = base.transformPoint(vec3(d.x * 14, d.y * 11 + 2, d.z * 44));
            render3D.drawSoftDisc(p, 3.2 + Math.sin(time * 2 + d.x * 9) * .6, hsl(.55, .5, .9, .55));
        }
    }
}
export let whale;
const spawnWhale = ()=> { whale = new StarWhale; };

export const whaleSystem = { build: spawnWhale };
