import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleCurve } from '../../src/lib/curve.js';

test('sampleCurve passes through every control point and ends on the last', ()=>
{
    const pts = [[0, 0], [10, 0], [10, 10]];
    const out = sampleCurve(pts, 1);
    for (const [x, z] of pts) assert.ok(out.some(([a, b])=> Math.hypot(a - x, b - z) < 1e-9), `${x},${z} is on the curve`);
    assert.deepEqual(out[out.length - 1], [10, 10]);
});
test('sampleCurve takes length / step samples per segment, plus the end point', ()=>
{
    const out = sampleCurve([[0, 0], [20, 0]], 2);
    assert.equal(out.length, 20 / 2 + 1);
    // a straight segment stays straight and in order
    for (let i = 0; i < out.length; i++) assert.ok(out[i][1] === 0 && out[i][0] >= 0 && out[i][0] <= 20 && (i === 0 || out[i][0] > out[i - 1][0]));
});
