// The moon answers the song: the camera looks up past the mothling to the moon, rises over Amethyst Hill, follows
// the light bridge as it unfolds to the Moonlet, looks back from there, and comes home.
import { vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { BRIDGE_LINES } from './lines-data.js';
import { player } from '../../player/player.js';
import { kickCamera } from '../../render/camera.js';
import { MOON_DIR } from '../../sky/directions.js';
import { playCutscene, smooth } from '../../ui/cutscene.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

// unfold(): start laying the slabs one by one; finish(): every slab in place (also when the scene is skipped)
export function playBridgeScene({ unfold, finish, moonletY })
{
    const me = ()=> player.pos.add(vec3(0, 1, 0));
    const a = vec3(P.bridgeStart.x, heightAt(P.bridgeStart.x, P.bridgeStart.z), P.bridgeStart.z);
    const m = vec3(P.moonlet.x, moonletY, P.moonlet.z);
    const along = m.subtract(a).normalize(), side = vec3(-along.z, 0, along.x);
    const flat = vec3(MOON_DIR.x, 0, MOON_DIR.z).normalize();
    return playCutscene({
        name: 'moon-bridge', blendIn: 1.2, blendOut: 1.6,
        beats: [
            {   // low behind the mothling, looking up at the moon
                dur: 4.4, text: BRIDGE_LINES.hum,
                shot: (t, d)=> ({ pos: me().subtract(flat.scale(3.2 - smooth(t / d) * .6)).add(vec3(0, -.3, 0)), look: me().add(MOON_DIR.scale(40)), fov: 56 - t * 1.5, roll: -3 }),
                act: ()=> { player.pose = 'look'; },
                at: [[.1, ()=> playSfx('swell', undefined, .8)]],
            },
            {   // up over the hill, turning west to the edge of the island
                dur: 3.8, blend: 1.8, text: BRIDGE_LINES.west,
                shot: (t, d)=>
                {
                    const k = smooth(t / d);
                    return { pos: me().add(vec3(0, 14 + k * 8, 0)).add(along.scale(-14 + k * 6)), look: a.lerp(m, .2 * k), fov: 58 };
                },
            },
            {   // following the bridge out as it unfolds
                dur: 5.6, blend: 1.4, text: BRIDGE_LINES.bridge, delay: .9,
                shot: (t, d)=>
                {
                    const k = smooth(t / d), at = a.lerp(m, .05 + k * .45);
                    return { pos: at.add(side.scale(9)).add(vec3(0, 4.5, 0)).subtract(along.scale(4)), look: at.add(along.scale(6)), fov: 52, roll: 4 * (1 - k) };
                },
                at: [[.2, unfold]],
            },
            {   // from the Moonlet, looking back the way it came
                dur: 4.2, big: BRIDGE_LINES.title, bigDelay: .5,
                shot: (t, d)=>
                {
                    const k = smooth(t / d);
                    return { pos: m.add(along.scale(-2)).add(side.scale(-2 - k)).add(vec3(0, 1.4 + k * .6, 0)), look: m.lerp(a, .55), fov: 46 - k * 4 };
                },
                at: [[.4, ()=> { playSfx('shimmer', undefined, .6); kickCamera(.04); }]],
            },
            {   // home
                dur: 2.6, text: BRIDGE_LINES.go,
                shot: (t, d)=> ({ pos: me().add(along.scale(-3.5 + smooth(t / d) * .6)).add(side.scale(1.2)).add(vec3(0, .8, 0)), look: me().add(along.scale(4)), fov: 54 }),
                act: ()=> { player.pose = 'free'; },
            },
        ],
        onEnd: ()=> { player.pose = 'free'; finish(); },
    });
}
