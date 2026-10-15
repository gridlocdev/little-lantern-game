import {
    EngineObject3D, MOBILE, Mesh, PI, Trail3D, WHITE, abs, buildMatrix, clamp, gamepadWasPressed, hsl, inputClear,
    keyWasPressed, max, min, rand, render3D, time, timeDelta, usingGamepadInput, vec3,
} from './platform/engine.js';
import { bell, playSfx } from './audio/sfx.js';
import { activity } from './game/activity.js';
import { addInteract } from './game/interact.js';
import { save, writeSave } from './game/state.js';
import { refreshAquarium } from './house.js';
import { TAU } from './lib/math.js';
import { clearTouchPresses, input, touchState } from './platform/input.js';
import { mtx } from './platform/mesh.js';
import { moth } from './player/mothling.js';
import { SPH, SPH_LO, TORUS } from './player/part-meshes.js';
import { player } from './player/player.js';
import { burst } from './render/particles.js';
import { $, ui } from './ui/dom.js';
import { openModal } from './ui/modal.js';
import { toast } from './ui/toast.js';

// ================================================================ COSMIC FISH
export const FISH = [
    { id: 'minnow', name: 'Glimmer Minnow', where: 'pond', stars: 1, size: [6, 14], shape: 'slim', w: 40, diff: .22,
        body: hsl(.58, .35, .82), fin: hsl(.6, .6, .9), glow: hsl(.55, .9, .8),
        desc: 'A sliver of moonlight that learned to swim. It tastes faintly of starlight, apparently.', hint: 'Common in Starlight Pond.' },
    { id: 'guppy', name: 'Nebula Guppy', where: 'pond', stars: 1, size: [5, 11], shape: 'frill', w: 34, diff: .3,
        body: hsl(.9, .55, .7), fin: hsl(.5, .7, .68), glow: hsl(.85, .9, .75),
        desc: 'Its tail is a little cloud of pink and teal gas. New stars may be forming in there.', hint: 'Common in Starlight Pond.' },
    { id: 'koi', name: 'Moonfin Koi', where: 'pond', stars: 2, size: [30, 60], shape: 'koi', w: 18, diff: .45,
        body: hsl(.7, .15, .92), fin: hsl(.75, .4, .85), glow: hsl(.75, .8, .75), spots: hsl(.78, .55, .55),
        desc: 'Pearl white with lavender spots shaped like the phases of the moon. Count them and you get one month.', hint: 'Uncommon in Starlight Pond.' },
    { id: 'comet', name: 'Comet Tail', where: 'pond', stars: 3, size: [20, 40], shape: 'comet', w: 8, diff: .66,
        body: hsl(.6, .7, .55), fin: hsl(.55, .9, .8), glow: hsl(.55, 1, .75),
        desc: 'It leaves a glowing streak behind it, even out of the water. It is always in a hurry.', hint: 'Rare in Starlight Pond. Quick and strong.' },
    { id: 'angler', name: 'Void Angler', where: 'void', stars: 2, size: [25, 50], shape: 'angler', w: 35, diff: .45,
        body: hsl(.72, .3, .25), fin: hsl(.75, .3, .38), glow: hsl(.13, 1, .65),
        desc: 'Dangles a tiny star in front of its face to lure in things that are lost. You were not lost, but you came anyway.', hint: 'Off the end of the Void Pier.' },
    { id: 'puffer', name: 'Saturn Puffer', where: 'void', stars: 2, size: [15, 30], shape: 'puffer', w: 35, diff: .4,
        body: hsl(.1, .55, .68), fin: hsl(.08, .7, .6), glow: hsl(.12, .9, .75),
        desc: 'Puffs itself up to the size of a small planet when startled. It came with its own ring.', hint: 'Off the end of the Void Pier.' },
    { id: 'eel', name: 'Quasar Eel', where: 'void', stars: 3, size: [60, 120], shape: 'eel', w: 15, diff: .72,
        body: hsl(.55, .55, .4), fin: hsl(.5, .8, .6), glow: hsl(.5, 1, .7),
        desc: 'Pulses with bands of light exactly once a second. Sailors used to set their clocks by it.', hint: 'Rare. Off the end of the Void Pier.' },
    { id: 'ray', name: 'Aurora Ray', where: 'void', stars: 3, size: [50, 90], shape: 'ray', w: 15, diff: .6,
        body: hsl(.42, .55, .5), fin: hsl(.85, .6, .65), glow: hsl(.38, 1, .7),
        desc: 'Glides through empty space like a sheet of northern lights that got bored of the north.', hint: 'Rare. Off the end of the Void Pier.' },
    { id: 'carp', name: 'Moonbeam Carp', where: 'moonlet', stars: 3, size: [35, 70], shape: 'koi', w: 65, diff: .55,
        body: hsl(.13, .6, .75), fin: hsl(.12, .7, .85), glow: hsl(.12, 1, .75), spots: hsl(.6, .2, .85),
        desc: 'Gold on one side and silver on the other, like a coin that cannot decide.', hint: 'In the pool on the Moonlet.' },
    { id: 'calf', name: 'Starwhale Calf', where: 'moonlet', stars: 4, size: [80, 140], shape: 'whale', w: 35, diff: .82,
        body: hsl(.6, .55, .62), fin: hsl(.58, .7, .75), glow: hsl(.55, .8, .88),
        desc: 'A baby of the great whale that circles the island. It hums a little song when you hold it, and the big one hums back.', hint: 'Legendary. Somewhere in the Moonlet pool.' },
];
for (const f of FISH) f.css = `rgb(${f.body.r * 255 | 0},${f.body.g * 255 | 0},${f.body.b * 255 | 0})`;
export const fishById = (id)=> FISH.find((f)=> f.id === id);

function fishMeshes(f)
{
    if (f.meshes) return f.meshes;
    const m = new Mesh(), g = new Mesh();
    const S = (target, pos, scale, color, rot)=> target.combine(SPH, buildMatrix(pos, rot, scale), color);
    const eyes = (x, y, z, s = .07)=> { for (const k of [-1, 1]) S(m, vec3(k * x, y, z), vec3(s), hsl(.7, .5, .08)); };
    switch (f.shape)
    {
        case 'slim':
            S(m, vec3(), vec3(.2, .26, 1), f.body);
            S(m, vec3(0, 0, .58), vec3(.03, .38, .32), f.fin);
            S(m, vec3(0, .15, .05), vec3(.02, .16, .32), f.fin);
            for (const k of [-1, 1]) S(g, vec3(k * .09, .02, 0), vec3(.02, .05, .72), f.glow);
            eyes(.07, .05, -.36, .06);
            break;
        case 'frill':
            S(m, vec3(0, 0, -.12), vec3(.3, .34, .7), f.body);
            for (const a of [-.45, 0, .45]) S(m, vec3(0, a * .5, .4), vec3(.03, .5, .55), f.fin, vec3(a, 0, 0));
            S(g, vec3(0, 0, .62), vec3(.04, .35, .1), f.glow);
            eyes(.1, .06, -.38, .07);
            break;
        case 'koi':
            S(m, vec3(), vec3(.3, .3, 1), f.body);
            S(m, vec3(0, 0, .6), vec3(.03, .44, .52), f.fin);
            S(m, vec3(0, .16, .05), vec3(.03, .18, .5), f.fin);
            for (const k of [-1, 1]) S(m, vec3(k * .18, -.08, -.2), vec3(.26, .02, .16), f.fin, vec3(0, k * .4, 0));
            for (let i = 0; i < 5; i++) S(m, vec3((i % 2 ? 1 : -1) * .1, .08 + (i % 3) * .02, -.25 + i * .14), vec3(.12, .08, .12), f.spots);
            for (const k of [-1, 1]) S(g, vec3(k * .06, -.04, -.5), vec3(.02, .02, .25), f.glow, vec3(.3, k * .5, 0));
            eyes(.11, .05, -.38, .06);
            break;
        case 'comet':
            S(m, vec3(), vec3(.25, .26, .8), f.body);
            S(m, vec3(0, 0, .45), vec3(.03, .34, .3), f.fin);
            S(g, vec3(0, 0, 1.0), vec3(.07, .07, 1.3), f.glow);
            S(g, vec3(0, .05, -.1), vec3(.27, .1, .5), f.glow.lerp(WHITE, .3));
            eyes(.09, .05, -.28, .06);
            break;
        case 'angler':
            S(m, vec3(), vec3(.62, .55, .72), f.body);
            S(m, vec3(0, -.12, -.3), vec3(.42, .16, .2), hsl(.75, .3, .1));
            S(m, vec3(0, 0, .42), vec3(.03, .38, .28), f.fin);
            for (let i = 0; i < 4; i++) S(m, vec3(0, .28 + i * .08, -.1 - i * .1), vec3(.025, .1, .025), f.fin);
            S(g, vec3(0, .62, -.55), vec3(.15), f.glow);
            eyes(.17, .1, -.28, .08);
            break;
        case 'puffer':
            S(m, vec3(), vec3(.7, .68, .74), f.body);
            for (let i = 0; i < 14; i++)
            {
                const d = vec3(Math.cos(i * 2.4) * Math.sin(i * .9 + 1), Math.cos(i * .9 + 1), Math.sin(i * 2.4) * Math.sin(i * .9 + 1)).normalize();
                S(m, d.scale(.36), vec3(.05, .05, .05), f.fin);
            }
            m.combine(TORUS, buildMatrix(vec3(), vec3(.35, 0, .2), vec3(1.25, .5, 1.25)), f.fin.lerp(WHITE, .3));
            S(m, vec3(0, 0, .4), vec3(.03, .26, .2), f.fin);
            eyes(.18, .1, -.3, .09);
            S(g, vec3(0, .2, -.25), vec3(.1, .05, .05), f.glow);
            break;
        case 'eel':
            for (let i = 0; i < 7; i++)
            {
                S(m, vec3(Math.sin(i * .9) * .05, 0, -.48 + i * .16), vec3(.13 - i * .008, .15 - i * .008, .26), f.body);
                if (i > 0) g.combine(TORUS, buildMatrix(vec3(Math.sin(i * .9) * .05, 0, -.48 + i * .16 - .08), vec3(PI / 2, 0, 0), vec3(.14, .14, .06)), f.glow);
            }
            S(m, vec3(0, .08, 0), vec3(.02, .06, .9), f.fin);
            eyes(.05, .03, -.55, .04);
            break;
        case 'ray':
            S(m, vec3(), vec3(1, .09, .68), f.body);
            S(m, vec3(0, .02, -.05), vec3(.38, .12, .4), f.body.lerp(WHITE, .15));
            S(m, vec3(0, 0, .7), vec3(.03, .03, .85), f.fin);
            for (const k of [-1, 1]) S(g, vec3(k * .3, .04, .04), vec3(.42, .02, .06), f.glow, vec3(0, k * -.6, 0));
            for (const k of [-1, 1]) S(g, vec3(k * .22, .02, .2), vec3(.3, .02, .05), f.fin, vec3(0, k * .5, 0));
            eyes(.1, .06, -.24, .05);
            break;
        case 'whale':
            S(m, vec3(), vec3(.46, .42, 1), f.body);
            S(m, vec3(0, -.1, -.05), vec3(.36, .24, .82), f.body.lerp(WHITE, .45));
            S(m, vec3(0, .02, .58), vec3(.56, .03, .2), f.fin);
            for (const k of [-1, 1]) S(m, vec3(k * .26, -.1, -.1), vec3(.3, .03, .14), f.fin, vec3(0, k * .5, k * .4));
            for (let i = 0; i < 8; i++) S(g, vec3(Math.sin(i * 2.1) * .14, .19, -.32 + i * .09), vec3(.035), f.glow);
            eyes(.17, .02, -.32, .06);
            break;
    }
    return f.meshes = { body: m, glow: g };
}
export function drawFish(f, matrix, alpha = 1, glowBoost = 1)
{
    const { body, glow } = fishMeshes(f);
    const c = alpha < 1 ? WHITE.withAlpha(alpha) : WHITE;
    render3D.drawMesh(body, matrix, undefined, c);
    const e = render3D.emissive;
    render3D.emissive = 1.3 * glowBoost * (f.shape === 'eel' ? .6 + .6 * (Math.sin(time * TAU) > .7 ? 1 : 0) : 1);
    render3D.drawMesh(glow, matrix, undefined, c);
    render3D.emissive = e;
}
// a picture of the fish for the catch card
function paintFishCard(f, size)
{
    const cv = $('catchCanvas'), g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const css = (c, a = 1)=> `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},${a})`;
    const cx = W / 2, cy = H / 2, L = f.shape === 'eel' ? 210 : f.shape === 'puffer' ? 120 : 170;
    const grad = g.createRadialGradient(cx, cy, 10, cx, cy, 140);
    grad.addColorStop(0, css(f.glow, .45)); grad.addColorStop(1, css(f.glow, 0));
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .6})`; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    g.save(); g.translate(cx, cy);
    g.fillStyle = css(f.fin);
    g.beginPath(); g.moveTo(L * .38, 0); g.lineTo(L * .62, -L * .2); g.quadraticCurveTo(L * .54, 0, L * .62, L * .2); g.closePath(); g.fill();
    const bh = f.shape === 'puffer' ? L * .45 : f.shape === 'eel' ? L * .07 : f.shape === 'ray' ? L * .32 : f.shape === 'angler' ? L * .3 : L * .17;
    g.fillStyle = css(f.body);
    g.beginPath(); g.ellipse(0, 0, L * .45, bh, 0, 0, TAU); g.fill();
    g.fillStyle = css(f.glow, .9); g.shadowColor = css(f.glow); g.shadowBlur = 16;
    if (f.shape === 'angler') { g.beginPath(); g.arc(-L * .5, -bh - 26, 8, 0, TAU); g.fill(); }
    else if (f.shape === 'comet') { g.fillRect(L * .2, -3, L * .5, 6); }
    else { g.fillRect(-L * .25, -2, L * .5, 4); }
    g.shadowBlur = 0;
    g.fillStyle = '#120a24'; g.beginPath(); g.arc(-L * .3, -bh * .25, 5, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-L * .31, -bh * .3, 1.8, 0, TAU); g.fill();
    g.restore();
}

// ---------------------------------------------------------------- fishing
export let fishing = null;
const FISH_SPOTS = [];
export function addFishingSpot(spot)
{
    // spot: {kind: 'pond'|'void'|'moonlet', center, radius(water), y, pos()->stand point, castDir()}
    FISH_SPOTS.push(spot);
    addInteract({ pos: spot.pos, r: spot.r || 2.2, label: 'Fish', when: spot.when, act: ()=> startFishing(spot), priority: .5, zone: spot.zone || 'island' });
}
function pickFish(kind)
{
    const pool = FISH.filter((f)=> f.where === kind);
    let total = 0;
    const w = pool.map((f)=> { const k = f.id === 'calf' && !save.fish.calf ? f.w * 1.2 : f.w; total += k; return k; });
    let r = rand(total);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[0];
}
class FishingRig extends EngineObject3D
{
    constructor() { super(vec3()); this.castShadow = false; }
    render3D()
    {
        const F = fishing;
        if (!F || !moth.rodTip) return;
        const tip = moth.rodTip;
        if (F.state !== 'aim' && F.state !== 'caught' && F.state !== 'done')
        {
            const b = F.bob;
            const sag = F.state === 'reel' ? .1 : .6;
            const pts = [];
            for (let i = 0; i <= 10; i++)
            {
                const t = i / 10;
                pts.push(tip.lerp(b, t).add(vec3(0, -Math.sin(t * PI) * sag, 0)));
            }
            for (let i = 0; i < 10; i++) render3D.drawLine(pts[i], pts[i + 1], .018, hsl(.6, .2, .85, .8));
            // the bobber: a little glowing moon on the water
            const m = mtx(undefined, b, vec3(F.tilt || 0, 0, 0));
            render3D.drawMesh(SPH, mtx(m, vec3(0, .06, 0), vec3(), vec3(.22)), undefined, hsl(.9, .6, .7));
            render3D.drawMesh(SPH, mtx(m, vec3(0, .15, 0), vec3(), vec3(.2, .1, .2)), undefined, WHITE);
            const e = render3D.emissive; render3D.emissive = 1.4;
            render3D.drawMesh(SPH_LO, mtx(m, vec3(0, .26, 0), vec3(), vec3(.07)), undefined, F.state === 'bite' ? hsl(.0, .9, .7) : hsl(.13, 1, .7));
            render3D.emissive = e;
        }
        if (F.flyFish)
        {
            const ff = F.flyFish, t = clamp(ff.t);
            const p = ff.from.lerp(ff.to, t).add(vec3(0, Math.sin(t * PI) * 1.8, 0));
            const s = ff.f.size[1] / 100 * .9 + .15;
            const yaw = Math.atan2(ff.to.x - ff.from.x, ff.to.z - ff.from.z);
            drawFish(ff.f, mtx(undefined, p, vec3(t * 6, yaw, Math.sin(time * 20) * .3), vec3(min(s, 1.1))));
        }
        if (F.holdFish)
        {
            const s = min(F.holdFish.sizeCm / 100 * .9 + .2, 1.1);
            const p = moth.handPos.lerp(moth.handL, .5).add(vec3(0, .25, 0));
            drawFish(F.holdFish.f, mtx(undefined, p, vec3(0, player.yaw + PI / 2, Math.sin(time * 9) * .15), vec3(s)));
        }
    }
    renderTransparent() {}
}
let fishingRig;
function startFishing(spot)
{
    const center = spot.center();
    const stand = player.pos;
    player.yaw = spot.kind === 'void' ? spot.yaw : Math.atan2(-(center.x - stand.x), -(center.z - stand.z));
    player.pose = 'fish';
    player.hold = 'rod';
    fishing = { spot, state: 'aim', power: 0, powerDir: 1, t: 0, bob: player.pos.copy(), progress: .3, zone: .3, zoneV: 0, fishX: .5, fishV: 0, tilt: 0 };
    activity.start({
        name: 'fishing', lockCamera: false, mouseHold: true,
        update: updateFishing,
        cancel: stopFishing,
        hint: ()=> fishingHint(),
        cam: ()=> ({ target: player.pos.add(vec3(0, 1.4, 0)), dist: 7.5, yaw: player.yaw + .35, pitch: .38 }),
    });
    showFishMeter();
    if (!fishingRig) fishingRig = new FishingRig;
}
function stopFishing()
{
    fishing = null;
    activity.end();
    player.pose = 'free';
    player.hold = 'lantern';
    $('meter').hidden = true;
}
function fishingHint()
{
    const F = fishing;
    if (!F) return '';
    const k = MOBILE ? 'Use' : usingGamepadInput() ? 'X' : 'E';
    if (F.state === 'aim') return `${k}|Hold to cast, release to let go · ${MOBILE ? 'Jump' : 'Q'} to stop fishing`;
    if (F.state === 'wait') return `${k}|Wait for a bite · ${k} reels in`;
    if (F.state === 'bite') return `${k}|Now! Hook it`;
    if (F.state === 'reel') return `${k}|Hold to pull the green band onto the fish`;
    return '';
}
function showFishMeter()
{
    const F = fishing;
    const box = $('meterBox');
    $('meter').hidden = false;
    if (F.state === 'aim')
        box.innerHTML = '<div class="label"><span>Cast distance</span><span id="mVal"></span></div><div class="track"><div class="fill" id="mFill" style="width:0%"></div></div>';
    else if (F.state === 'reel')
        box.innerHTML = '<div class="label"><span id="mName">Something is pulling</span><span>Keep it in the band</span></div><div class="track" id="mTrack"><div class="zone" id="mZone"></div><div class="fishmark" id="mFish"></div></div><div class="progress"><i id="mProg"></i></div>';
    else $('meter').hidden = true;
}
function updateFishing()
{
    const F = fishing, dt = timeDelta, spot = F.spot;
    F.t += dt;
    const held = input.actHeld(activity.current?.mouseHold);
    if (F.state !== 'reel' && F.state !== 'caught' && (keyWasPressed('KeyQ') || keyWasPressed('Escape') || gamepadWasPressed(1) || (MOBILE && touchState.jump && F.state === 'aim')))
    {
        clearTouchPresses();
        return stopFishing();
    }
    if (F.state === 'aim')
    {
        F.bob = moth.rodTip ? moth.rodTip.copy() : player.pos.copy();
        if (held)
        {
            F.charging = true;
            F.power += F.powerDir * dt * .9;
            if (F.power > 1) { F.power = 1; F.powerDir = -1; }
            if (F.power < 0) { F.power = 0; F.powerDir = 1; }
            const fill = $('mFill');
            if (fill) { fill.style.width = (F.power * 100).toFixed(0) + '%'; $('mVal').textContent = (3 + F.power * spot.reach).toFixed(1) + ' m'; }
            player.pose = 'reel';
        }
        else if (F.charging)
        {
            F.charging = false;
            const dir = vec3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
            let target = player.pos.add(dir.scale(2.5 + F.power * spot.reach));
            target = spot.clamp(target);
            F.from = moth.rodTip ? moth.rodTip.copy() : player.pos.add(vec3(0, 2, 0));
            F.to = target;
            F.state = 'fly'; F.t = 0;
            player.pose = 'fish';
            playSfx('cast', player.pos, .8);
            $('meter').hidden = true;
        }
    }
    else if (F.state === 'fly')
    {
        const t = clamp(F.t / .7);
        F.bob = F.from.lerp(F.to, t).add(vec3(0, Math.sin(t * PI) * 2.2, 0));
        if (t >= 1)
        {
            F.state = 'wait'; F.t = 0;
            F.biteAt = rand(2.5, 8);
            F.nibbles = [rand(.8, F.biteAt - .5), rand(.8, F.biteAt - .5)];
            spot.kind === 'void' ? playSfx('bite', F.to, .5, .5) : playSfx('plop', F.to, .8);
            ripple(F.to, spot.kind === 'void' ? hsl(.75, .7, .8) : hsl(.6, .6, .85));
        }
    }
    else if (F.state === 'wait')
    {
        let dip = Math.sin(F.t * 2.3) * .04;
        for (const n of (F.nibbles || [])) if (abs(F.t - n) < .15) { dip -= .12; if (!F['n' + n]) { F['n' + n] = 1; playSfx('tick', F.to, .7); ripple(F.to, hsl(.6, .5, .8), .5); } }
        F.bob = F.to.add(vec3(0, dip, 0));
        if (input.act()) { F.state = 'aim'; F.power = 0; showFishMeter(); return; }
        if (F.t > F.biteAt)
        {
            F.state = 'bite'; F.t = 0;
            F.fish = pickFish(spot.kind);
            playSfx('bite', F.to, 1);
            ripple(F.to, hsl(.95, .7, .8), 1.4);
        }
    }
    else if (F.state === 'bite')
    {
        F.bob = F.to.add(vec3(0, -.25 + Math.sin(F.t * 30) * .05, 0));
        if (input.act() || (held && F.t > .05 && !F.heldBefore))
        {
            F.state = 'reel'; F.t = 0;
            F.progress = .3; F.zone = .35; F.zoneV = 0; F.fishX = .5; F.fishV = 0;
            showFishMeter();
            $('mName').textContent = F.fish.stars >= 3 ? 'Something big and quick' : F.fish.stars === 2 ? 'Something lively' : 'Something small';
            playSfx('splash', F.to, .8);
        }
        else if (F.t > .9)
        {
            toast('It slipped away. Try again.');
            F.state = 'wait'; F.t = 0; F.biteAt = rand(3, 8); F.nibbles = [rand(.8, 2)];
        }
        F.heldBefore = held;
    }
    else if (F.state === 'reel')
    {
        const f = F.fish, d = f.diff;
        // the fish darts about the track
        F.fishT = (F.fishT || 0) - dt;
        if (F.fishT <= 0) { F.fishT = rand(.25, 1.1) * (1.2 - d); F.fishGoal = rand(.05, .95); }
        F.fishV += (F.fishGoal - F.fishX) * dt * (6 + d * 14) - F.fishV * dt * 3;
        F.fishX = clamp(F.fishX + F.fishV * dt, 0, 1);
        // your band rises while you hold and sinks when you let go
        F.zoneV += (held ? 2.6 : -2.2) * dt;
        F.zoneV *= .985;
        F.zone += F.zoneV * dt;
        const zw = .3 - d * .1;
        if (F.zone < 0) { F.zone = 0; F.zoneV = abs(F.zoneV) * .3; }
        if (F.zone > 1 - zw) { F.zone = 1 - zw; F.zoneV = -abs(F.zoneV) * .3; }
        const inside = F.fishX > F.zone && F.fishX < F.zone + zw;
        F.progress += inside ? dt * .3 : -dt * (.14 + d * .2);
        if (inside && rand() < dt * 8) playSfx('tick', undefined, .4, 1 + F.progress);
        $('mZone').style.left = (F.zone * 100) + '%';
        $('mZone').style.width = (zw * 100) + '%';
        $('mZone').classList.toggle('hit', inside);
        $('mFish').style.left = (F.fishX * 100) + '%';
        $('mProg').style.width = (clamp(F.progress) * 100) + '%';
        F.bob = F.to.lerp(player.pos.add(vec3(0, .3, 0)), F.progress * .5).add(vec3(Math.sin(F.t * 13) * .15, Math.sin(F.t * 9) * .08, Math.cos(F.t * 11) * .15));
        F.tilt = Math.sin(F.t * 17) * .4;
        player.pose = 'reel';
        if (rand() < dt * 3) ripple(F.bob, hsl(.6, .5, .8), .6);
        if (F.progress >= 1) landFish();
        else if (F.progress <= 0)
        {
            playSfx('snap', player.pos, 1);
            toast(`The line went slack. The ${F.fish.stars >= 3 ? 'big one' : 'fish'} swam off.`);
            F.state = 'aim'; F.power = 0; player.pose = 'fish';
            showFishMeter();
        }
    }
    else if (F.state === 'caught')
    {
        if (F.flyFish)
        {
            F.flyFish.t += dt / .8;
            if (F.flyFish.t >= 1)
            {
                F.holdFish = { f: F.flyFish.f, sizeCm: F.flyFish.sizeCm };
                F.flyFish = null;
                player.pose = 'cheer';
                showCatch(F.holdFish.f, F.holdFish.sizeCm, spot.kind);
            }
        }
    }
}
function landFish()
{
    const F = fishing, f = F.fish;
    const sizeCm = Math.round(rand(f.size[0], f.size[1]) * (rand() < .08 ? 1.25 : 1));
    F.state = 'caught';
    $('meter').hidden = true;
    F.flyFish = { f, sizeCm, from: F.bob.copy(), to: player.pos.add(vec3(0, 1.5, 0)), t: 0 };
    playSfx('splash', F.bob, 1);
    burst(F.bob, f.glow, 22, .09, .25);
    player.hold = 'none';
}
export let pendingCatch = null;
function showCatch(f, sizeCm, kind)
{
    const first = !save.fish[f.id];
    save.fish[f.id] = (save.fish[f.id] || 0) + 1;
    save.best[f.id] = max(save.best[f.id] || 0, sizeCm);
    writeSave();
    pendingCatch = { f, sizeCm };
    $('catchName').textContent = (first ? 'New! ' : '') + f.name;
    $('catchStars').textContent = '★'.repeat(f.stars) + '☆'.repeat(4 - f.stars);
    $('catchSize').textContent = `${sizeCm} cm` + (sizeCm >= (save.best[f.id] || 0) && save.fish[f.id] > 1 ? ' · your biggest' : '');
    $('catchWhere').textContent = { pond: 'Starlight Pond', void: 'Void Pier', moonlet: 'The Moonlet' }[kind];
    $('catchText').textContent = f.desc;
    paintFishCard(f, sizeCm);
    openModal('catch');
    playCatchJingle(f.stars);
    if (f.id === 'calf') setTimeout(()=> { playSfx('whale', undefined, .8, 1.6); toast('Far away, the great whale hums back.'); }, 1200);
}
function playCatchJingle(stars)
{
    const notes = stars >= 3 ? [0, 4, 7, 12, 16] : [0, 4, 7, 12];
    notes.forEach((n, i)=> setTimeout(()=> bell(n + 7, undefined, .55), i * 110));
}
export function resolveCatch(keep)
{
    const c = pendingCatch;
    if (!c) return;
    pendingCatch = null;
    if (ui.modal === 'catch') { $('catch').hidden = true; ui.modal = null; inputClear(); }
    if (keep)
    {
        save.aquarium.push(c.f.id);
        if (save.aquarium.length > 24) save.aquarium.shift();
        toast(`${c.f.name} is swimming in your aquarium at home.`);
        refreshAquarium && refreshAquarium();
    }
    else
    {
        save.released++;
        new SkyFish(c.f, moth.handPos.add(vec3(0, .3, 0)));
        toast(`The ${c.f.name} swims up into the stars.`);
    }
    writeSave();
    if (fishing)
    {
        fishing.holdFish = null;
        fishing.state = 'aim'; fishing.power = 0;
        player.pose = 'fish'; player.hold = 'rod';
        showFishMeter();
    }
}
$('catchKeep').onclick = ()=> resolveCatch(true);
$('catchRelease').onclick = ()=> resolveCatch(false);

// released fish swim up and become stars
class SkyFish extends EngineObject3D
{
    constructor(f, pos)
    {
        super(pos.copy());
        this.f = f; this.start = pos.copy(); this.t = 0;
        this.castShadow = false;
        this.trail = new Trail3D(pos.copy(), 1.6, .25, undefined, f.glow.withAlpha(.8), f.glow.withAlpha(0), true);
        this.addChild(this.trail);
        this.dir = rand(TAU);
    }
    update()
    {
        this.t += timeDelta;
        const t = this.t;
        const r = 1 + t * .8, a = this.dir + t * 2;
        this.pos3D = this.start.add(vec3(Math.cos(a) * r, t * t * 1.4 + t * 2, Math.sin(a) * r));
        if (t > 9) { burst(this.pos3D, this.f.glow, 10, .03, .3); this.destroy(); }
    }
    render3D()
    {
        const t = this.t, a = this.dir + t * 2;
        const s = clamp(1 - (t - 6) / 3) * .7;
        if (s <= 0) return;
        const yaw = Math.atan2(-Math.sin(a), -Math.cos(a)) + PI / 2;
        drawFish(this.f, mtx(undefined, this.pos3D, vec3(-.6, yaw, Math.sin(t * 8) * .2), vec3(s)), 1, 1 + t * .3);
    }
}
// rings on the water, or in the air off the pier
const ripples = [];
function ripple(pos, color, scale = 1) { ripples.push({ pos: pos.copy(), color, t: 0, scale }); }
export class RippleDrawer extends EngineObject3D
{
    constructor() { super(vec3()); this.additive = true; this.castShadow = false; }
    update() { for (let i = ripples.length; i--;) if ((ripples[i].t += timeDelta) > 1.6) ripples.splice(i, 1); }
    render3D()
    {
        for (const r of ripples)
        {
            const rad = (.2 + r.t * 1.1) * r.scale, a = (1 - r.t / 1.6) * .8;
            const pts = [], side = [];
            for (let i = 0; i <= 24; i++)
            {
                const ang = i / 24 * TAU, d = vec3(Math.cos(ang), 0, Math.sin(ang));
                pts.push(r.pos.add(d.scale(rad)).add(vec3(0, .03, 0)));
                side.push(d);
            }
            render3D.drawRibbon(pts, .06, undefined, r.color.withAlpha(a), side);
        }
    }
}
