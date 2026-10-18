// How each sound effect is made. Each recipe returns mono samples at RATE; sfx.js turns them into engine sounds.
// Most island sounds are pitched and shaped (knocks, bubbles, voices, bells) rather than raw noise; noise only ever
// comes through a filter, as wind, water or a mouth. Imports only lib/, so tests can build every sound in node.
import { arch, noise, normalize, osc, pluck, ramp, render, saw, sine, square, svf, tri } from '../lib/synth.js';
import { mix } from '../lib/math.js';

const R = (seconds, fn, peak)=> normalize(render(seconds, fn), peak);
const exp = Math.exp;

// partials of a struck metal bar: [ratio, level, decay]
const BELL = [[1, 1, 2.2], [2.01, .45, 3.6], [2.76, .32, 5], [4.07, .18, 7], [5.43, .1, 9.5]];
function chime(f, t, decayScale = 1)
{
    let s = 0;
    for (const [r, a, d] of BELL) s += sine(f * r * t) * a * pluck(t, .002, d * decayScale);
    return s;
}
// a pure tone that fades in (no struck click) with a whisper of the octave, then dies away gently
function glow(f, t, decay, attack = .02)
{
    if (t < 0) return 0;
    return (sine(f * t) + sine(f * 2 * t) * .12) * pluck(t, attack, decay) * (1 + .15 * sine(5 * t));
}
// a vowel: a buzzy source through two formant band-passes that follow F1 and F2 over time
function vowel(f0, f1, f2, q = 6)
{
    const src = osc(f0, (p)=> saw(p) * .7 + square(p, .3) * .3), a = svf(), b = svf();
    return (t)=> { const x = src(t); return a(x, f1(t), q).bp + b(x, f2(t), q).bp * .65; };
}

export const RECIPES = {
    // a soft pat on grass: a low thump and a little muffled crunch
    step()
    {
        const n = noise(3), f = svf(), o = osc((t)=> 90 + 150 * exp(-t * 35));
        return R(.09, (t)=> o(t) * pluck(t, .002, 45) + f(n(), 1100, .6).lp * pluck(t, .001, 60) * 1.4, .2);
    },
    // a knock on floorboards
    stepWood()
    {
        const a = osc(185), b = osc(412), c = osc(980);
        return R(.12, (t)=> a(t) * pluck(t, .001, 38) + b(t) * pluck(t, .001, 60) * .5 + c(t) * pluck(t, .0005, 160) * .3, .26);
    },
    // wings: a rising chirp that flutters
    jump()
    {
        const o = osc(ramp([[0, 320], [.16, 640]]), tri), n = noise(5), f = svf();
        return R(.2, (t)=>
        {
            const flutter = .55 + .45 * sine(34 * t);
            return (o(t) * .7 + f(n(), 500, .8).lp * 1.6) * flutter * arch(t, .2);
        }, .3);
    },
    // a soft plump down
    land()
    {
        const o = osc((t)=> 45 + 70 * exp(-t * 25)), n = noise(9), f = svf();
        return R(.2, (t)=> o(t) * pluck(t, .002, 18) + f(n(), 380, .6).lp * pluck(t, .001, 40) * 1.5, .3);
    },
    // a mushroom cap springing back
    boing()
    {
        const o = osc((t)=> 150 + 130 * Math.sin(t * 11 * Math.PI * 2) * exp(-t * 4) + 70 * t, (p)=> sine(p) * .8 + tri(p) * .2);
        return R(.65, (t)=> o(t) * pluck(t, .004, 3.6), .5);
    },
    // a glass chime at C5; played at other pitches for notes
    bell: ()=> R(2.4, (t)=> chime(523.25, t), .5),
    // a plucked string
    pluck()
    {
        const o = osc(261.63, saw), f = svf();
        return R(1, (t)=> f(o(t), 400 + 3500 * exp(-t * 9), .9).lp * pluck(t, .003, 4), .3);
    },
    // water: a slap, then bubbles rising
    splash()
    {
        const n = noise(11), f = svf(), bubbles = [];
        const r = noise(12);
        for (let i = 0; i < 9; i++) bubbles.push({ at: .03 + (r() + 1) * .17, f: 450 + (r() + 1) * 400 });
        const bub = bubbles.map((b)=> osc((t)=> b.f * (1 + 1.4 * Math.min(1, Math.max(0, t - b.at) / .05))));
        return R(.5, (t)=>
        {
            let s = f(n(), 600 + 2400 * exp(-t * 14), .7).lp * pluck(t, .004, 9) * 1.1;
            bubbles.forEach((b, i)=> { const v = bub[i](t); if (t > b.at) s += v * pluck(t - b.at, .002, 55) * .5; });
            return s;
        }, .45);
    },
    // a bubble popping at the surface: pitch rises
    plop()
    {
        const o = osc((t)=> 280 + 900 * (1 - exp(-t * 35)));
        return R(.13, (t)=> o(t) * pluck(t, .002, 30), .45);
    },
    // a tug on the line: two quick twangs
    bite()
    {
        const o = osc((t)=> 640 * (1 - .25 * (t % .09) / .09), tri);
        return R(.22, (t)=> o(t) * (pluck(t, .001, 30) + (t > .09 ? pluck(t - .09, .001, 30) : 0)), .5);
    },
    // a reel click
    tick()
    {
        const o = osc(2300, (p)=> square(p, .2)), b = osc(700);
        return R(.03, (t)=> (o(t) * .5 + b(t)) * pluck(t, 0, 220), .14);
    },
    // a line snapping: a falling twang and a crack
    snap()
    {
        const o = osc((t)=> 150 + 750 * exp(-t * 14), saw), f = svf(), c = osc(2600);
        return R(.32, (t)=> f(o(t), 2800, .8).lp * pluck(t, .001, 12) + c(t) * pluck(t, 0, 120) * .6, .4);
    },
    // stardust: a soft, airy rise of pure tones, each fading in rather than struck, over a faint breath of air
    collect()
    {
        const notes = [[783.99, 0], [1046.5, .07], [1318.5, .14], [1567.98, .21]], n = noise(19), f = svf();
        return R(1.3, (t)=>
        {
            let s = 0;
            notes.forEach(([hz, at], i)=> { if (t > at) s += glow(hz, t - at, 3.2) * (1 - i * .18); });
            return s + f(n(), 2600, 2.5).bp * arch(t, .5) * .06;
        }, .16);
    },
    // a star coming down to land: a low warm tone swelling in, with a higher one hovering above it
    starfall: ()=> R(1.6, (t)=> glow(392, t, 2.2, .05) + glow(587.33, t - .12, 2.6, .08) * .45, .14),
    // air rushing past: filtered noise whose band sweeps up and back down
    whoosh()
    {
        const n = noise(21), f = svf(), band = ramp([[0, 350], [.25, 1300], [.55, 500]]), o = osc(ramp([[0, 90], [.55, 60]]));
        return R(.55, (t)=> (f(n(), band(t), 1.4).bp * 1.6 + o(t) * .25) * arch(t, .55), .3);
    },
    // the fire catching: a soft low whump and a few pops
    ignite()
    {
        const o = osc(ramp([[0, 50], [.3, 80], [.7, 45]])), n = noise(23), f = svf(), p = svf(), pops = [.18, .33, .41, .58];
        return R(.75, (t)=>
        {
            let s = o(t) * arch(t, .7) + f(n(), 200 + 900 * arch(t, .7), .7).lp * arch(t, .7) * 1.2;
            let pulse = 0;
            for (const at of pops) if (t > at) pulse += exp(-(t - at) * 300);
            return s + p(pulse * 4, 2200, 2).bp * .4;
        }, .45);
    },
    // a sheep: "baa", a buzzy voice through an "a" vowel with a wobble
    bleat()
    {
        const v = vowel((t)=> 300 * (1 + .035 * sine(23 * t)) * (1 - .1 * t / .6), ramp([[0, 350], [.05, 780], [.6, 700]]), ramp([[0, 900], [.05, 1250], [.6, 1150]]), 7);
        return R(.6, (t)=> v(t) * ramp([[0, 0], [.04, 1], [.35, .8], [.6, 0]])(t), .38);
    },
    // a cat purring: a low buzz pulsing about 26 times a second, breathing in and then out
    purr()
    {
        const pulse = osc(26), o = osc(52, saw), f = svf(), n = noise(31), g = svf();
        const breath = ramp([[0, 0], [.15, .55], [.85, .5], [.95, 0], [1.05, 0], [1.2, 1], [2, .9], [2.2, 0]]);
        return R(2.2, (t)=>
        {
            const beat = Math.max(0, pulse(t)) ** 3;
            return (f(o(t), 380, .8).lp + g(n(), 260, .7).lp * 1.2) * beat * breath(t);
        }, .5);
    },
    // a soft mew, not a yowl. Domestic cat meows arch from about 500 to 880 Hz over .8 s (Nicastro 2004); a gentle,
    // content one is shorter and stays low. A rounder, breathier voice than a full meow, most of its buzz filtered off,
    // shaped by two soft resonances: a little hum with the mouth closed, a brief "eh", and a fall as it trails away.
    meow()
    {
        const len = .5;
        const pitch = ramp([[0, 560], [.1, 680], [.24, 700], [len, 520]]);
        const src = osc((t)=> pitch(t) * (1 + .01 * sine(6 * t)), (p)=> tri(p) * .7 + saw(p) * .3);
        const f1 = ramp([[0, 700], [.12, 1100], [.3, 1000], [len, 750]]);
        const f2 = ramp([[0, 1800], [.14, 2300], [.3, 2100], [len, 1500]]);
        const nasal = ramp([[0, 1], [.06, 1], [.14, 0], [len, 0]]);          // the hum before the mouth opens
        const amp = ramp([[0, 0], [.06, .5], [.16, 1], [.32, .75], [len, 0]]);
        const a = svf(), b = svf(), m = svf(), soft = svf(), n = noise(33);
        return R(len, (t)=>
        {
            const v = src(t), x = v + n() * .08;                              // breathy
            const open = a(x, f1(t), 3).bp + b(x, f2(t), 3.5).bp * .5;
            const hum = m(v, 360, 1.5).bp;
            return soft(mix(open, hum * 1.4, nasal(t)) * amp(t), 2600, .6).lp;
        }, .14);
    },
    // a wooden door: a creaking hinge, then the latch
    door()
    {
        const rate = (t)=> 70 + 35 * Math.sin(t * 9) + 20 * Math.sin(t * 23);
        const stick = osc(rate, (p)=> (p - Math.floor(p)) < .08 ? 1 : 0), a = svf(), b = svf();
        const thud = osc((t)=> 60 + 80 * exp(-Math.max(0, t - .48) * 30)), knock = osc(310);
        return R(.75, (t)=>
        {
            const x = stick(t);
            let s = (a(x, 650, 5).bp + b(x, 1500, 6).bp * .6) * arch(t, .45);
            if (t > .48) s += (thud(t) * 1.4 + knock(t) * .5) * pluck(t - .48, .001, 28);
            return s;
        }, .4);
    },
    // a soft bubble when the dialog opens
    pop()
    {
        const o = osc((t)=> 480 + 500 * (1 - exp(-t * 40)));
        return R(.1, (t)=> o(t) * pluck(t, .002, 40), .3);
    },
    // a soft wooden tok when the dialog turns a page
    tok()
    {
        const a = osc(880), b = osc(1980);
        return R(.08, (t)=> a(t) * pluck(t, .001, 50) + b(t) * pluck(t, .001, 90) * .35, .2);
    },
    // a kettle singing: a narrow whistle with a wobble, rising as it builds
    whistle()
    {
        const o = osc((t)=> (1500 + 200 * Math.min(1, t / .8)) * (1 + .015 * sine(5.5 * t))), n = noise(41), f = svf();
        const amp = ramp([[0, 0], [.35, 1], [1.05, 1], [1.4, 0]]);
        return R(1.4, (t)=> (o(t) + f(n(), 1600, 14).bp * .5) * amp(t), .25);
    },
    // one pop from the fire
    crackle()
    {
        const n = noise(43), f = svf(), o = osc(170);
        return R(.06, (t)=> f(n(), 2600, 2).bp * pluck(t, 0, 130) * 1.4 + o(t) * pluck(t, 0, 70) * .5, .2);
    },
    // the swing's rope creaking on the branch
    creak()
    {
        const stick = osc(ramp([[0, 38], [.3, 85]]), (p)=> (p - Math.floor(p)) < .1 ? 1 : 0), a = svf(), b = svf();
        return R(.32, (t)=> { const x = stick(t); return (a(x, 560, 6).bp + b(x, 1350, 7).bp * .5) * arch(t, .32); }, .2);
    },
    // the sky whale singing: a slow gliding moan with soft harmonics
    whale()
    {
        const f0 = ramp([[0, 85], [1, 135], [2.1, 112], [3.4, 68]]);
        const o = osc((t)=> f0(t) * (1 + .01 * sine(3.2 * t)), (p)=> sine(p) + sine(p * 2) * .4 + sine(p * 3) * .15), f = svf();
        const amp = ramp([[0, 0], [1, 1], [2.4, .85], [3.4, 0]]);
        return R(3.4, (t)=> f(o(t), 700, .7).lp * amp(t), .55);
    },
    // a switch: two little clicks
    click()
    {
        const o = osc(1700, (p)=> square(p, .25)), b = osc(320);
        return R(.09, (t)=> { const e = pluck(t, 0, 260) + (t > .045 ? pluck(t - .045, 0, 300) * .7 : 0); return (o(t) * .4 + b(t)) * e; }, .25);
    },
    // a card or the journal opening: two soft rising tones, like a breath
    open: ()=> R(.55, (t)=> glow(523.25, t, 7, .012) * .8 + glow(783.99, t - .06, 6, .012) * .6, .12),
    // a sip of tea: a slurp, then a gulp
    sip()
    {
        const s = osc((t)=> 260 + 300 * t / .18), g = osc((t)=> 430 * exp(-Math.max(0, t - .2) * 9)), n = noise(51), f = svf();
        return R(.34, (t)=>
        {
            let v = (s(t) * .6 + f(n(), 900, 3).bp) * (.6 + .4 * sine(31 * t)) * arch(t, .18);
            if (t > .2) v += g(t) * arch(t - .2, .12);
            return v;
        }, .3);
    },
    // a cast: the rod swishes and the reel whirs out
    cast()
    {
        const n = noise(53), f = svf(), band = ramp([[0, 2500], [.15, 700]]), clicks = osc(ramp([[0, 55], [.45, 12]]), (p)=> (p - Math.floor(p)) < .15 ? 1 : 0), c = svf();
        return R(.48, (t)=> f(n(), band(t), 1.6).bp * arch(t, .18) * 1.3 + c(clicks(t), 3200, 4).bp * .8 * (1 - t / .48), .35);
    },

    // ------------------------------------------------------------ cutscenes and voices
    // one syllable of a voice, Animal Crossing style; each speaker plays it at their own pitch
    voice()
    {
        const o = osc((t)=> 330 * (1 + .08 * exp(-t * 30)), (p)=> tri(p) * .7 + sine(p * 2) * .3);
        return R(.075, (t)=> o(t) * pluck(t, .003, 26), .32);
    },
    // a warm chord swelling up under a title or a reveal
    swell()
    {
        const notes = [130.81, 196, 261.63, 329.63, 392, 493.88, 587.33], f = svf();
        const oscs = notes.map((hz, i)=> osc(hz * (1 + (i % 2 ? .003 : -.003)), (p)=> saw(p) * .5 + sine(p) * .5));
        const amp = ramp([[0, 0], [1.6, 1], [2.4, .9], [3.6, 0]]);
        return R(3.6, (t)=> { let s = 0; for (const o of oscs) s += o(t); return f(s, 300 + 1600 * amp(t), .7).lp * amp(t); }, .35);
    },
    // a rising glissando of tiny bells
    shimmer: ()=> R(1.6, (t)=>
    {
        let s = 0;
        for (let i = 0; i < 12; i++) { const at = i * .08; if (t > at) s += chime(1046.5 * 2 ** ((i * 2 + (i % 3)) / 12), t - at, 3) * .5; }
        return s;
    }, .32),
    // a happy word: three quick notes hopping up a major chord, each with a little upward flick, and a sparkle on top
    joy()
    {
        const notes = [587.3, 740, 880].map((f, i)=>
        {
            const at = i * .075;
            const flick = (t)=> f * (1 + .06 * exp(-Math.max(0, t - at) * 60));    // each note flicks up into place
            return { at, lo: osc(flick), hi: osc((t)=> flick(t) * 2, tri), level: 1 + i * .15 };
        });
        return R(1.1, (t)=>
        {
            let s = 0;
            for (const n of notes)
            {
                const lo = n.lo(t), hi = n.hi(t);     // both run from the start so their phase stays continuous
                if (t > n.at) s += (lo * .8 + hi * .2) * pluck(t - n.at, .003, 9) * n.level;
            }
            if (t > .22) s += chime(1760, t - .22, 1.6) * .45;
            return s;
        }, .4);
    },
    // a deep soft hit under a big word
    thrum()
    {
        const o = osc((t)=> 34 + 46 * exp(-t * 9)), n = noise(61), f = svf();
        return R(1.1, (t)=> o(t) * pluck(t, .004, 4) + f(n(), 180, .7).lp * pluck(t, .001, 18) * 1.4, .5);
    },
};
