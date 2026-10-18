// The fire in the hearth: logs on an iron grate over a bed of embers, with low-poly flames licking up between them
// and now and then a spark. Let it burn low and the flames shrink to a flicker while the embers keep glowing.
import { EngineObject3D, PI, hsl, rand, render3D, time, timeDelta, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { furniture, houseState } from './room-state.js';
import { mtx } from '../../platform/mesh.js';
import { CONE, CYL, SPH_LO, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { burst } from '../../render/particles.js';

const IRON = hsl(.62, .06, .1), BARK = hsl(.05, .3, .09), CUT = hsl(.07, .3, .24);     // dark: the fire's light is close
// [x, y, z, yaw]: two logs side by side and one across them
const LOGS = [[-.02, .19, -.08, .12], [.03, .19, .09, -.1], [0, .31, 0, PI / 2 - .35]];
const hash = (i)=> { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };     // 0..1, fixed per i

// the solid things: grate, logs, and the trivet the kettle stands on
export class HearthLogs extends EngineObject3D
{
    constructor(pos, kettle) { super(pos); this.castShadow = false; this.kettle = kettle; }
    render3D()
    {
        if (player.zone !== 'house') return;
        const draw = (mesh, m, c)=> render3D.drawMesh(mesh, m, undefined, c);
        const m = mtx(undefined, this.pos3D, vec3());
        for (const z of [-.13, .13])
        {
            draw(CYL, mtx(m, vec3(0, .1, z), vec3(0, 0, PI / 2), vec3(.03, .9, .03)), IRON);
            for (const x of [-.38, .38]) draw(CYL, mtx(m, vec3(x, .05, z), vec3(), vec3(.03, .1, .03)), IRON);
        }
        for (const [x, y, z, yaw] of LOGS)
        {
            const log = mtx(m, vec3(x, y, z), vec3(0, yaw, PI / 2));
            draw(CYL, mtx(log, vec3(), vec3(), vec3(.15, .78, .15)), BARK);
            for (const e of [-.39, .39]) draw(CYL, mtx(log, vec3(0, e, 0), vec3(), vec3(.13, .02, .13)), CUT);    // the sawn ends
        }
        // a little three-legged trivet under the kettle, standing on the hearth
        const k = mtx(undefined, this.kettle, vec3());
        draw(TORUS, mtx(k, vec3(0, -.2, 0), vec3(), vec3(.22, .25, .22)), IRON);
        for (let i = 0; i < 3; i++)
        {
            const a = i / 3 * PI * 2;
            draw(CYL, mtx(k, vec3(Math.cos(a) * .2, -.32, Math.sin(a) * .2), vec3(Math.sin(a) * .15, 0, -Math.cos(a) * .15), vec3(.025, .26, .025)), IRON);
        }
    }
}

// the glowing part: embers, flames and sparks, drawn additively so they light up
export class HearthFire extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = false; this.additive = true; this.nextCrackle = 0; }
    update()
    {
        const on = houseState.fire;
        furniture.fireLight.intensity = on ? 2.1 + Math.sin(time * 9) * .25 + Math.sin(time * 23) * .15 : .35;
        if (!on || player.zone !== 'house') return;
        if (time > this.nextCrackle) { this.nextCrackle = time + rand(.2, 1.4); playSfx('crackle', this.pos3D, rand(.2, .5)); }
        if (rand() < timeDelta * 2.5) burst(this.pos3D.add(vec3(rand(-.25, .25), .5, rand(-.08, .08))), hsl(.09, 1, .7), 1, .018, .05, .9);
    }
    render3D()
    {
        if (player.zone !== 'house') return;
        const on = houseState.fire ? 1 : 0, t = time;
        const draw = (mesh, m, c)=> render3D.drawMesh(mesh, m, undefined, c);
        const m = mtx(undefined, this.pos3D, vec3());
        const e = render3D.emissive;
        // the ember bed, breathing brighter and dimmer
        render3D.emissive = .9 + on * .4;
        for (let i = 0; i < 11; i++)
        {
            const glow = .55 + .45 * Math.sin(t * (1.3 + hash(i)) + i * 2.1);
            draw(SPH_LO, mtx(m, vec3((hash(i + 3) - .5) * .75, .09, (hash(i + 7) - .5) * .28), vec3(0, i, 0), vec3(.12, .04, .1)),
                hsl(.01 + glow * .04, 1, .22 + glow * .14));
        }
        // flames: low-poly teardrops, a round base and a short point, orange with a yellow core, each with its own height,
        // flicker and lean
        render3D.emissive = 1.25;
        const count = on ? 7 : 3;
        for (let i = 0; i < count; i++)
        {
            const r = hash(i + 11), x = (i / (count - 1 || 1) - .5) * (on ? .62 : .3) + (r - .5) * .05, z = (i % 2 ? .05 : -.05);
            const flick = .85 + .2 * Math.sin(t * (7.5 + r * 3) + i * 1.9) + .08 * Math.sin(t * 21 + i * 3);
            const h = (on ? .2 + .2 * hash(i + 5) : .06 + .03 * r) * flick, w = (on ? .17 + .08 * r : .07) * (1.1 - flick * .1);
            const lean = Math.sin(t * 4.1 + i) * .12 + Math.sin(t * 9.3 + i * 2) * .05;
            const base = on ? .24 : .14;
            const f = mtx(m, vec3(x, base, z), vec3(0, t * .6 + i, lean));
            draw(SPH_LO, mtx(f, vec3(0, w * .35, 0), vec3(), vec3(w, w * .8, w)), hsl(.04 + r * .02, 1, .45, .85));
            draw(CONE, mtx(f, vec3(0, w * .4 + h / 2, 0), vec3(), vec3(w * .92, h, w * .92)), hsl(.045 + r * .02, 1, .45, .85));
            draw(SPH_LO, mtx(f, vec3(0, w * .3, 0), vec3(), vec3(w * .5, w * .45, w * .5)), hsl(.1, 1, .55));
            draw(CONE, mtx(f, vec3(0, w * .3 + h * .3, 0), vec3(), vec3(w * .48, h * .55, w * .48)), hsl(.1, 1, .55));
        }
        render3D.emissive = e;
    }
}
