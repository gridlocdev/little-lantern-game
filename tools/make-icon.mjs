// Draws the app icon, build/icon.png (1024 x 1024), from shapes: the floating island under the moon, with the moth
// and its lantern on top. electron-builder turns it into the .icns, .ico and Linux icons when packaging.
// No dependencies: each pixel is shaded from 4 x 4 samples and the PNG is written by hand.
//     node tools/make-icon.mjs [out.png] [size] [--bleed]
// --bleed fills the whole square, opaque, for a phone's home screen: iOS and Android round the corners themselves,
// and a transparent margin shows there as a shrunken icon on a plain plate (or no icon at all)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const args = process.argv.slice(2).filter((a)=> a !== '--bleed');
const BLEED = process.argv.includes('--bleed');
const OUT = args[0] || 'build/icon.png';
const N = +(args[1] || 1024);
const SS = 4;

// ---------------------------------------------------------------- helpers, in a 0..1 square with y going down
const hex = (h)=> [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mix = (a, b, t)=> a.map((v, i)=> v + (b[i] - v) * t);
const clamp = (x, lo = 0, hi = 1)=> Math.min(hi, Math.max(lo, x));
const sstep = (a, b, x)=> { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const len = (x, y)=> Math.hypot(x, y);
const rot = (x, y, a)=> [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const inEllipse = (x, y, cx, cy, rx, ry, a = 0)=> { const [u, v] = rot(x - cx, y - cy, -a); return (u / rx) ** 2 + (v / ry) ** 2 <= 1; };
function rng(seed) { return ()=> { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

// macOS keeps the artwork inside an 824 px rounded square on a 1024 canvas
const M = 100 / 1024, S = 1 - 2 * M;
const inSquircle = (x, y)=> { if (BLEED) return true; const u = Math.abs((x - .5) / (S / 2)), v = Math.abs((y - .5) / (S / 2)); return u ** 5 + v ** 5 <= 1; };

const C = {
    skyTop: hex('#2b1765'), skyBottom: hex('#0a0522'), haze: hex('#7a5ae6'),
    moon: hex('#fff0c9'), moonGlow: hex('#ffd99a'),
    grass: hex('#6f55d6'), grassLight: hex('#a58cff'), rim: hex('#c9b8ff'),
    rock: hex('#45309a'), rockDeep: hex('#1c1050'), crystal: hex('#7fe3e0'),
    wing: hex('#efe6ff'), wingShade: hex('#c3b0f5'), spot: hex('#ffb86b'), body: hex('#3a2470'),
    lantern: hex('#ffcd78'), lanternCore: hex('#fff6dc'),
};

const r = rng(7);
const stars = Array.from({ length: 70 }, ()=> ({ x: .1 + r() * .8, y: .1 + r() * .5, s: .0015 + r() ** 3 * .006, b: .4 + r() * .6 }));
const shards = [[-.16, .045, .1], [-.07, .07, .14], [.03, .05, .11], [.12, .06, .09], [.2, .03, .07]];

// island geometry
const IX = .5, IY = .6, IRX = .31, IRY = .075, TIP = .87;
const LANTERN = [.585, .5];

// solid shapes, front to back: returns a color or null
function solid(x, y)
{
    // the moth: two wings, a body, antennae; it stands on the island, holding the lantern out to the right
    const mx = .5, my = .47;
    if (len(x - LANTERN[0], y - LANTERN[1]) < .02) return mix(C.lantern, C.lanternCore, 1 - len(x - LANTERN[0], y - LANTERN[1]) / .02);
    if (Math.abs(x - (LANTERN[0] - .006)) < .0025 && y > LANTERN[1] - .045 && y < LANTERN[1] - .018) return C.body;   // the handle
    if (inEllipse(x, y, mx, my + .005, .022, .052)) return mix(C.body, C.wingShade, .15);
    if (inEllipse(x, y, mx, my - .062, .02, .02)) return C.body;
    for (const s of [-1, 1])
    {
        // antennae: thin arcs ending in a dot
        const ax = mx + s * .012, ay = my - .078;
        for (let k = 0; k <= 1; k += .02) { const px = ax + s * k * .035, py = ay - k * .05 + k * k * .02; if (len(x - px, y - py) < .0028) return C.body; }
        if (len(x - (ax + s * .035), y - (ay - .03)) < .0065) return C.lantern;
        // wings: a big upper and a smaller lower, tilted out
        const up = inEllipse(x, y, mx + s * .062, my - .022, .07, .045, s * -.5), lo = inEllipse(x, y, mx + s * .045, my + .03, .045, .032, s * .45);
        if (up || lo)
        {
            if (len(x - (mx + s * .075), y - (my - .03)) < .016) return C.spot;
            const edge = up ? sstep(.6, 1, ((x - mx - s * .062) / .07) ** 2 + ((y - my + .022) / .045) ** 2) : .5;
            return mix(C.wing, C.wingShade, edge);
        }
    }
    // the island's grassy top
    if (inEllipse(x, y, IX, IY, IRX, IRY))
    {
        const v = (y - (IY - IRY)) / (2 * IRY);
        const rimT = sstep(.82, 1, ((x - IX) / IRX) ** 2 + ((y - IY) / IRY) ** 2);
        return mix(mix(C.grassLight, C.grass, v), C.rim, rimT * .6);
    }
    // crystals hanging from its lower edge
    for (const [dx, , h] of shards)
    {
        const cx = IX + dx, y0 = TIP - Math.pow(Math.abs(dx) / IRX, 1 / .75) * (TIP - IY) - .02, y1 = y0 + h * .6, hw = .017;
        if (y > y0 && y < y1 && Math.abs(x - cx) < hw * (1 - (y - y0) / (y1 - y0))) return mix(C.crystal, C.rim, (x - cx + hw) / (2 * hw) * .6);
    }
    // the rocky underside, narrowing to a point, lit from the left
    if (y > IY && y < TIP)
    {
        const k = (TIP - y) / (TIP - IY);
        const w = IRX * Math.pow(k, .75) * (1 + .05 * Math.sin(y * 90));
        const u = (x - IX) / w;
        if (Math.abs(u) < 1) return mix(mix(C.rock, C.rockDeep, (1 - k) * .6), C.grass, sstep(-.55, -1, u) * .45);
    }
    // the moon
    if (len(x - .74, y - .27) < .075) return mix(C.moon, C.moonGlow, sstep(.04, .075, len(x - .74, y - .27)) * .5);
    return null;
}
// the sky behind, with stars, haze and glows
function sky(x, y)
{
    let c = mix(C.skyTop, C.skyBottom, sstep(.08, .95, y));
    c = mix(c, C.haze, Math.exp(-((len(x - .5, (y - .62) * 1.6)) ** 2) / .03) * .5);
    for (const s of stars) { const d = len(x - s.x, y - s.y); if (d < s.s * 3) c = mix(c, [1, 1, 1], Math.exp(-((d / s.s) ** 2)) * s.b); }
    return c;
}
// light added over everything: the lantern's warm glow and the moon's halo
function glow(x, y)
{
    const l = Math.exp(-(len(x - LANTERN[0], y - LANTERN[1]) ** 2) / .006) * .55;
    const m = Math.exp(-(len(x - .74, y - .27) ** 2) / .012) * .35;
    return [C.lantern.map((v)=> v * l), C.moonGlow.map((v)=> v * m)];
}

// ---------------------------------------------------------------- render
const px = Buffer.alloc(N * N * 4);
for (let j = 0; j < N; j++)
for (let i = 0; i < N; i++)
{
    let rr = 0, gg = 0, bb = 0, aa = 0;
    for (let sy = 0; sy < SS; sy++)
    for (let sx = 0; sx < SS; sx++)
    {
        const x = (i + (sx + .5) / SS) / N, y = (j + (sy + .5) / SS) / N;
        if (!inSquircle(x, y)) continue;
        let c = solid(x, y) || sky(x, y);
        const [l, m] = glow(x, y);
        c = c.map((v, k)=> 1 - (1 - v) * (1 - l[k]) * (1 - m[k]));    // screen blend
        rr += c[0]; gg += c[1]; bb += c[2]; aa++;
    }
    const o = (j * N + i) * 4, n = SS * SS;
    if (aa)
    {
        px[o] = Math.round(clamp(rr / aa) * 255); px[o + 1] = Math.round(clamp(gg / aa) * 255); px[o + 2] = Math.round(clamp(bb / aa) * 255);
    }
    px[o + 3] = Math.round(aa / n * 255);
}

// ---------------------------------------------------------------- PNG
const crcTable = Array.from({ length: 256 }, (_, n)=> { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf)=> { let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data)
{
    const head = Buffer.alloc(8); head.writeUInt32BE(data.length); head.write(type, 4, 'ascii');
    const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])));
    return Buffer.concat([head, data, tail]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;    // 8-bit RGBA
const raw = Buffer.alloc(N * (N * 4 + 1));
for (let j = 0; j < N; j++) px.copy(raw, j * (N * 4 + 1) + 1, j * N * 4, (j + 1) * N * 4);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log(`wrote ${OUT} (${N} x ${N})`);
