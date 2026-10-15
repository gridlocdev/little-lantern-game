// Cutscenes: a list of beats played as an activity that owns the camera, with letterbox bars, a typed title card,
// kinetic subtitles in the speaker's voice and big words that land with a thump.
//
// A beat is one shot:
//     dur          seconds on screen
//     shot(t, d)   where the camera is at t of d seconds: { pos, look, fov (degrees, 60), roll (degrees) }
//     blend        seconds to glide from the last shot into this one (0, the default, cuts)
//     who, text    a subtitle in kinetic markup (kinetic.js); voice is the speaker's pitch, 0 for the narrator
//     delay, cps   when the subtitle starts within the beat, and how fast it types
//     act(t, d)    called every frame, to pose things
//     at           [[t, fn], ...] things that happen once at t
//     caption      { title, sub } a title card typed in the corner
//     big          kinetic markup set large across the middle
// Skipping (hold E or Space, or press Esc) jumps to the end; onEnd always runs, so anything a scene changes for
// good belongs there, not in a beat.
import { PI, timeDelta, vec3 } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { activity } from '../game/activity.js';
import { clearTouchPresses, input } from '../platform/input.js';
import { kickCamera } from '../render/camera.js';
import { $ } from './dom.js';
import { typeLine } from './kinetic.js';

const DEG = PI / 180;
const ease = (x)=> x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
export const smooth = (x)=> { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const inOut = (x)=> ease(Math.min(1, Math.max(0, x)));

let scene = null;
export const inCutscene = ()=> !!scene;

export function playCutscene({ name = 'cutscene', beats, onEnd, blendIn = 1.4, blendOut = 1.6 })
{
    if (scene) return Promise.resolve();
    activity.current?.cancel?.();
    return new Promise((resolve)=>
    {
        scene = { beats, onEnd, resolve, t: 0, i: -1, start: 0, line: null, big: null, pose: null, from: null, hold: 0, armed: false };
        document.body.classList.add('cine');
        $('cine').hidden = false;
        requestAnimationFrame(()=> $('cine').classList.add('on'));
        activity.start({
            name, lockCamera: true, camBlend: blendIn, camBlendOut: blendOut,
            update: step,
            cancel: ()=> finish(),
            cam: ()=> scene?.pose ?? { pos: vec3(), look: vec3(0, 0, -1), exact: true },
            hint: ()=> '',
        });
        step(0);
    });
}

function enterBeat(i)
{
    const s = scene, b = s.beats[i];
    s.from = s.pose;
    s.i = i;
    $('cineWho').textContent = b.who || '';
    $('cineWho').classList.toggle('on', !!b.who);
    $('cineSub').classList.toggle('narrator', !b.who);
    s.line = b.text ? typeLine($('cineLine'), b.text, { start: s.t + (b.delay ?? .35), cps: b.cps ?? 26, pitch: b.voice ?? 0, onBig: thump }) : null;
    if (!b.text) $('cineLine').textContent = '';
    s.big = b.big ? typeLine($('cineBig'), b.big, { start: s.t + (b.bigDelay ?? .2), cps: b.bigCps ?? 9, onBig: thump }) : null;
    if (!b.big) $('cineBig').textContent = '';
    if (b.caption) caption(b.caption.title, b.caption.sub);
}
function thump() { playSfx('thrum', undefined, .7); kickCamera(.06); }
function caption(title, sub)
{
    const el = $('cineCap');
    el.classList.remove('on');
    $('capTitle').textContent = '';
    $('capSub').textContent = sub || '';
    void el.offsetWidth;    // restart the card's animations
    el.classList.add('on');
    scene.cap = typeLine($('capTitle'), title, { start: scene.t + .2, cps: 14 });
}

function step(dtIn)
{
    const s = scene;
    if (!s) return;
    const dt = dtIn ?? timeDelta;
    // skipping
    if (input.back()) return finish();
    // the press that started the scene does not count toward skipping it
    if (!input.actHeld()) s.armed = true;
    s.hold = s.armed && input.actHeld() ? s.hold + dt : Math.max(0, s.hold - dt * 2);
    $('cineSkip').style.setProperty('--hold', String(Math.min(1, s.hold / .8)));
    $('cineSkip').classList.toggle('on', s.hold > .05);
    if (s.hold > .8) return finish();

    const prev = s.t;
    s.t += dt;
    let i = 0, acc = 0;
    while (i < s.beats.length && s.t >= acc + s.beats[i].dur) { acc += s.beats[i].dur; i++; }
    if (i >= s.beats.length) return finish();
    if (i !== s.i) { s.start = acc; enterBeat(i); }
    const b = s.beats[i], lt = s.t - s.start, plt = Math.max(-1e-4, prev - s.start);
    for (const [at, fn] of b.at || []) if (at > plt && at <= lt) fn();
    b.act?.(lt, b.dur);
    s.line?.update(s.t);
    s.big?.update(s.t);
    s.cap?.update(s.t);

    const shot = b.shot(lt, b.dur);
    let pose = { pos: shot.pos, look: shot.look, fov: (shot.fov ?? 60) * DEG, roll: (shot.roll ?? 0) * DEG, exact: true };
    if (b.blend && s.from && lt < b.blend)
    {
        const k = ease(lt / b.blend), f = s.from;
        pose = { pos: f.pos.lerp(pose.pos, k), look: f.look.lerp(pose.look, k), fov: f.fov + (pose.fov - f.fov) * k, roll: f.roll + (pose.roll - f.roll) * k, exact: true };
    }
    s.pose = pose;
}

function finish()
{
    const s = scene;
    if (!s) return;
    scene = null;
    $('cine').classList.remove('on');
    $('cineCap').classList.remove('on');
    $('cineSkip').classList.remove('on');
    document.body.classList.remove('cine');
    setTimeout(()=> { if (!scene) $('cine').hidden = true; }, 700);
    activity.end();
    clearTouchPresses();
    try { s.onEnd?.(); } catch (e) { console.error(e); }
    s.resolve();
}
$('cineSkip').onclick = ()=> finish();
