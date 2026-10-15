// Particle bursts.
import { PI, ParticleEmitter3D, WHITE, vec3 } from '../platform/engine.js';

export function burst(pos, color, count = 12, speed = .06, size = .2, life = .9, gravity = -.002, additive = true)
{
    const e = new ParticleEmitter3D(pos, .25, .01, 0, PI, undefined,
        color, color.lerp(WHITE, .4), color.withAlpha(0), color.lerp(WHITE, .5).withAlpha(0),
        life, size, size * .25, speed, .95, gravity, .35, .4, additive);
    for (let i = 0; i < count; i++) e.emitParticle();
    return e;
}
// a rising swirl of sparkles
export function sparkleColumn(pos, color, count = 24, height = 1)
{
    const e = new ParticleEmitter3D(pos, vec3(.8, .2, .8), .01, 0, .35, undefined,
        color, WHITE, color.withAlpha(0), WHITE.withAlpha(0),
        1.6 * height, .14, .02, .05 * height, .985, .0006, .4, .5, true);
    for (let i = 0; i < count; i++) e.emitParticle();
    return e;
}
