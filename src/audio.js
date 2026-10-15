import {
    Sound, audioContext, audioMasterGain, getNoteFrequency, rand, randInt, render3D, timeReal,
} from './platform/engine.js';
import { save, writeSave } from './save.js';

// ================================================================ SOUND
let SFX = {};
export function buildSounds()
{
    const S = (a, range = 60)=> new Sound(a, undefined, range);
    SFX = {
        step: S([.18, .3, 95, 0, .01, .045, 4, 1, 0, 0, 0, 0, 0, .9]),
        stepWood: S([.3, .2, 190, 0, .01, .05, 1, 2, 0, 0, 0, 0, 0, .4]),
        jump: S([.35, .05, 300, .01, .03, .14, 0, 1.6, 7]),
        land: S([.3, .2, 90, 0, .01, .08, 4, 1, 0, 0, 0, 0, 0, .7]),
        boing: S([.55, 0, 170, .01, .06, .3, 0, 1, 10, 0, 0, 0, 0, 0, 6]),
        bell: S([.5, 0, 523.25, .004, .06, 1.6, 0, 1.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, .35, .3]),
        pluck: S([.3, 0, 261.63, .004, .02, .9, 1, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, .2, .18]),
        splash: S([.5, .3, 220, .01, .06, .4, 4, 1, -2, 0, 0, 0, 0, 1.6]),
        plop: S([.45, .1, 620, 0, .02, .1, 0, 2, -28]),
        bite: S([.55, 0, 880, 0, .03, .08, 1, 1, 0, 0, 220, .05]),
        tick: S([.12, .2, 1400, 0, 0, .02, 2, 1, 0, 0, 0, 0, 0, 0, 0, .2]),
        snap: S([.4, .2, 600, 0, .01, .12, 2, 1, -20, 0, 0, 0, 0, .5]),
        collect: S([.45, 0, 1046.5, 0, .05, .45, 0, 1.5, 0, 0, 392, .06, .09]),
        whoosh: S([.35, .4, 260, .25, .25, .5, 4, 1, 3, 0, 0, 0, 0, 1.2]),
        bleat: S([.35, .1, 340, .03, .18, .22, 2, 1, -1, 0, 0, 0, 0, 0, 22]),
        purr: S([.45, .2, 48, .1, .8, .4, 4, 1, 0, 0, 0, 0, 0, .4, 0, 0, 0, 1, 0, .45]),
        door: S([.4, .2, 150, .02, .12, .22, 2, 1, -3, 0, 0, 0, 0, .3]),
        page: S([.25, .5, 1500, 0, .03, .07, 4, 1]),
        whistle: S([.25, 0, 1650, .35, .7, .4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, .12]),
        crackle: S([.2, .6, 400, 0, .005, .03, 4, 1, 0, 0, 0, 0, 0, 3]),
        creak: S([.18, .2, 320, .06, .12, .15, 2, 1, -4, 0, 0, 0, 0, .3, 0, .4]),
        whale: S([.55, 0, 92, 1.4, 1.6, 2.6, 0, 1, -1.5, 0, 0, 0, 0, 0, 3, 0, .3, .8, 0, .2], 900),
        click: S([.25, .1, 900, 0, 0, .03, 1]),
        open: S([.3, 0, 660, .01, .05, .2, 0, 1.4, 0, 0, 220, .06]),
        sip: S([.3, .3, 300, .02, .05, .12, 4, 1, 4, 0, 0, 0, 0, 1]),
        cast: S([.35, .3, 900, .02, .08, .2, 4, 1, -6]),
    };
}
export function playSfx(name, pos, vol = 1, pitch = 1)
{
    const s = SFX[name];
    if (!s) return;
    try
    {
        if (pos && render3D) return render3D.playSound(s, pos, vol, pitch);
        return s.play(undefined, vol, pitch);
    }
    catch (e) {}
}
// pentatonic notes for the chimes and melodies, semitones from C
export const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
export function bell(semi, pos, vol = .8)
{
    if (!SFX.bell) return;
    try { pos ? render3D.playSound(SFX.bell, pos, vol, getNoteFrequency(semi, 1)) : SFX.bell.playNote(semi, undefined, vol); }
    catch (e) {}
}

// ---------------------------------------------------------------- generative night music
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
export function musicUpdate()
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
    music.on = save.music = on;
    writeSave();
    const b = document.getElementById('musicToggle');
    if (b) b.textContent = on ? 'On' : 'Off';
}
