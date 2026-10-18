// The first arrival: down out of the sky onto the island, then a look at the mothling, its lantern, the pond and the
// house, and back to the mothling as the camera hands over.
import { vec3 } from '../../platform/engine.js';
import { musicCue } from '../../audio/music.js';
import { playSfx } from '../../audio/sfx.js';
import { INTRO_CAPTION, INTRO_LINES } from './lines-data.js';
import { moth } from '../../player/mothling.js';
import { player } from '../../player/player.js';
import { kickCamera } from '../../render/camera.js';
import { inOut, playCutscene, smooth } from '../../ui/cutscene.js';
import { showPlace } from '../../ui/toast.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const ground = (x, z, up = 0)=> vec3(x, heightAt(x, z) + up, z);
const around = (center, dist, yaw, height)=> center.add(vec3(Math.sin(yaw) * dist, height, Math.cos(yaw) * dist));

export function playIntro()
{
    const me = ()=> player.pos.add(vec3(0, 1, 0));
    const face = player.yaw;                       // the mothling faces the pond
    const pond = ground(P.pond.x, P.pond.z, .2), house = ground(P.house.x, P.house.z, 2);
    // around() at the mothling's own yaw sits behind it; add PI to stand in front
    const toHouse = Math.atan2(P.spawn.x - P.house.x, P.spawn.z - P.house.z);
    const toSpawn = Math.atan2(P.spawn.x - P.pond.x, P.spawn.z - P.pond.z);
    const cue = musicCue('intro');     // the intro's own music, written to its length
    return playCutscene({
        name: 'intro', blendIn: 2.2, blendOut: 1.8,
        beats: [
            {   // out of the sky, down to where the mothling lies
                dur: 6.2,
                shot: (t, d)=>
                {
                    const k = inOut(t / d);
                    return { pos: vec3(60, 70, 130).lerp(around(me(), 9, face + 2.2, 4), k), look: vec3(0, -4, 0).lerp(me(), k), fov: 58 - k * 8 };
                },
                caption: INTRO_CAPTION,
                at: [[0, ()=> playSfx('swell', undefined, .8)]],
                act: ()=> { player.pose = 'lie'; },
            },
            {   // waking, from low down with the sky behind
                dur: 4.8, blend: 1.4, text: INTRO_LINES.wake,
                shot: (t, d)=> ({ pos: around(me(), 4.6 - t * .15, face + 2.4 - smooth(t / d) * .7, .9), look: me().add(vec3(0, -1.1, 0)), fov: 52, roll: 4 - t }),
                at: [[1.6, ()=> { player.pose = 'free'; playSfx('jump', undefined, .5, .8); }]],
            },
            {   // the lantern, close, pushing in
                dur: 4, text: INTRO_LINES.lantern,
                shot: (t, d)=>
                {
                    const h = moth.handPos;
                    return { pos: around(h, 2.8 - smooth(t / d) * .6, face + 2.3, .55), look: h.add(vec3(0, -.25, 0)), fov: 44 - t * 1.5, roll: -6 };
                },
                act: ()=> { moth.reach = 1; },
                at: [[.5, ()=> { playSfx('shimmer', undefined, .6); kickCamera(.05); }]],
            },
            {   // skimming over the pond
                dur: 4.6, blend: 1.1, text: INTRO_LINES.pond,
                shot: (t, d)=>
                {
                    const k = smooth(t / d);
                    return { pos: around(pond, 17 - k * 5, toSpawn + .7 - k * .5, 6 - k * 2.5), look: pond, fov: 50 };
                },
                at: [[1.5, ()=> playSfx('plop', undefined, .5)], [2.3, ()=> playSfx('plop', undefined, .4, 1.2)], [3, ()=> playSfx('collect', undefined, .4)]],
            },
            {   // the house, the camera craning up to its door
                dur: 4.4, blend: 1.2, text: INTRO_LINES.house,
                shot: (t, d)=>
                {
                    const k = smooth(t / d);
                    return { pos: around(house, 18 - k * 3, toHouse + .35 - k * .3, 2 + k * 3), look: house, fov: 50 };
                },
            },
            {   // back with the mothling, rising behind it
                dur: 4.8, blend: 1.4, text: INTRO_LINES.hurry,
                shot: (t, d)=>
                {
                    const k = smooth(t / d);
                    return { pos: around(me(), 3.5 + k * 3.5, face - .3 + k * .3, .6 + k * 2), look: me().add(vec3(0, .3, 0)), fov: 56 + k * 4 };
                },
            },
        ],
        onEnd: ()=> { cue.release(); player.pose = 'free'; moth.reach = 0; setTimeout(()=> showPlace('Violet Isle', 'there is no hurry'), 900); },
    });
}
