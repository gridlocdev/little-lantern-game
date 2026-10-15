// Sound effects.
import { Sound, getNoteFrequency, render3D } from '../platform/engine.js';

export let SFX = {};
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
