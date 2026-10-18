// The island's night, as sounds built at startup: loops of crickets, water lapping and the crackle and hiss of an old
// record, and a few frog calls to drop in now and then. audio/night.js plays them. Imports only lib/, so tests can
// build them in node.
//
// A loop has no seam: short sounds that run past its end wrap round to its start, rhythms repeat a whole number of
// times in it, and the noise beds are rendered a little long with the extra crossfaded into their start.
import { RATE, noise, osc, saw, sine, svf } from '../lib/synth.js';

const TAU = Math.PI * 2;
// seeded 0..1, so the night sounds the same every time
const random = (seed)=> { const n = noise(seed); return ()=> (n() + 1) / 2; };
const stereo = (seconds)=> { const n = Math.round(seconds * RATE); return [new Float32Array(n), new Float32Array(n)]; };

// adds fn(t) for `length` seconds at `at` into both channels, panned (0 left .. 1 right), wrapping past the end
function stamp(out, at, length, pan, fn)
{
    const l = out[0], r = out[1], n = l.length, start = Math.round(at * RATE), count = Math.round(length * RATE);
    const gl = Math.cos(pan * Math.PI / 2), gr = Math.sin(pan * Math.PI / 2);
    for (let i = 0; i < count; i++)
    {
        const v = fn(i / RATE), k = ((start + i) % n + n) % n;
        l[k] += v * gl; r[k] += v * gr;
    }
}
// fills a channel from fn(i) for every sample, seamlessly: a second's worth past the end fades into the start
function bed(out, fn)
{
    const n = out.length, fade = Math.min(RATE, n >> 2);
    for (let i = 0; i < n + fade; i++)
    {
        const v = fn(i);
        if (i < n) out[i] += v;
        else { const k = (i - n) / fade; out[i - n] = out[i - n] * Math.sin(k * Math.PI / 2) + v * Math.cos(k * Math.PI / 2); }
    }
}
function normalize(chans, peak = .9)
{
    let m = 0;
    for (const c of chans) for (const v of c) m = Math.max(m, Math.abs(v));
    if (m > 0) for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= peak / m;
    return chans;
}

// a few crickets around you, each chirping its own steady rhythm, over the far-off trill of a field of them
export function crickets(seconds = 12)
{
    const out = stereo(seconds), r = random(7);
    for (let c = 0; c < 7; c++)
    {
        const f = 4100 + r() * 1300, pan = .1 + r() * .8, level = c < 3 ? .6 + r() * .4 : .2 + r() * .25;
        const count = Math.round(seconds / (.5 + r() * .55)), period = seconds / count;
        const pulses = 2 + Math.floor(r() * 3), gap = .03 + r() * .012, off = r() * period;
        for (let k = 0; k < count; k++)
            for (let p = 0; p < pulses; p++)
                stamp(out, off + k * period + (r() - .5) * .012 + p * gap, .018, pan,
                    (t)=> sine(f * t) * Math.sin(Math.PI * t / .018) ** 2 * level * (p === pulses - 1 ? .7 : 1));
    }
    out.forEach((ch, side)=>
    {
        const n = noise(11 + side), bp = svf();
        const trill = Math.round(18 * seconds) / seconds;      // a whole number of pulses in the loop
        bed(ch, (i)=> bp(n(), 4600, 9).bp * (.55 + .45 * sine(trill * i / RATE)) * .25);
    });
    return normalize(out);
}

// water lapping at the edge, with a bubble rising now and then
export function water(seconds = 10)
{
    const out = stereo(seconds), r = random(23);
    out.forEach((ch, side)=>
    {
        const n = noise(31 + side), lp = svf(), lp2 = svf();
        // two slow swells that fit the loop a whole number of times
        const a = Math.round(seconds / 2.7) / seconds, b = Math.round(seconds / 4.3) / seconds;
        bed(ch, (i)=>
        {
            const t = i / RATE, swell = .55 + .3 * sine(a * t + side * .3) + .15 * sine(b * t + .6);
            return lp2(lp(n(), 260 + 260 * swell, .8).lp, 900, .6).lp * swell * 3;
        });
    });
    for (let k = 0, count = Math.round(seconds * 1.4); k < count; k++)
    {
        const f0 = 380 + r() * 500, rise = 1.6 + r() * 1.2, len = .03 + r() * .03, level = .12 + r() * .1;
        stamp(out, r() * seconds, len, .15 + r() * .7, (t)=> sine(f0 * (1 + (rise - 1) * t / len) * t) * Math.sin(Math.PI * t / len) ** 2 * level);
    }
    return normalize(out);
}

// a frog: a quick "rib-bit", a buzzy throat through two resonances, fluttering
export function frog(variant = 0)
{
    const pitch = [1, .82, 1.18][variant % 3], seconds = .42;
    const n = Math.round(seconds * RATE), out = new Float32Array(n);
    const croak = (at, len, f0)=>
    {
        const o = osc(f0 * pitch, saw), a = svf(), b = svf();
        for (let i = 0, count = Math.round(len * RATE); i < count; i++)
        {
            const t = i / RATE, x = o(t);
            const env = Math.sin(Math.PI * t / len) ** 1.5 * (.6 + .4 * Math.sin(TAU * 38 * t));
            out[Math.round(at * RATE) + i] += (a(x, 750 * pitch, 5).bp + b(x, 1900 * pitch, 6).bp * .6) * env;
        }
    };
    croak(.01, .1, 105);
    croak(.17, .12, 120);
    return normalize([out])[0];
}

// the hiss and crackle of an old record, very faint, under the music
export function crackle(seconds = 8)
{
    const out = stereo(seconds), r = random(41);
    out.forEach((ch, side)=>
    {
        const n = noise(51 + side), band = svf();
        bed(ch, ()=> band(n(), 5200, .7).bp * .08);
    });
    for (let k = 0, count = Math.round(seconds * 14); k < count; k++)
    {
        const big = r() < .06, level = big ? .5 + r() * .5 : .08 + r() * .2, decay = big ? 900 : 2600, s = noise(61 + k);
        stamp(out, r() * seconds, big ? .012 : .004, r(), (t)=> s() * Math.exp(-t * decay) * level);
    }
    return normalize(out);
}

// root-mean-square level of some channels, to set how loud each sound sits
export function rms(chans)
{
    let sum = 0, count = 0;
    for (const c of chans) for (const v of c) { sum += v * v; count++; }
    return Math.sqrt(sum / Math.max(1, count));
}
