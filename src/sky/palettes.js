// The skies you can wake under.
import { hsl } from '../platform/engine.js';

// three dream palettes for the sky, the bed cycles through them
export const PALETTES = [
    { name: 'Violet Night', top: hsl(.72, .6, .07), bottom: hsl(.76, .5, .015), a: hsl(.92, .55, .36), b: hsl(.5, .6, .3), c: hsl(.75, .6, .25), glow: hsl(.74, .5, .65) },
    { name: 'Aurora Drift', top: hsl(.6, .65, .07), bottom: hsl(.66, .5, .015), a: hsl(.38, .7, .32), b: hsl(.8, .6, .34), c: hsl(.5, .7, .22), glow: hsl(.5, .5, .65) },
    { name: 'Rose Eclipse', top: hsl(.83, .55, .08), bottom: hsl(.88, .4, .02), a: hsl(.98, .6, .38), b: hsl(.08, .7, .3), c: hsl(.9, .6, .26), glow: hsl(.95, .5, .68) },
];
