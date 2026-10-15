// Generative night music.
import { audioContext, audioMasterGain, rand, randInt, timeReal } from '../platform/engine.js';
import { SFX } from './sfx.js';
import { core } from '../game/progress.js';
import { writeSave } from '../game/state.js';

export const music = { on: true, nodes: null, nextChord: 0, nextNote: 0, chord: 0, house: false };
const CHORDS = [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [2, 5, 9, 12], [-5, -1, 2, 7]];
export function musicStart()
{
    if (!audioContext || music.nodes) return;
    try
    {
        const ctx = audioContext;
        const out = ctx.createGain(); out.gain.value = 0;
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = .4;
        const delay = ctx.createDelay(1.2); delay.delayTime.value = .55;
        const fb = ctx.createGain(); fb.gain.value = .35;
        filter.connect(out); filter.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(out);
        out.connect(audioMasterGain);
        const voices = [];
        for (let i = 0; i < 4; i++)
        {
            const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
            o1.type = 'triangle'; o2.type = 'sine';
            o2.detune.value = 7;
            g.gain.value = .045;
            o1.connect(g); o2.connect(g); g.connect(filter);
            o1.start(); o2.start();
            voices.push({ o1, o2, g });
        }
        // slow breathing on the filter
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = .05; lg.gain.value = 380; lfo.connect(lg); lg.connect(filter.frequency); lfo.start();
        music.nodes = { out, filter, voices };
        music.nextChord = 0;
        musicSetChord(0);
        out.gain.setTargetAtTime(music.on ? .55 : 0, ctx.currentTime, 2);
    }
    catch (e) { music.nodes = null; }
}
function musicSetChord(i)
{
    if (!music.nodes) return;
    const t = audioContext.currentTime;
    CHORDS[i].forEach((semi, k)=>
    {
        const f = 130.81 * Math.pow(2, semi / 12);
        const v = music.nodes.voices[k];
        v.o1.frequency.setTargetAtTime(f, t, 1.5);
        v.o2.frequency.setTargetAtTime(f * 2, t, 1.5);
    });
}
function musicUpdate()
{
    if (!music.nodes) return;
    const t = audioContext.currentTime;
    music.nodes.out.gain.setTargetAtTime(music.on ? .55 : 0, t, .8);
    if (!music.on) return;
    if (timeReal > music.nextChord)
    {
        music.nextChord = timeReal + 9;
        music.chord = (music.chord + 1 + (rand() < .3 ? 1 : 0)) % CHORDS.length;
        musicSetChord(music.chord);
    }
    if (timeReal > music.nextNote)
    {
        music.nextNote = timeReal + rand(.7, 2.4) * (rand() < .2 ? 2.5 : 1);
        const chord = CHORDS[music.chord];
        const semi = chord[randInt(chord.length)] + 12 + (rand() < .3 ? 12 : 0);
        try { SFX.pluck.playNote(semi, undefined, rand(.12, .22)); } catch (e) {}
    }
}
export function setMusic(on)
{
    music.on = core.music = on;
    writeSave();
    const b = document.getElementById('musicToggle');
    if (b) b.textContent = on ? 'On' : 'Off';
}

export const musicSystem = {
    always: true,
    build() { music.on = core.music !== false; },
    update: musicUpdate,
};
