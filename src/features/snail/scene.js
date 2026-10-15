// Meeting Oswin: the camera finds him turning toward you, pushes in on his face and his lantern shell, flies over
// the pond he tells you about, and comes back to him for the last word.
import { vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { SNAIL_MEETING } from './lines-data.js';
import { player } from '../../player/player.js';
import { inOut, playCutscene, smooth } from '../../ui/cutscene.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

export const OSWIN_VOICE = .58;

export function playMeeting(oswin, onEnd)
{
    const fwd = ()=> vec3(-Math.sin(oswin.yaw), 0, -Math.cos(oswin.yaw));
    const head = ()=> oswin.pos3D.add(fwd().scale(.75)).add(vec3(0, .95, 0));
    const shell = ()=> oswin.pos3D.add(fwd().scale(-.3)).add(vec3(0, 1, 0));
    const me = ()=> player.pos.add(vec3(0, 1, 0));
    const across = ()=> { const d = me().subtract(head()); return vec3(-d.z, 0, d.x).normalize(); };
    const away = ()=> { const d = me().subtract(head()); return vec3(d.x, 0, d.z).normalize(); };
    const pond = vec3(P.pond.x, heightAt(P.pond.x, P.pond.z) + .2, P.pond.z);
    const turnTo = Math.atan2(-(player.pos.x - oswin.pos3D.x), -(player.pos.z - oswin.pos3D.z));
    const fromYaw = oswin.yaw;
    // a three-quarter view of his face, off to the side so the mothling in front of him is not in the way
    const faceCam = (dist, up)=> head().add(fwd().scale(.55).add(across().scale(-1)).normalize().scale(dist)).add(vec3(0, up, 0));
    const say = (text, delay = .3)=> ({ who: 'Oswin', voice: OSWIN_VOICE, text, delay, cps: 22 });
    return playCutscene({
        name: 'meet-oswin', blendIn: 1.2, blendOut: 1.4,
        beats: [
            {   // a two-shot from the side as he turns to you
                dur: 3.4, ...say(SNAIL_MEETING.hello, .9),
                shot: (t, d)=>
                {
                    const mid = head().lerp(me(), .5);
                    return { pos: mid.add(across().scale(5.2 - smooth(t / d))).add(vec3(0, .9, 0)), look: mid, fov: 50 };
                },
                act: (t)=> { oswin.yaw = fromYaw + (turnTo - fromYaw) * inOut(t / 1.2); },
                at: [[.8, ()=> { oswin.glow = 1; playSfx('pop', undefined, .5, .7); }]],
            },
            {   // his face, close and from a little below
                dur: 3.2, ...say(SNAIL_MEETING.name, .4),
                shot: (t, d)=> ({ pos: faceCam(2.2 - smooth(t / d) * .6, -.15), look: head(), fov: 40, roll: 5 }),
                at: [[.5, ()=> { oswin.glow = 1.6; playSfx('shimmer', undefined, .5); }]],
            },
            {   // over your shoulder; the eye travels from his face to his shell
                dur: 3.8, blend: .8, ...say(SNAIL_MEETING.house),
                shot: (t)=> ({ pos: me().add(away().scale(1.9)).add(across().scale(.8)).add(vec3(0, .5, 0)), look: head().lerp(shell(), smooth((t - 1) / 1.6)), fov: 46 }),
            },
            {   // the lantern shell
                dur: 3.4, ...say(SNAIL_MEETING.home, .2),
                shot: (t)=>
                {
                    const a = Math.atan2(fwd().x, fwd().z) + 1.9 + t * .12;
                    return { pos: shell().add(vec3(Math.sin(a) * 2.6, .9, Math.cos(a) * 2.6)), look: shell(), fov: 38, roll: -5 };
                },
                act: ()=> { oswin.glow = Math.max(oswin.glow, .7); },
            },
            {   // the pond he means, from high to low
                dur: 5, blend: 1.1, ...say(SNAIL_MEETING.pond, .5),
                shot: (t, d)=>
                {
                    const k = smooth(t / d), a = .6 + k * .7;
                    return { pos: pond.add(vec3(Math.sin(a) * (16 - k * 6), 9 - k * 6, Math.cos(a) * (16 - k * 6))), look: pond, fov: 52 };
                },
                at: [[1.8, ()=> playSfx('plop', undefined, .5)], [3, ()=> playSfx('splash', undefined, .35)]],
            },
            {   // back to him for the last word
                dur: 3.8, ...say(SNAIL_MEETING.fish, .3),
                shot: (t, d)=> ({ pos: faceCam(2.8 - smooth(t / d) * .5, .25), look: head().lerp(me(), .3), fov: 44 }),
            },
        ],
        onEnd: ()=> { oswin.yaw = turnTo; onEnd(); },
    });
}
