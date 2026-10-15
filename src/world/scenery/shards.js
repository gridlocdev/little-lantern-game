// Crystal shards orbiting in the void.
import { InstancedMesh3D, buildMatrix, buildSphere, hsl, max, time, timeDelta, vec3 } from '../../platform/engine.js';
import { TAU } from '../../lib/math.js';
import { rr } from '../../platform/random.js';

// orbiting shards in the void
let shardSet; const shards = [];
function buildShards()
{
    const N = 70;
    shardSet = new InstancedMesh3D(buildSphere(1, 4, 2), N, undefined, hsl(.75, .6, .6));
    shardSet.emissive = .7; shardSet.castShadow = false;
    for (let i = 0; i < N; i++)
        shards.push({ r: rr(112, 260), h: rr(-120, 10), a: rr(0, TAU), sp: rr(.006, .02) * (rr(0, 1) < .5 ? 1 : -1), ph: rr(0, TAU), s: rr(.8, 4.5), spin: rr(.1, .5) });
}
function updateShards()
{
    for (let i = 0; i < shards.length; i++)
    {
        const s = shards[i];
        s.a += s.sp * timeDelta;
        const blink = Math.pow(max(0, Math.sin(time * .5 + s.ph)), 16);
        shardSet.setMatrixAt(i, buildMatrix(vec3(Math.cos(s.a) * s.r, s.h + Math.sin(time * .3 + s.ph) * 2, Math.sin(s.a) * s.r),
            vec3(time * s.spin, time * s.spin * .7 + s.ph, 0), vec3(s.s * .6, s.s * 1.4, s.s * .6)));
        shardSet.setColorAt(i, hsl(.75, .6, .55 + blink * .4));
    }
}

export const shardSystem = { always: true, build: buildShards, update: updateShards };
