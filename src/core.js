import {
    EngineObject3D, Mesh, PI, RandomGenerator, TextureInfo, WHITE, buildMatrix, clamp, hsl, isTouchDevice, max, min,
    noise2D, rgb, setCanvasClearColor, setCanvasPixelRatio, setCanvasPixelated, setShowSplashScreen,
    setSoundDefaultRange, setSoundVolume, setTilesPixelated, setTouchGamepadAlpha, setTouchGamepadAnalog,
    setTouchGamepadButtonCount, setTouchGamepadDisplayTime, setTouchGamepadEnable, setTouchGamepadPassthrough,
    setTouchGamepadSize,
} from './platform/engine.js';

// ---------------------------------------------------------------- engine settings (module bindings are read-only, so through setters)
setShowSplashScreen(false);
setTilesPixelated(false);
setCanvasPixelated(false);
setCanvasClearColor(hsl(.72, .6, .02));
setSoundVolume(.5);
setSoundDefaultRange(60);
setCanvasPixelRatio(Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.25 : 1.5));
setTouchGamepadEnable(isTouchDevice);
setTouchGamepadButtonCount(0);
setTouchGamepadPassthrough(true);
setTouchGamepadAnalog(true);
setTouchGamepadSize(120);
setTouchGamepadAlpha(.35);
setTouchGamepadDisplayTime(0);

// ---------------------------------------------------------------- small helpers
export const TAU = PI * 2;
export const MOBILE = isTouchDevice;
export const mix = (a, b, t)=> a + (b - a) * t;
export const sstep = (a, b, x)=> { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mixColor = (a, b, t)=> rgb(mix(a.r, b.r, t), mix(a.g, b.g, t), mix(a.b, b.b, t), mix(a.a, b.a, t));
export const wrapAngle = (a)=> Math.atan2(Math.sin(a), Math.cos(a));
export const dist2 = (ax, az, bx, bz)=> Math.hypot(ax - bx, az - bz);
export function fbm(x, z, oct = 4)
{
    let s = 0, a = .5, n = 0;
    for (let i = 0; i < oct; i++) { s += a * noise2D(x, z); n += a; x = x * 2.03 + 17.1; z = z * 2.03 - 9.3; a *= .5; }
    return s / n;
}
// world random, seeded so the island is the same every visit
export const WR = new RandomGenerator(90210);
export const rr = (a, b)=> WR.float(a, b);

// matrix from a parent with a local transform
export function mtx(parent, pos, rot, scale)
{
    const m = buildMatrix(pos, rot, scale);
    return parent ? parent.copy().multiply(m) : m;
}
export function canvasTexture(size, draw, wrap = true)
{
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    return new TextureInfo(c, true, wrap);
}
// a mesh made only of triangles, from flat arrays
export function triMesh(points, indices, normals, colors, uvs)
{
    const m = new Mesh;
    m.addTriangles(points, indices, normals, uvs, colors);
    return m;
}
export function obj3(pos, mesh, color = WHITE, opts = {})
{
    const o = new EngineObject3D(pos, mesh, undefined, color);
    Object.assign(o, opts);
    return o;
}

// catmull-rom through 2D points, sampled about every step meters
export function sampleCurve(pts, step = 1)
{
    const out = [];
    for (let i = 0; i < pts.length - 1; i++)
    {
        const p0 = pts[max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[min(pts.length - 1, i + 2)];
        const len = dist2(p1[0], p1[1], p2[0], p2[1]);
        const n = max(2, Math.ceil(len / step));
        for (let k = 0; k < n; k++)
        {
            const t = k / n, t2 = t * t, t3 = t2 * t;
            const f = (a, b, c, d)=> .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
            out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
}
