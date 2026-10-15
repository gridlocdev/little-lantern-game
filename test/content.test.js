// The content files import nothing, so they can be checked without the engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS } from '../src/features/house/books-data.js';
import { DREAMS } from '../src/features/house/dreams-data.js';
import { CHIME_NAMES, MOON_SONG } from '../src/features/chimes/song-data.js';
import { CONSTELLATIONS } from '../src/features/telescope/constellations-data.js';
import { SNAIL_LINES, SNAIL_MEETING } from '../src/features/snail/lines-data.js';
import { INTRO_CAPTION, INTRO_LINES } from '../src/features/intro/lines-data.js';
import { BRIDGE_LINES } from '../src/features/moonlet/lines-data.js';
import { WISHES } from '../src/features/overlook/wishes-data.js';

const text = (s)=> typeof s === 'string' && s.trim().length > 0;

test('every book has a title and pages', ()=>
{
    assert.ok(BOOKS.length > 0);
    for (const b of BOOKS) { assert.ok(text(b.title)); assert.ok(b.pages.length > 0 && b.pages.every(text), b.title); }
});
test('dreams, wishes and snail lines are text', ()=>
{
    assert.ok(DREAMS.length > 0 && DREAMS.every(text));
    assert.ok(WISHES.length > 0 && WISHES.every(text));
    assert.ok(SNAIL_LINES.length > 0 && SNAIL_LINES.every((lines)=> lines.length > 0 && lines.every(text)));
});
test('the moon song only uses chimes that exist', ()=>
{
    assert.ok(MOON_SONG.length > 0);
    for (const n of MOON_SONG) assert.ok(Number.isInteger(n) && n >= 0 && n < CHIME_NAMES.length, `note ${n}`);
});
test('constellations: four of them, as the journal promises, each drawable', ()=>
{
    assert.equal(CONSTELLATIONS.length, 4);
    assert.equal(new Set(CONSTELLATIONS.map((c)=> c.id)).size, 4);
    for (const c of CONSTELLATIONS)
    {
        assert.ok(text(c.name) && text(c.desc), c.id);
        assert.ok(c.pts.length > 1 && c.pts.every((p)=> p.length === 2 && p.every(Number.isFinite)), c.id);
        for (const [a, b] of c.lines) assert.ok(a < c.pts.length && b < c.pts.length, `${c.id} line ${a}-${b}`);
    }
});

test('cutscene lines are text, and their kinetic markers come in pairs', ()=>
{
    assert.ok(text(INTRO_CAPTION.title) && text(INTRO_CAPTION.sub));
    for (const set of [INTRO_LINES, SNAIL_MEETING, BRIDGE_LINES])
        for (const [k, line] of Object.entries(set))
        {
            assert.ok(text(line), k);
            for (const word of line.split(/\s+/))
            {
                const m = word[0];
                if ('*~_'.includes(m)) assert.equal(word[word.length - 1], m, `${k}: ${word}`);
            }
        }
});
