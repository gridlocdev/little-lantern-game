// Going home for a nap, the last part of the ending: the mothling walks up the path to the front door, goes in,
// crosses the room, climbs into bed and curls up. The ending feature asks for it with the 'ending-go-home' event
// and passes the lines to show and what to do once the mothling is asleep.
import { PI, timeDelta, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { moveInside } from './doors.js';
import { BED, HOUSE, hin } from './plan.js';
import { wrapAngle } from '../../lib/math.js';
import { player } from '../../player/player.js';
import { playCutscene, smooth } from '../../ui/cutscene.js';
import { fadeTransition } from '../../ui/fade.js';
import { heightAt } from '../../world/terrain.js';

const WALK = 1.5;      // an unhurried, sleepy walk, m/s

/** @param {{ lines: { home: string, sleep: string }, done: ()=> void }} ending */
export function playNapScene({ lines, done })
{
    const door = HOUSE.door;
    const ground = (x, z)=> vec3(x, heightAt(x, z), z);
    const pathStart = ground(door.x + .8, door.z + 8), atDoor = ground(door.x, door.z + .7);
    const inside = hin(-3.5, 0, 3.2), bedside = hin(BED.x - 1.7, 0, BED.z + .9);
    const inBed = hin(BED.x, .95, BED.z + .1);
    const me = ()=> player.pos.add(vec3(0, .9, 0));
    // walks the mothling a step toward a point, facing where it goes; true once it is there
    const stepTo = (to, dt)=>
    {
        const d = vec3(to.x - player.pos.x, 0, to.z - player.pos.z), l = d.length();
        if (l < .05) { player.speed = 0; return true; }
        const s = Math.min(l, WALK * dt);
        player.yaw += wrapAngle(Math.atan2(-d.x, -d.z) - player.yaw) * Math.min(1, dt * 8);
        const p = player.pos.add(d.normalize(s));
        player.pos = player.zone === 'island' ? ground(p.x, p.z) : vec3(p.x, inside.y, p.z);
        player.speed = WALK;
        return false;
    };
    const walkTo = (to)=> ()=> stepTo(to, timeDelta);

    fadeTransition(()=>
    {
        player.zone = 'island'; player.pose = 'free'; player.hold = 'lantern';
        player.pos = pathStart; player.vel = vec3(); player.yaw = 0;
        playCutscene({
            name: 'nap', blendIn: 0, blendOut: 2.2, pinned: true,
            beats: [
                {   // up the path to the front door, the house light on ahead
                    dur: 6.4, text: lines.home,
                    shot: (t, d)=> ({ pos: me().add(vec3(2.6 - smooth(t / d), 1.3, 3.6)), look: me().add(vec3(0, .3, -3)), fov: 52 }),
                    act: walkTo(atDoor),
                },
                {   // the door, and in
                    dur: 1.6,
                    shot: ()=> ({ pos: atDoor.add(vec3(2.2, 2, 3.4)), look: atDoor.add(vec3(0, 1.2, -1)), fov: 50 }),
                    act: ()=> { player.speed = 0; },
                    at: [[.2, ()=> { playSfx('door', player.pos, .8); fadeTransition(moveInside, 500); }]],
                },
                {   // across the room to the bed
                    dur: 5.4,
                    shot: (t, d)=> ({ pos: hin(-.5 + smooth(t / d) * 2, 6.5, 6.5), look: me().lerp(hin(BED.x, .5, BED.z), .35), fov: 50 }),
                    act: walkTo(bedside),
                },
                {   // in, curled up under the stars on the quilt; the camera comes close
                    dur: 7, blend: 2.2, text: lines.sleep, delay: 1.8,
                    shot: (t, d)=> ({ pos: inBed.add(vec3(-1.6 + smooth(t / d) * .3, 1.3 - smooth(t / d) * .2, 1.3)), look: inBed.add(vec3(0, .2, -.5)), fov: 46 }),
                    act: (t)=>
                    {
                        const k = Math.min(1, t / .8);
                        player.pose = 'sleep'; player.hold = 'none'; player.speed = 0;
                        player.yaw += wrapAngle(-PI / 2 - player.yaw) * Math.min(1, k);
                        player.pos = bedside.lerp(inBed, smooth(k));
                    },
                    at: [[.3, ()=> playSfx('land', player.pos, .4)], [2.6, ()=> playSfx('purr', player.pos, .35)]],
                },
                {   // and the camera drifts up and away into the dark
                    dur: 5, blend: 1.5,
                    shot: (t, d)=> ({ pos: inBed.add(vec3(-1.3, 1.1 + smooth(t / d) * 9, 1.2 + smooth(t / d) * 3)), look: inBed.add(vec3(0, .2, -.4)), fov: 46 + smooth(t / d) * 8 }),
                    act: ()=> { player.pos = inBed; player.speed = 0; },
                },
            ],
            onEnd: ()=>
            {
                if (player.zone !== 'house') moveInside();
                player.pos = bedside; player.pose = 'free'; player.hold = 'lantern'; player.speed = 0;
                done();
            },
        });
    }, 600);
}
