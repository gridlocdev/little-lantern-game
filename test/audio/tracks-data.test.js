import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TRACKS } from '../../src/audio/tracks-data.js';

const ROOT = new URL('../../', import.meta.url);
const bar = (t)=> 60 / t.tempo * t.beatsPerBar;
// how far a time is from the nearest bar line, in seconds
const offBar = (t, s)=> { const bars = (s - t.offset) / bar(t); return Math.abs(bars - Math.round(bars)) * bar(t); };

test('the soundtrack has a track for every place and moment the music asks for', ()=>
{
    for (const id of ['intro', 'house', 'outside', 'race', 'ending']) assert.ok(TRACKS[id], id);
});
test('every track file exists and is a real mp3', ()=>
{
    for (const [id, t] of Object.entries(TRACKS))
    {
        const file = new URL(t.file, ROOT);
        assert.ok(fs.existsSync(file), `${id}: ${t.file}`);
        assert.ok(fs.statSync(file).size > 100e3, `${id} is not empty`);
    }
});
test('loops start and end on bar lines, inside the file, at least a few bars apart', ()=>
{
    for (const [id, t] of Object.entries(TRACKS))
    {
        assert.ok(Math.abs(t.frames / t.rate - t.seconds) < 1e-3, `${id}: frames and seconds agree`);
        if (!t.loop) { assert.ok(t.end > t.offset && t.end <= t.seconds, `${id}: a one-shot ends inside its file`); continue; }
        const { start, end } = t.loop;
        assert.ok(offBar(t, start) < 1e-3 && offBar(t, end) < 1e-3, `${id}: loop on bar lines`);
        assert.ok(start >= t.offset && end <= t.seconds, `${id}: loop inside the file`);
        assert.ok((end - start) / bar(t) >= 8, `${id}: loop is at least 8 bars`);
    }
});
test('every layer fits its track: same tempo and meter, and its loop goes into the track\'s a whole number of times', ()=>
{
    const layers = Object.entries(TRACKS).filter(([, t])=> t.layerOf);
    assert.deepEqual(layers.map(([, t])=> t.place).sort(), ['beam', 'cabin', 'crystal', 'pond']);
    for (const [id, t] of layers)
    {
        const base = TRACKS[t.layerOf];
        assert.ok(base?.loop && t.loop, `${id}: it and ${t.layerOf} both loop`);
        assert.equal(t.tempo, base.tempo, `${id}: tempo`);
        assert.equal(t.beatsPerBar, base.beatsPerBar, `${id}: meter`);
        const times = (base.loop.end - base.loop.start) / (t.loop.end - t.loop.start);
        assert.ok(Math.abs(times - Math.round(times)) < 1e-3 && times >= 1, `${id}: fits ${times} times`);
        assert.ok(t.level > 0 && t.level <= 1, `${id}: level`);
    }
});
