// The race's cutscenes: Oswin's challenge (the first time), the countdown at the line (every time), and the finish.
import { MOBILE, usingGamepadInput, vec3 } from '../../platform/engine.js';
import { PENTA, bell, playSfx } from '../../audio/sfx.js';
import { RACE_CHALLENGE, RACE_COUNT, RACE_LOSE, RACE_WIN, RUN_TIP } from './lines-data.js';
import { lanePoint, lightPoint, startPoint } from './course.js';
import { OSWIN_VOICE } from './scene.js';
import { player } from '../../player/player.js';
import { cam, kickCamera } from '../../render/camera.js';
import { wrapAngle } from '../../lib/math.js';
import { fitLine, inOut, playCutscene, smooth } from '../../ui/cutscene.js';
import { heightAt } from '../../world/terrain.js';

const say = (text, delay = .3, least = 2.4)=> ({ who: 'Oswin', voice: OSWIN_VOICE, text, delay, cps: 22, dur: fitLine(text, { cps: 22, delay, least }) });
const ground = (p, up = 0)=> vec3(p.x, heightAt(p.x, p.z) + up, p.z);
// the way up the road at the line, flat
const upRoad = ()=> { const a = startPoint(); return vec3(a.dx, 0, a.dz); };
const across = ()=> { const u = upRoad(); return vec3(-u.z, 0, u.x); };

// shots of Oswin's face, from a little to one side of where he is looking
function faces(oswin)
{
    const fwd = ()=> vec3(-Math.sin(oswin.yaw), 0, -Math.cos(oswin.yaw));
    const head = ()=> oswin.pos3D.add(fwd().scale(.75)).add(vec3(0, .95, 0));
    const side = ()=> vec3(-fwd().z, 0, fwd().x);
    return { head, face: (dist, up, lean = 1)=> head().add(fwd().add(side().scale(lean)).normalize().scale(dist)).add(vec3(0, up, 0)) };
}

export function playChallenge(oswin, onEnd)
{
    const { head, face } = faces(oswin);
    const me = ()=> player.pos.add(vec3(0, 1, 0));
    const light = ground(lightPoint(), 1.5), start = ground(startPoint(), 1);
    const tip = MOBILE ? RUN_TIP.touch : usingGamepadInput() ? RUN_TIP.pad : RUN_TIP.keys;
    return playCutscene({
        name: 'race-challenge', blendIn: 1, blendOut: .9,
        beats: [
            {   // he rears up, very pleased with the idea
                ...say(RACE_CHALLENGE.dare, .5, 3.4),
                shot: (t, d)=> ({ pos: face(3.4 - smooth(t / d) * .6, .1), look: head().add(vec3(0, .1, 0)), fov: 44, roll: 4 }),
                act: ()=> { oswin.talk = .2; },
                at: [[.3, ()=> { oswin.wiggle = 1; oswin.glow = 1.4; playSfx('boing', undefined, .4, 1.3); }]],
            },
            {   // up the road, to the light he means
                blend: 1.2, ...say(RACE_CHALLENGE.route, .4, 4.2),
                shot: (t, d)=>
                {
                    const k = inOut(t / d);
                    return { pos: start.lerp(light, .1 + k * .55).add(across().scale(6)).add(vec3(0, 5 - k * 2, 0)), look: start.lerp(light, .45 + k * .55), fov: 54 };
                },
            },
            {   // from the light, looking back down to the line
                ...say(RACE_CHALLENGE.back, .3, 4),
                shot: (t, d)=> ({ pos: light.add(upRoad().scale(5 - smooth(t / d))).add(across().scale(-3)).add(vec3(0, 2.6, 0)), look: start, fov: 46, roll: -3 }),
                at: [[.2, ()=> playSfx('shimmer', undefined, .5)]],
            },
            {   // back to him, being honest
                blend: 1.1, ...say(RACE_CHALLENGE.boast, .5, 3.6),
                shot: (t, d)=> ({ pos: face(2.8 - smooth(t / d) * .4, .3, -1), look: head(), fov: 40 }),
                act: ()=> { oswin.talk = .2; },
            },
            {   // a tip for the athlete
                ...say(tip, .3, 4),
                shot: (t, d)=> { const mid = head().lerp(me(), .5); return { pos: mid.add(across().scale(4.6 - smooth(t / d) * .6)).add(vec3(0, .8, 0)), look: mid, fov: 48 }; },
                act: ()=> { oswin.talk = .2; },
            },
        ],
        onEnd,
    });
}

// both racers at the line, and three, two, one
export function playCountdown(oswin, onEnd)
{
    const from = oswin.pos3D.copy(), fromYaw = oswin.yaw;
    const mine = lanePoint(0, 1), his = lanePoint(0, -1);
    const up = upRoad(), faceUp = Math.atan2(-up.x, -up.z);
    const line = ground(startPoint(), 1);
    player.pos = mine; player.vel = vec3(); player.yaw = faceUp; player.pose = 'free';
    // a count is a big plain number, a chime rising with each one, and a cut to a closer view of the two of you
    const count = (n, semi)=> ({
        dur: .85, big: String(n), bigDelay: 0,
        shot: (t)=> ({ pos: line.add(up.scale(3.6 + n * .5 - t * .4)).add(across().scale((n - 2) * 1.6)).add(vec3(0, .5, 0)), look: line.add(vec3(0, -.3, 0)), fov: 50 - (3 - n) * 4 }),
        at: [[0, ()=> { bell(PENTA[semi], undefined, .7); kickCamera(.03); }]],
    });
    return playCutscene({
        name: 'race-countdown', blendIn: 1, blendOut: .5,
        beats: [
            {   // up the road, looking back at the two of you as he takes his mark
                ...say(RACE_COUNT.ready, .4, 2.4),
                shot: (t, d)=> ({ pos: line.add(up.scale(7 - smooth(t / d) * 1.5)).add(vec3(0, 1.1, 0)), look: line.add(vec3(0, -.2, 0)), fov: 50 }),
                act: (t, d)=>
                {
                    const k = inOut(t / (d * .8));
                    oswin.pos3D = from.lerp(his, k);
                    oswin.pos3D.y = heightAt(oswin.pos3D.x, oswin.pos3D.z);
                    oswin.yaw = fromYaw + Math.atan2(Math.sin(faceUp - fromYaw), Math.cos(faceUp - fromYaw)) * k;
                    oswin.speed = k < 1 ? 2 : 0;
                },
            },
            count(3, 0), count(2, 2), count(1, 4),
            {
                dur: .9, big: RACE_COUNT.go, bigDelay: 0, bigCps: 14,
                shot: (t)=> ({ pos: line.add(up.scale(-3 - t)).add(vec3(0, 1.6, 0)), look: line.add(up.scale(8)), fov: 58 }),
                at: [[0, ()=> { oswin.wiggle = 1; }]],
            },
        ],
        // the camera hands over from behind, facing up the road
        onEnd: ()=> { oswin.pos3D = his; oswin.yaw = faceUp; cam.yaw = faceUp; cam.pitch = .3; onEnd(); },
    });
}

// arrive(k) brings Oswin the rest of the way in as k goes 0 to 1 (a win); on a loss he is already home
export function playFinish(oswin, won, arrive, onEnd)
{
    const { head, face } = faces(oswin);
    const me = ()=> player.pos.add(vec3(0, 1, 0));
    const line = ground(startPoint(), 1);
    const lines = won ? RACE_WIN : RACE_LOSE;
    // on a win, once he has puffed in he turns to you
    let turnFrom = null;
    const faceYou = (t)=>
    {
        const toYou = Math.atan2(-(player.pos.x - oswin.pos3D.x), -(player.pos.z - oswin.pos3D.z));
        turnFrom ??= oswin.yaw;
        oswin.yaw = turnFrom + wrapAngle(toYou - turnFrom) * inOut(t / .7);
    };
    // from him to you, flat, and square to that, for shots of the two of you wherever you ended up
    const away = ()=> { const d = me().subtract(head()); return vec3(d.x, 0, d.z).normalize(); };
    const beside = ()=> { const a = away(); return vec3(-a.z, 0, a.x); };
    // on a win, if you stopped right where he finishes, you step over to your own lane so there is room for the two of
    // you in the shots, and turn to him
    const hisSpot = lanePoint(0, -1), mySpot = lanePoint(0, 1);
    const slideFrom = player.pos.copy();
    const slide = won && Math.hypot(player.pos.x - hisSpot.x, player.pos.z - hisSpot.z) < 2.6;
    const step = (t)=>
    {
        if (slide) { player.pos = slideFrom.lerp(mySpot, inOut(t / .8)); player.vel = vec3(); }
        player.yaw = Math.atan2(-(hisSpot.x - player.pos.x), -(hisSpot.z - player.pos.z));
    };
    const spinFrom = oswin.yaw;      // on a loss he does a victory twirl
    const beats = won
        ? [
            {   // low by the line, the mothling home and Oswin puffing in behind
                ...say(lines.gasp, 2, 3.6),
                shot: (t, d)=> ({ pos: me().add(across().scale(2.6)).add(upRoad().scale(-2.2 + smooth(t / d) * .4)).add(vec3(0, -.3, 0)), look: me().lerp(oswin.pos3D, .35), fov: 52 }),
                act: (t)=> { step(t); if (turnFrom === null) arrive(Math.min(1, inOut(t / 1.8))); if (t >= 1.8) faceYou(t - 1.8); oswin.talk = t > 2 ? .2 : 0; },
                at: [[1.9, ()=> playSfx('land', undefined, .6, .7)]],
            },
            {   // his face, lit up, from in front and to the side, now that he has turned to you (you are out of frame)
                ...say(lines.praise, .3, 3.4),
                shot: (t, d)=> ({ pos: face(2.6 - smooth(t / d) * .3, .1, .6), look: head(), fov: 42, roll: -4 }),
                act: (t)=> { faceYou(9); oswin.talk = .2; },
                at: [[.4, ()=> { oswin.wiggle = 1; oswin.glow = 1.4; playSfx('shimmer', undefined, .5); }]],
            },
            {
                ...say(lines.pride, .3, 3.4),
                shot: (t, d)=> { const mid = head().lerp(me(), .5); return { pos: mid.add(beside().scale(-4.4 + smooth(t / d) * .5)).add(vec3(0, .9, 0)), look: mid, fov: 48 }; },
                act: ()=> { faceYou(9); oswin.talk = .2; },
            },
        ]
        : [
            {   // he crosses the line and cannot believe how good he is
                ...say(lines.cheer, .3, 3.2),
                shot: (t, d)=> ({ pos: line.add(upRoad().scale(-4 + smooth(t / d))).add(across().scale(-2)).add(vec3(0, .4, 0)), look: oswin.pos3D.add(vec3(0, .8, 0)), fov: 46, roll: 5 }),
                act: (t)=> { oswin.wiggle = Math.max(oswin.wiggle, .8); oswin.yaw = spinFrom + inOut(t / 1.4) * Math.PI * 2; oswin.talk = .2; },
                at: [[.1, ()=> { oswin.glow = 1.6; kickCamera(.04); }]],
            },
            {
                ...say(lines.tip, .3, 3.4),
                shot: (t, d)=> ({ pos: face(2.5 - smooth(t / d) * .4, .1), look: head(), fov: 42 }),
                act: ()=> { oswin.talk = .2; },
            },
            {
                ...say(lines.again, .3, 3.4),
                shot: (t, d)=> ({ pos: face(3.6 + smooth(t / d) * .8, .9, -1), look: head(), fov: 46 }),
                act: ()=> { oswin.talk = .2; },
            },
        ];
    return playCutscene({ name: 'race-finish', blendIn: .8, blendOut: 1.2, beats, onEnd: ()=> { if (turnFrom === null) arrive(1); onEnd(); } });
}
