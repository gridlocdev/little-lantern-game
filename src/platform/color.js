// Color helpers over the engine's color type.
import { rgb } from './engine.js';
import { mix } from '../lib/math.js';

export const mixColor = (a, b, t)=> rgb(mix(a.r, b.r, t), mix(a.g, b.g, t), mix(a.b, b.b, t), mix(a.a, b.a, t));
