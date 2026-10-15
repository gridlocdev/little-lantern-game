// Ambient effects that follow the player.
import { MOBILE, PI, ParticleEmitter3D, hsl, vec3 } from '../platform/engine.js';
import { player } from '../player/player.js';

let motes, chimneySmoke;
function buildAmbientFx()
{
    // drifting motes of light that follow you around
    motes = new ParticleEmitter3D(vec3(), vec3(34, 6, 34), 0, MOBILE ? 7 : 12, PI, undefined,
        hsl(.13, .8, .75, .9), hsl(.52, .7, .75, .9), hsl(.13, .8, .75, 0), hsl(.6, .7, .75, 0),
        7, .09, .03, .006, .995, .00012, .5, .6, true);
}
function updateAmbientFx()
{
    if (motes) motes.pos3D = player.pos.add(vec3(0, 2.2, 0));
}

export const ambientSystem = { build: buildAmbientFx, update: updateAmbientFx };
