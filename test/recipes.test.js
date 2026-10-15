// Every sound recipe builds in node, makes sound, and stays clean.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES } from '../src/audio/recipes.js';

test('every recipe makes a short, finite, audible sound under full scale', ()=>
{
    for (const [name, make] of Object.entries(RECIPES))
    {
        const s = make();
        assert.ok(s instanceof Float32Array && s.length > 100, name);
        assert.ok(s.length < 44100 * 4, `${name} is under four seconds`);
        let peak = 0;
        for (const v of s) { assert.ok(Number.isFinite(v), name); peak = Math.max(peak, Math.abs(v)); }
        assert.ok(peak > .1 && peak <= 1, `${name} peak ${peak}`);
    }
});
test('the cat can meow', ()=> assert.ok(RECIPES.meow));
