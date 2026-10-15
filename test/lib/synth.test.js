import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RATE, arch, noise, normalize, osc, pluck, ramp, render, saw, sine, square, svf, tri } from '../../src/lib/synth.js';

const crossings = (s)=> { let n = 0; for (let i = 1; i < s.length; i++) if ((s[i - 1] < 0) !== (s[i] < 0)) n++; return n; };
const rms = (s)=> Math.sqrt(s.reduce((a, v)=> a + v * v, 0) / s.length);

test('waves stay in -1..1', ()=>
{
    for (const w of [sine, tri, saw, square])
        for (let p = -2; p < 2; p += .013) { const v = w(p); assert.ok(v >= -1 && v <= 1, `${w.name}(${p}) = ${v}`); }
});
test('render makes the right length, clamps, and fades its ends to silence', ()=>
{
    const s = render(.1, ()=> 3);
    assert.equal(s.length, Math.round(.1 * RATE));
    assert.equal(s[0], 0);
    assert.equal(s[s.length - 1], 0);
    assert.equal(s[s.length >> 1], 1);
});
test('osc plays the frequency it is given', ()=>
{
    const o = osc(440);
    const s = render(1, (t)=> o(t));
    assert.ok(Math.abs(crossings(s) - 880) <= 3, `crossings ${crossings(s)}`);
});
test('osc follows a frequency that changes', ()=>
{
    const o = osc((t)=> t < .5 ? 200 : 400);
    const s = render(1, (t)=> o(t));
    assert.ok(Math.abs(crossings(s) - 600) <= 4, `crossings ${crossings(s)}`);
});
test('noise is seeded and spread across -1..1', ()=>
{
    const a = noise(7), b = noise(7);
    let lo = 1, hi = -1;
    for (let i = 0; i < 2000; i++) { const v = a(); assert.equal(v, b()); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    assert.ok(lo < -.9 && hi > .9);
});
test('the band-pass filter keeps its band and drops what is far from it', ()=>
{
    const band = (hz)=> { const f = svf(), o = osc(hz); return rms(render(.5, (t)=> f(o(t), 1000, 4).bp)); };
    assert.ok(band(1000) > band(100) * 4);
    assert.ok(band(1000) > band(8000) * 4);
});
test('envelopes', ()=>
{
    assert.equal(pluck(0, .01, 10), 0);
    assert.ok(Math.abs(pluck(.01, .01, 10) - 1) < 1e-9);
    assert.ok(pluck(.5, .01, 10) < .01);
    assert.equal(arch(-1, 1), 0);
    assert.ok(Math.abs(arch(.5, 1) - 1) < 1e-9);
    const r = ramp([[0, 1], [1, 3], [2, 2]]);
    assert.equal(r(-1), 1); assert.equal(r(.5), 2); assert.equal(r(1.5), 2.5); assert.equal(r(9), 2);
});
test('normalize sets the peak', ()=>
{
    const s = normalize(Float32Array.from([.1, -.2, .05]), .8);
    assert.ok(Math.abs(Math.min(...s) + .8) < 1e-6);
});
