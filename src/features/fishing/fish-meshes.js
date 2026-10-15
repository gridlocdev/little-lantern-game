// Fish bodies, built from their shape and colors.
import { Mesh, PI, WHITE, buildMatrix, hsl, render3D, time, vec3 } from '../../platform/engine.js';
import { TAU } from '../../lib/math.js';
import { SPH, TORUS } from '../../player/part-meshes.js';

function fishMeshes(f)
{
    if (f.meshes) return f.meshes;
    const m = new Mesh(), g = new Mesh();
    const S = (target, pos, scale, color, rot)=> target.combine(SPH, buildMatrix(pos, rot, scale), color);
    const eyes = (x, y, z, s = .07)=> { for (const k of [-1, 1]) S(m, vec3(k * x, y, z), vec3(s), hsl(.7, .5, .08)); };
    switch (f.shape)
    {
        case 'slim':
            S(m, vec3(), vec3(.2, .26, 1), f.body);
            S(m, vec3(0, 0, .58), vec3(.03, .38, .32), f.fin);
            S(m, vec3(0, .15, .05), vec3(.02, .16, .32), f.fin);
            for (const k of [-1, 1]) S(g, vec3(k * .09, .02, 0), vec3(.02, .05, .72), f.glow);
            eyes(.07, .05, -.36, .06);
            break;
        case 'frill':
            S(m, vec3(0, 0, -.12), vec3(.3, .34, .7), f.body);
            for (const a of [-.45, 0, .45]) S(m, vec3(0, a * .5, .4), vec3(.03, .5, .55), f.fin, vec3(a, 0, 0));
            S(g, vec3(0, 0, .62), vec3(.04, .35, .1), f.glow);
            eyes(.1, .06, -.38, .07);
            break;
        case 'koi':
            S(m, vec3(), vec3(.3, .3, 1), f.body);
            S(m, vec3(0, 0, .6), vec3(.03, .44, .52), f.fin);
            S(m, vec3(0, .16, .05), vec3(.03, .18, .5), f.fin);
            for (const k of [-1, 1]) S(m, vec3(k * .18, -.08, -.2), vec3(.26, .02, .16), f.fin, vec3(0, k * .4, 0));
            for (let i = 0; i < 5; i++) S(m, vec3((i % 2 ? 1 : -1) * .1, .08 + (i % 3) * .02, -.25 + i * .14), vec3(.12, .08, .12), f.spots);
            for (const k of [-1, 1]) S(g, vec3(k * .06, -.04, -.5), vec3(.02, .02, .25), f.glow, vec3(.3, k * .5, 0));
            eyes(.11, .05, -.38, .06);
            break;
        case 'comet':
            S(m, vec3(), vec3(.25, .26, .8), f.body);
            S(m, vec3(0, 0, .45), vec3(.03, .34, .3), f.fin);
            S(g, vec3(0, 0, 1.0), vec3(.07, .07, 1.3), f.glow);
            S(g, vec3(0, .05, -.1), vec3(.27, .1, .5), f.glow.lerp(WHITE, .3));
            eyes(.09, .05, -.28, .06);
            break;
        case 'angler':
            S(m, vec3(), vec3(.62, .55, .72), f.body);
            S(m, vec3(0, -.12, -.3), vec3(.42, .16, .2), hsl(.75, .3, .1));
            S(m, vec3(0, 0, .42), vec3(.03, .38, .28), f.fin);
            for (let i = 0; i < 4; i++) S(m, vec3(0, .28 + i * .08, -.1 - i * .1), vec3(.025, .1, .025), f.fin);
            S(g, vec3(0, .62, -.55), vec3(.15), f.glow);
            eyes(.17, .1, -.28, .08);
            break;
        case 'puffer':
            S(m, vec3(), vec3(.7, .68, .74), f.body);
            for (let i = 0; i < 14; i++)
            {
                const d = vec3(Math.cos(i * 2.4) * Math.sin(i * .9 + 1), Math.cos(i * .9 + 1), Math.sin(i * 2.4) * Math.sin(i * .9 + 1)).normalize();
                S(m, d.scale(.36), vec3(.05, .05, .05), f.fin);
            }
            m.combine(TORUS, buildMatrix(vec3(), vec3(.35, 0, .2), vec3(1.25, .5, 1.25)), f.fin.lerp(WHITE, .3));
            S(m, vec3(0, 0, .4), vec3(.03, .26, .2), f.fin);
            eyes(.18, .1, -.3, .09);
            S(g, vec3(0, .2, -.25), vec3(.1, .05, .05), f.glow);
            break;
        case 'eel':
            for (let i = 0; i < 7; i++)
            {
                S(m, vec3(Math.sin(i * .9) * .05, 0, -.48 + i * .16), vec3(.13 - i * .008, .15 - i * .008, .26), f.body);
                if (i > 0) g.combine(TORUS, buildMatrix(vec3(Math.sin(i * .9) * .05, 0, -.48 + i * .16 - .08), vec3(PI / 2, 0, 0), vec3(.14, .14, .06)), f.glow);
            }
            S(m, vec3(0, .08, 0), vec3(.02, .06, .9), f.fin);
            eyes(.05, .03, -.55, .04);
            break;
        case 'ray':
            S(m, vec3(), vec3(1, .09, .68), f.body);
            S(m, vec3(0, .02, -.05), vec3(.38, .12, .4), f.body.lerp(WHITE, .15));
            S(m, vec3(0, 0, .7), vec3(.03, .03, .85), f.fin);
            for (const k of [-1, 1]) S(g, vec3(k * .3, .04, .04), vec3(.42, .02, .06), f.glow, vec3(0, k * -.6, 0));
            for (const k of [-1, 1]) S(g, vec3(k * .22, .02, .2), vec3(.3, .02, .05), f.fin, vec3(0, k * .5, 0));
            eyes(.1, .06, -.24, .05);
            break;
        case 'whale':
            S(m, vec3(), vec3(.46, .42, 1), f.body);
            S(m, vec3(0, -.1, -.05), vec3(.36, .24, .82), f.body.lerp(WHITE, .45));
            S(m, vec3(0, .02, .58), vec3(.56, .03, .2), f.fin);
            for (const k of [-1, 1]) S(m, vec3(k * .26, -.1, -.1), vec3(.3, .03, .14), f.fin, vec3(0, k * .5, k * .4));
            for (let i = 0; i < 8; i++) S(g, vec3(Math.sin(i * 2.1) * .14, .19, -.32 + i * .09), vec3(.035), f.glow);
            eyes(.17, .02, -.32, .06);
            break;
    }
    return f.meshes = { body: m, glow: g };
}
export function drawFish(f, matrix, alpha = 1, glowBoost = 1)
{
    const { body, glow } = fishMeshes(f);
    const c = alpha < 1 ? WHITE.withAlpha(alpha) : WHITE;
    render3D.drawMesh(body, matrix, undefined, c);
    const e = render3D.emissive;
    render3D.emissive = 1.3 * glowBoost * (f.shape === 'eel' ? .6 + .6 * (Math.sin(time * TAU) > .7 ? 1 : 0) : 1);
    render3D.drawMesh(glow, matrix, undefined, c);
    render3D.emissive = e;
}
