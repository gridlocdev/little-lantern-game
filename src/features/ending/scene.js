// The ending: close on the mothling, up over the quiet island, out to the star whale for its last song, and the title
// across the sky. Going home to bed comes after (index.js hands that to the house).
import { vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { ENDING_LINES } from './lines-data.js';
import { player } from '../../player/player.js';
import { whale } from '../../sky/whale.js';
import { playCutscene, smooth } from '../../ui/cutscene.js';

export function playEnding(onEnd)
{
    const me = ()=> player.pos.add(vec3(0, 1, 0));
    const home = me();
    // which way the whale is, flattened, and a side to it, fixed for the scene so the shots agree
    const toWhale = vec3(whale.pos3D.x - home.x, 0, whale.pos3D.z - home.z).normalize(), side = vec3(-toWhale.z, 0, toWhale.x);
    return playCutscene({
        name: 'ending', blendIn: 2.4, blendOut: 2.2,
        beats: [
            {   // close on the mothling, slowly circling
                dur: 5.2, text: ENDING_LINES.done,
                shot: (t, d)=>
                {
                    const a = .6 + smooth(t / d) * .5, dir = toWhale.scale(-Math.cos(a)).add(side.scale(Math.sin(a)));
                    return { pos: me().add(dir.scale(3.4)).add(vec3(0, .5, 0)), look: me(), fov: 46 };
                },
                act: ()=> { player.pose = 'free'; },
                at: [[.2, ()=> playSfx('swell', undefined, .55)]],
            },
            {   // rising away over the island
                dur: 6, blend: 2.2, text: ENDING_LINES.island,
                shot: (t, d)=>
                {
                    const k = smooth(t / d);
                    return { pos: home.add(toWhale.scale(-14 - k * 26)).add(side.scale(6)).add(vec3(0, 8 + k * 26, 0)), look: home.lerp(vec3(0, 0, 0), .4 * k), fov: 55 };
                },
            },
            {   // turning out to the whale as it sings
                dur: 6.4, blend: 2.4, text: ENDING_LINES.whale,
                shot: (t, d)=>
                {
                    const k = smooth(t / d);
                    return { pos: home.add(toWhale.scale(-6 + k * 3)).add(vec3(0, 5 + k * 3, 0)), look: whale.pos3D, fov: 50 - k * 6 };
                },
                at: [[.6, ()=> playSfx('whale', undefined, .9)]],
            },
            {   // the title across the sky
                dur: 5.4, blend: 2, big: ENDING_LINES.title, bigDelay: .7,
                shot: (t, d)=>
                {
                    const k = smooth(t / d);
                    return { pos: home.add(toWhale.scale(-10)).add(side.scale(-4 + k * 3)).add(vec3(0, 3, 0)), look: home.add(toWhale.scale(30)).add(vec3(0, 18 + k * 6, 0)), fov: 58, roll: 3 - k * 3 };
                },
                at: [[.6, ()=> playSfx('shimmer', undefined, .45)]],
            },
        ],
        onEnd: ()=> { player.pose = 'free'; onEnd(); },
    });
}
