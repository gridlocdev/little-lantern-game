// Sound effects, synthesized at startup from the recipes in recipes.js.
import { Sound, getNoteFrequency, render3D, setSoundVolume } from '../platform/engine.js';
import { RECIPES } from './recipes.js';
import { loadSetting } from '../game/state.js';

// how much each play wanders in pitch, and how far away it can be heard (default 60)
const VARY = { step: .15, stepWood: .1, land: .1, jump: .06, crackle: .35, bleat: .06, splash: .08, plop: .1, tick: .1, meow: .05, creak: .1 };
const RANGE = { whale: 900 };

export let SFX = {};
function buildSounds()
{
    SFX = {};
    for (const [name, make] of Object.entries(RECIPES))
    {
        const s = new Sound(undefined, VARY[name] ?? .02, RANGE[name] ?? 60);
        if (s.range === undefined) continue;    // sound is off
        s.sampleChannels = [make()];
        s.buildSampleBuffer();
        s.loadedPercent = 1;
        SFX[name] = s;
    }
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
// one syllable of a speaking voice; pitch 1 is a middling voice, Oswin is low and slow
export const voice = (pitch = 1, vol = .7)=> playSfx('voice', undefined, vol, pitch * (.94 + Math.random() * .12));

// pentatonic notes for the chimes and melodies, semitones from C
export const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
export function bell(semi, pos, vol = .8)
{
    if (!SFX.bell) return;
    try { pos ? render3D.playSound(SFX.bell, pos, vol, getNoteFrequency(semi, 1)) : SFX.bell.playNote(semi, undefined, vol); }
    catch (e) {}
}

export const soundSystem = {
    build()
    {
        const v = parseFloat(loadSetting('volume'));
        if (v >= 0 && v <= 1) setSoundVolume(v);
        buildSounds();
    },
};
