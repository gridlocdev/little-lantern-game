// The aquarium at home, showing the fish you kept.
import { EngineObject3D, PI, clamp, rand, time, vec3 } from '../../platform/engine.js';
import { fishById } from './fish-list.js';
import { drawFish } from './fish-meshes.js';
import { save } from './save.js';
import { addInteract } from '../../game/interact.js';
import { mtx } from '../../platform/mesh.js';
import { player } from '../../player/player.js';
import { say } from '../../ui/dialog.js';
import { openJournal } from '../../ui/journal.js';
import { HOUSE_AQUARIUM, HOUSE_IN } from '../../world/layout.js';

// fish you keep swim here
let aquariumList = [];
export function refreshAquarium()
{
    aquariumList = save.aquarium.slice(-12).map((id, i)=> ({ f: fishById(id), ph: i * 1.7 + rand(), sp: rand(.25, .5), y: rand(-.35, .35), dir: rand() < .5 ? 1 : -1 }));
}
class AquariumFish extends EngineObject3D
{
    constructor() { super(HOUSE_IN.add(vec3(HOUSE_AQUARIUM.x, 1.55, HOUSE_AQUARIUM.z))); this.castShadow = false; refreshAquarium(); }
    render3D()
    {
        if (player.zone !== 'house') return;
        const c = this.pos3D;
        for (const a of aquariumList)
        {
            if (!a.f) continue;
            const t = time * a.sp + a.ph;
            const x = Math.sin(t) * 1.05 * a.dir, z = Math.cos(t * 1.3) * .28;
            const yaw = (Math.cos(t) * a.dir > 0 ? -PI / 2 : PI / 2);
            const s = clamp(a.f.size[1] / 100, .18, .42) * .6;
            drawFish(a.f, mtx(undefined, c.add(vec3(x, a.y + Math.sin(t * 2) * .05, z)), vec3(0, yaw, Math.sin(t * 6) * .1), vec3(s)));
        }
    }
}

export function buildAquarium()
{
    new AquariumFish();
    addInteract({ pos: HOUSE_IN.add(vec3(HOUSE_AQUARIUM.x, 0, HOUSE_AQUARIUM.z + 1.1)), r: 1.7, zone: 'house', label: 'Look at the aquarium', act: ()=>
    {
        if (!save.aquarium.length) say('', 'The aquarium is empty, except for a little crystal castle. Fish you choose to keep will swim here.');
        else openJournal('fish');
    } });
}
