// Violet Isle's soundtrack as song specs for soundfont-player's composer (its docs/COMPOSING.md, "The song spec").
// tools/music/render.mjs composes and renders each one to music/<id>.mp3; `just music` runs it.
//
// The tracks share one home, F major and its relative D, and one tune: the lantern motif, four bars that rise,
// settle and land on the tonic. The intro states it plainly, the island hums it on a Rhodes, the race plays it in a
// hurry and the hammock lullaby slows it into a waltz, so every place sounds like part of the same dream.
//
// loop: the sections a looping track repeats, as [first, end) indexes into its form. The section at `end` must be
// the same type as the one at `first`, so what comes after the loop's end is what the loop jumps back to.
// trim: the file starts at the loop's start, so the sections before it are only there to ring into it: the loop's
// first bar carries the reverb and held notes of the bars that lead into it, and wraps without a seam.
// shape(score): changes the composed notes before they are played (thinning an arpeggio, moving it down an octave).
// layerOf, place, level: a layer plays in step with its track, louder the nearer the player is to its place (see
// audio/places.js), at most at `level`.

const MOTIF = '5:1.5 6:0.5 5 3 | 2:2 5 7 | 6:1.5 5:0.5 4 6 | 8:4';
const MOTIF_WALTZ = '5 6:0.5 5:0.5 3 | 2:2 5 | 6 5:0.5 4:0.5 6 | 8:3';
const MOTIF_RUN = '5:0.5 6:0.5 5 3:0.5 5:0.5 3 | 2 5 7 5 | 6:0.5 5:0.5 4 6:0.5 8:0.5 6 | 8:2 5 r';

// ---------------------------------------------------------------- the island at night
// Cozy and a little lonely: a Rhodes noodling alone over warm, low pads, a kalimba plinking short arpeggios like the
// fireflies, brushes that drift in for the middle section and out again. Every section runs on the same sixteen bars
// of major sevenths and ninths with suspended chords that never quite resolve, so the layers (sixteen bars long)
// fit under any bar of it. The base loops forty-eight bars, about three minutes.
const ISLAND = {
    // push: 0 holds one tempo through the loop: the game counts bars at one tempo (the composer would push it from the climax)
    key: 'F', mode: 'major', emotion: 'tender', groove: 'ballad', tempo: 68, swing: 0.2, legato: 0.95, dynamics: 0.3, push: 0,
    progression: 'Imaj9 iii7 IVmaj7 ii9 vi9 iii7 IVmaj9 Vsus4 IVmaj7 Imaj9 vi9 iii7 ii9 IVmaj9 Isus2 Vsus4',
};
// wandering, with room to breathe; every strong beat on a chord tone
const ISLAND_VERSE = 'r 5 7:1.5 6:0.5 | 5:3 r | r:0.5 6:0.5 8 6 4 | 3:2 2:2 | r 3 5:1.5 3:0.5 | 2 3:3 | r 4 6 8 | 9:2 8:2 | ' +
    'r:2 6 5 | 3:2 r:2 | r 1 3 5 | 7:2 5:2 | r 6:1.5 4:0.5 2 | 3:3 r | r 5 2 1 | 2:4';
// the lantern motif, then an answer, then the motif a step higher, ending open on the sus chord
const ISLAND_CHORUS = MOTIF + ' | 3:1.5 5:0.5 6 5 | 3:2 r 2 | 4:1.5 3:0.5 1 3 | 2:3 r | ' +
    '6:1.5 8:0.5 6 4 | 5:2 7 9 | 8:1.5 7:0.5 6 5 | 7:4 | 6:1.5 4:0.5 2 4 | 6:2 5 3 | 5:1.5 2:0.5 1 2 | 5:4';

// keeps an arpeggio's notes where `mask` (one character per eighth note, repeating) has a 1, and moves it by `shift`
function thin(mask, shift = 0)
{
    return (score)=>
    {
        const arp = score.tracks.find((t)=> t.role === 'arp');
        if (!arp) return;
        arp.notes = arp.notes.filter((n)=> mask[Math.round(n.beat * 2) % mask.length] === '1');
        for (const n of arp.notes) n.key += shift;
    };
}
// the kalimba: a little run up, a pair, a run, a pair, then quiet
const FIREFLIES = '11110000' + '00000110' + '01110000' + '00001001';

// sixteen bars, two through to ring into the loop and a third for the file's spare tail
function layer(id, place, level, title, band, melody)
{
    const { progression, ...feel } = ISLAND;
    return {
        id, loop: [1, 2], trim: true, layerOf: 'outside', place, level,
        spec: {
            title, ...feel, form: ['verse', 'verse', 'verse'], band: { lead: null, counter: null, arp: null, chords: null, pad: null, bass: null, drums: null, ...band },
            sections: { verse: { bars: 16, progression, melody: melody ?? false, energy: 0.62 } },
        },
    };
}

function island()
{
    const { progression, ...feel } = ISLAND;
    return [
        {
            id: 'outside', loop: [1, 4], trim: true, shape: thin(FIREFLIES),
            spec: {
                title: 'Lanterns in the Grass', ...feel,
                // the bridge first only rings into the loop; the verse at the end is the file's spare tail
                form: ['bridge', 'verse', 'chorus', 'bridge', 'verse'],
                band: { lead: 4, counter: null, arp: 108, chords: 4, pad: 89, bass: 35, drums: 40 },
                sections: {
                    verse: { bars: 16, progression, melody: ISLAND_VERSE, energy: 0.62, mute: ['chords', 'drums'] },
                    chorus: { bars: 16, progression, melody: ISLAND_CHORUS, energy: 0.7, mute: ['chords'] },
                    bridge: { bars: 16, progression, melody: false, energy: 0.64, mute: ['drums'] },     // the Rhodes just holds the chords
                },
            },
        },
        // the cosmic pond: the water hums, bells ringing in the gaps the kalimba leaves
        layer('outside-pond', 'pond', 0.75, 'The Water Hums', { arp: 8, pad: 88 }),
        // Amethyst Hill: bowed glass, and a crystal struck every two bars
        layer('outside-crystal', 'crystal', 0.7, 'Glass on the Hill', { lead: 98, pad: 92 },
            '7:8 | 10:8 | 7:8 | 8:8 | 10:8 | 12:8 | 11:8 | 9:8'),
        // by the cabin: someone fingerpicking a guitar inside, an accordion breathing, the fire going
        layer('outside-cabin', 'cabin', 0.7, 'Someone Is Home', { arp: 24, pad: 21 }),
        // a fallen star's beam: a faint choir, and one long note that swells as you get close
        layer('outside-beam', 'beam', 0.8, 'Something Fell Here', { lead: 94, pad: 52 }, '3:16 | 5:16 | 3:16 | 6:8 5:8'),
    ].map((t, i)=> i === 0 ? t : { ...t, shape: LAYER_SHAPES[t.place] });
}
const LAYER_SHAPES = {
    pond: thin('00000111' + '11100000' + '00001111' + '11000000'),
    cabin: thin('11111111', -12),     // fingerpicked, down where a guitar sits
};

export const TRACKS = [
    {
        // over the first-arrival cutscene: out of the sky and down to the island, once
        id: 'intro', loop: null,
        spec: {
            title: 'Out of the Sky',
            emotion: 'serene', key: 'F', mode: 'lydian', tempo: 66,
            form: ['intro', 'A', 'outro'],
            band: { lead: 8, counter: 73, arp: 46, pad: 89, chords: null, bass: 32, drums: null },
            sections: {
                intro: { bars: 2, progression: 'Imaj7 II' },
                A: { bars: 4, progression: 'I V II I', melody: MOTIF, energy: 0.45 },   // II: lydian's bright major
                outro: { bars: 4, progression: 'II Imaj7:3', energy: 0.25 },
            },
        },
    },
    {
        // inside the crooked house: a music box on the shelf and the fire going
        id: 'house', loop: [1, 6],
        spec: {
            title: 'The Kettle Is Still Warm',
            emotion: 'nostalgic', key: 'Bb', tempo: 70, push: 0, legato: 1, dynamics: 0.45,
            form: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'verse', 'outro'],
            band: { lead: 10, counter: 73, arp: 24, chords: 4, pad: 89, bass: 32, drums: null },
            sections: {
                intro: { bars: 4 },
                verse: { energy: 0.45 },
                chorus: { energy: 0.6 },
                bridge: { energy: 0.5, mute: ['arp'] },
            },
        },
    },
    // the island at night: the base track, then its layers
    ...island(),
    {
        // racing Oswin to the lamp and back: quick feet, bouncing, nobody really minds who wins
        id: 'race', loop: [1, 5],
        spec: {
            title: 'Oswin Is Faster Than He Looks',
            emotion: 'playful', key: 'F', tempo: 132, swing: 0.5, dynamics: 0.6,
            form: ['intro', 'A', 'B', 'A', 'C', 'A', 'outro'],
            band: { lead: 12, counter: 71, arp: 45, chords: 0, pad: null, bass: 32, drums: 0 },
            sections: {
                intro: { bars: 2, progression: 'I V7' },
                A: { progression: 'I V IV I', melody: MOTIF_RUN + ' | ' + MOTIF_RUN, energy: 0.7 },
                B: { energy: 0.75 },
                C: { energy: 0.8 },
            },
        },
    },
    {
        // the ending (and lying in the Moonlet hammock): the motif, slowed down, as a lullaby
        id: 'ending', loop: [1, 5],
        spec: {
            title: 'The Whole Sky Turns',
            emotion: 'tender', key: 'F', tempo: 72, push: 0, dynamics: 0.35,
            form: ['intro', 'verse', 'chorus', 'bridge', 'chorus', 'verse', 'outro'],
            band: { lead: 40, counter: 42, arp: 46, chords: 0, pad: 89, bass: 32, drums: 40 },
            sections: {
                intro: { bars: 4 },
                verse: { energy: 0.35 },
                chorus: { progression: 'I V IV I I V IV I', melody: MOTIF_WALTZ + ' | ' + MOTIF_WALTZ, energy: 0.5 },
                bridge: { energy: 0.4, mute: ['drums'] },
            },
        },
    },
];
