import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAU, dist2, mix, sstep, wrapAngle } from '../../src/lib/math.js';

test('mix interpolates', ()=> { assert.equal(mix(2, 4, .5), 3); assert.equal(mix(2, 4, 0), 2); });
test('sstep clamps and eases', ()=>
{
    assert.equal(sstep(0, 1, -1), 0);
    assert.equal(sstep(0, 1, 2), 1);
    assert.equal(sstep(0, 1, .5), .5);
});
test('wrapAngle folds into -PI..PI', ()=> assert.ok(Math.abs(wrapAngle(TAU + 1) - 1) < 1e-9));
test('dist2 is the distance on the ground plane', ()=> assert.equal(dist2(0, 0, 3, 4), 5));
