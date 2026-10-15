// The Void Pier, for fishing in open space.
import {
    Light3D, Mesh, WHITE, buildBox, buildCylinder, buildMatrix, buildSphere, clamp, hsl, max, vec3,
} from '../../platform/engine.js';
import { addFishingSpot } from './minigame.js';
import { obj3 } from '../../platform/mesh.js';
import { rr } from '../../platform/random.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { addClearing } from '../../world/clearings.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

export function buildPier()
{
    const a = P.pierBase, b = P.pierTip;
    const y = heightAt(a.x, a.z) + .35;
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const ux = dx / L, uz = dz / L;
    const deck = new Mesh();
    for (let s = 0; s < L; s += .55)
        deck.combine(buildBox(vec3(2.8, .12, .5)), buildMatrix(vec3(rr(-.05, .05), 0, s - L / 2), vec3(0, rr(-.02, .02), 0)), hsl(.75, .15, rr(.38, .48)));
    for (let s = 0; s < L; s += 3.2)
        for (const k of [-1.25, 1.25])
        {
            deck.combine(buildCylinder(.22, 5, 6), vec3(k, -2.4, s - L / 2), hsl(.75, .2, .25));
            deck.combine(buildCylinder(.12, 1.1, 6), vec3(k, .6, s - L / 2), hsl(.75, .2, .25));
        }
    for (const k of [-1.25, 1.25]) deck.combine(buildBox(vec3(.1, .1, L)), vec3(k, 1.12, 0), hsl(.75, .2, .3));
    obj3(vec3((a.x + b.x) / 2, y, (a.z + b.z) / 2), deck, WHITE, { rotation3D: vec3(0, yaw, 0) });
    addSolid({ kind: 'box', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, hx: 1.25, hz: L / 2 + .2, yaw, top: y + .06, floor: true, platformOnly: true, wood: true });
    for (const k of [-1.32, 1.32])
        addSolid({ kind: 'box', x: (a.x + b.x) / 2 + Math.cos(yaw) * k, z: (a.z + b.z) / 2 - Math.sin(yaw) * k, hx: .08, hz: L / 2, yaw, top: y + 1.2 });
    // end-of-pier lamp
    const lp = vec3(b.x - ux * .4 + Math.cos(yaw) * 1.25, y, b.z - uz * .4 - Math.sin(yaw) * 1.25);
    obj3(lp.add(vec3(0, 1.4, 0)), buildCylinder(.1, 2.8, 6), hsl(.72, .2, .16));
    obj3(lp.add(vec3(0, 2.9, 0)), buildSphere(.32, 10, 8), hsl(.78, .8, .75), { emissive: 1.6 });
    const L3 = new Light3D(lp.add(vec3(0, 2.9, 0)), 10, hsl(.78, .7, .7), 1.6); L3.glow = 1.5;
    const tip = vec3(b.x - ux * 1.2, y + .06, b.z - uz * 1.2);
    addFishingSpot({
        kind: 'void', reach: 11, yaw: Math.atan2(-ux, -uz), r: 2.6, // face out along the pier, into open sky
        pos: ()=> tip,
        center: ()=> tip.add(vec3(ux, 0, uz).scale(8)),
        clamp: (p)=>
        {
            const d = vec3(p.x - tip.x, 0, p.z - tip.z);
            const along = max(3, d.dot(vec3(ux, 0, uz)));
            const across = clamp(d.dot(vec3(Math.cos(yaw), 0, -Math.sin(yaw))), -4, 4);
            return tip.add(vec3(ux, 0, uz).scale(along)).add(vec3(Math.cos(yaw), 0, -Math.sin(yaw)).scale(across)).add(vec3(0, -1.4, 0));
        },
    });
    PLACE_NAMES.push({ name: 'The Void Pier', sub: 'fish in the open sky', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: L / 2 + 2, zone: 'island' });
    addClearing(a.x, a.z, 6);
}
