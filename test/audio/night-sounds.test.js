import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crackle, crickets, frog, rms, water } from '../../src/audio/night-sounds.js';

const check = (name, chans)=>
{
    for (const c of chans)
    {
        assert.ok(c.length > 1000, `${name}: has samples`);
        let peak = 0;
        for (const v of c) { assert.ok(Number.isFinite(v), `${name}: finite`); peak = Math.max(peak, Math.abs(v)); }
        assert.ok(peak <= 1 && peak > .5, `${name}: peak ${peak}`);
    }
    assert.ok(rms(chans) > .01, `${name}: not silent`);
};

test('the night loops build, in stereo, and wrap round without a jump', ()=>
{
    for (const [name, chans] of [['crickets', crickets()], ['water', water()], ['crackle', crackle()]])
    {
        assert.equal(chans.length, 2, name);
        check(name, chans);
        // the step from the last sample back to the first is no bigger than the sound's own steps
        const c = chans[0];
        let most = 0;
        for (let i = 1; i < c.length; i++) most = Math.max(most, Math.abs(c[i] - c[i - 1]));
        assert.ok(Math.abs(c[0] - c[c.length - 1]) <= most, `${name}: seamless`);
    }
});
test('there are three different frogs', ()=>
{
    const frogs = [0, 1, 2].map((v)=> frog(v));
    frogs.forEach((f, i)=> check(`frog ${i}`, [f]));
    assert.notDeepEqual(frogs[0], frogs[1]);
});
