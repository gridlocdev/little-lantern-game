// Layered noise over the engine's 2D noise.
import { noise2D } from './engine.js';

export function fbm(x, z, oct = 4)
{
    let s = 0, a = .5, n = 0;
    for (let i = 0; i < oct; i++) { s += a * noise2D(x, z); n += a; x = x * 2.03 + 17.1; z = z * 2.03 - 9.3; a *= .5; }
    return s / n;
}
