// Tiny sound synthesis: oscillators, filters and envelopes that write mono samples into a Float32Array.
// Every sound effect is built from these at startup, so there are no audio files. Pure math, no engine or DOM.

export const RATE = 44100;
const TAU = Math.PI * 2;

// waves take a phase in cycles and return -1..1
export const sine = (p)=> Math.sin(p * TAU);
export const tri = (p)=> 1 - 4 * Math.abs(p - Math.floor(p + .5));
export const saw = (p)=> 2 * (p - Math.floor(p + .5));
export const square = (p, duty = .5)=> (p - Math.floor(p)) < duty ? 1 : -1;

// Renders `seconds` of sound by calling fn(t, i) for each sample. The ends fade over a few samples so nothing clicks.
export function render(seconds, fn, rate = RATE)
{
    const n = Math.max(1, Math.round(seconds * rate));
    const out = new Float32Array(n);
    const edge = Math.min(96, n / 4);
    for (let i = 0; i < n; i++)
    {
        const v = fn(i / rate, i) || 0;
        const fade = Math.min(1, i / edge, (n - 1 - i) / edge);
        out[i] = Math.max(-1, Math.min(1, v)) * fade;
    }
    return out;
}

// An oscillator whose frequency can change over time without clicks: it accumulates phase.
// freq is a number or a function of time; wave is one of the waves above.
export function osc(freq, wave = sine, rate = RATE)
{
    let phase = 0;
    const f = typeof freq === 'function' ? freq : ()=> freq;
    return (t)=>
    {
        const v = wave(phase);
        phase += f(t) / rate;
        return v;
    };
}

// Seeded white noise, -1..1, so a sound comes out the same every time it is built.
export function noise(seed = 1)
{
    let a = seed >>> 0;
    return ()=>
    {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1;
    };
}

// A state-variable filter. Call it with a sample, a cutoff in Hz and a resonance q (.5 is gentle, 10 rings);
// it returns { lp, bp, hp } for that sample.
export function svf(rate = RATE)
{
    let low = 0, band = 0;
    return (x, cutoff, q = .7)=>
    {
        const f = 2 * Math.sin(Math.PI * Math.min(cutoff, rate / 6) / rate);
        const damp = 1 / Math.max(.5, q);
        low += f * band;
        const high = x - low - damp * band;
        band += f * high;
        return { lp: low, bp: band, hp: high };
    };
}

// envelopes, all functions of time in seconds
export const clamp01 = (x)=> x < 0 ? 0 : x > 1 ? 1 : x;
// a quick rise then an exponential fall
export const pluck = (t, attack, decay)=> clamp01(t / Math.max(attack, 1e-4)) * Math.exp(-Math.max(0, t - attack) * decay);
// rises, holds, falls, as a smooth sine arch over `length`
export const arch = (t, length)=> t < 0 || t > length ? 0 : Math.sin(Math.PI * t / length);
// linear pieces through [time, value] points, holding the ends
export function ramp(points)
{
    return (t)=>
    {
        if (t <= points[0][0]) return points[0][1];
        for (let i = 1; i < points.length; i++)
        {
            const [t1, v1] = points[i], [t0, v0] = points[i - 1];
            if (t <= t1) return v0 + (v1 - v0) * (t - t0) / (t1 - t0 || 1);
        }
        return points[points.length - 1][1];
    };
}

// scales samples so the loudest one is at `peak`
export function normalize(samples, peak = .9)
{
    let m = 0;
    for (const s of samples) m = Math.max(m, Math.abs(s));
    if (m > 0) for (let i = 0; i < samples.length; i++) samples[i] *= peak / m;
    return samples;
}

export const noteHz = (semitonesFromA4)=> 440 * 2 ** (semitonesFromA4 / 12);
