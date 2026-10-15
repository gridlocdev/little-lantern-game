// Every cosmic fish: where it lives, how rare it is, how it looks.
import { hsl } from '../../platform/engine.js';

export const FISH = [
    { id: 'minnow', name: 'Glimmer Minnow', where: 'pond', stars: 1, size: [6, 14], shape: 'slim', w: 40, diff: .22,
        body: hsl(.58, .35, .82), fin: hsl(.6, .6, .9), glow: hsl(.55, .9, .8),
        desc: 'A sliver of moonlight that learned to swim. It tastes faintly of starlight, apparently.', hint: 'Common in Starlight Pond.' },
    { id: 'guppy', name: 'Nebula Guppy', where: 'pond', stars: 1, size: [5, 11], shape: 'frill', w: 34, diff: .3,
        body: hsl(.9, .55, .7), fin: hsl(.5, .7, .68), glow: hsl(.85, .9, .75),
        desc: 'Its tail is a little cloud of pink and teal gas. New stars may be forming in there.', hint: 'Common in Starlight Pond.' },
    { id: 'koi', name: 'Moonfin Koi', where: 'pond', stars: 2, size: [30, 60], shape: 'koi', w: 18, diff: .45,
        body: hsl(.7, .15, .92), fin: hsl(.75, .4, .85), glow: hsl(.75, .8, .75), spots: hsl(.78, .55, .55),
        desc: 'Pearl white with lavender spots shaped like the phases of the moon. Count them and you get one month.', hint: 'Uncommon in Starlight Pond.' },
    { id: 'comet', name: 'Comet Tail', where: 'pond', stars: 3, size: [20, 40], shape: 'comet', w: 8, diff: .66,
        body: hsl(.6, .7, .55), fin: hsl(.55, .9, .8), glow: hsl(.55, 1, .75),
        desc: 'It leaves a glowing streak behind it, even out of the water. It is always in a hurry.', hint: 'Rare in Starlight Pond. Quick and strong.' },
    { id: 'angler', name: 'Void Angler', where: 'void', stars: 2, size: [25, 50], shape: 'angler', w: 35, diff: .45,
        body: hsl(.72, .3, .25), fin: hsl(.75, .3, .38), glow: hsl(.13, 1, .65),
        desc: 'Dangles a tiny star in front of its face to lure in things that are lost. You were not lost, but you came anyway.', hint: 'Off the end of the Void Pier.' },
    { id: 'puffer', name: 'Saturn Puffer', where: 'void', stars: 2, size: [15, 30], shape: 'puffer', w: 35, diff: .4,
        body: hsl(.1, .55, .68), fin: hsl(.08, .7, .6), glow: hsl(.12, .9, .75),
        desc: 'Puffs itself up to the size of a small planet when startled. It came with its own ring.', hint: 'Off the end of the Void Pier.' },
    { id: 'eel', name: 'Quasar Eel', where: 'void', stars: 3, size: [60, 120], shape: 'eel', w: 15, diff: .72,
        body: hsl(.55, .55, .4), fin: hsl(.5, .8, .6), glow: hsl(.5, 1, .7),
        desc: 'Pulses with bands of light exactly once a second. Sailors used to set their clocks by it.', hint: 'Rare. Off the end of the Void Pier.' },
    { id: 'ray', name: 'Aurora Ray', where: 'void', stars: 3, size: [50, 90], shape: 'ray', w: 15, diff: .6,
        body: hsl(.42, .55, .5), fin: hsl(.85, .6, .65), glow: hsl(.38, 1, .7),
        desc: 'Glides through empty space like a sheet of northern lights that got bored of the north.', hint: 'Rare. Off the end of the Void Pier.' },
    { id: 'carp', name: 'Moonbeam Carp', where: 'moonlet', stars: 3, size: [35, 70], shape: 'koi', w: 65, diff: .55,
        body: hsl(.13, .6, .75), fin: hsl(.12, .7, .85), glow: hsl(.12, 1, .75), spots: hsl(.6, .2, .85),
        desc: 'Gold on one side and silver on the other, like a coin that cannot decide.', hint: 'In the pool on the Moonlet.' },
    { id: 'calf', name: 'Starwhale Calf', where: 'moonlet', stars: 4, size: [80, 140], shape: 'whale', w: 35, diff: .82,
        body: hsl(.6, .55, .62), fin: hsl(.58, .7, .75), glow: hsl(.55, .8, .88),
        desc: 'A baby of the great whale that circles the island. It hums a little song when you hold it, and the big one hums back.', hint: 'Legendary. Somewhere in the Moonlet pool.' },
];
for (const f of FISH) f.css = `rgb(${f.body.r * 255 | 0},${f.body.g * 255 | 0},${f.body.b * 255 | 0})`;
export const fishById = (id)=> FISH.find((f)=> f.id === id);
