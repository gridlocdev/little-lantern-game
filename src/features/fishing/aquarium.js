// The aquarium at home, showing the fish you kept.
import { EngineObject3D, MOBILE, PI, clamp, rand, time, timeDelta, vec3 } from '../../platform/engine.js';
import { fishById } from './fish-list.js';
import { drawFish } from './fish-meshes.js';
import { save } from './save.js';
import { activity } from '../../game/activity.js';
import { addInteract } from '../../game/interact.js';
import { mtx } from '../../platform/mesh.js';
import { clearTouchPresses, input } from '../../platform/input.js';
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
            a.x = x;
            drawFish(a.f, mtx(undefined, c.add(vec3(x, a.y + Math.sin(t * 2) * .05, z)), vec3(0, yaw, Math.sin(t * 6) * .1), vec3(s)));
        }
    }
}

// Looking into the tank: the camera comes down to the glass, the mothling steps out of the shot, and left and right
// glide along the tank. The fish nearest the middle is named in a caption at the top of the screen.
const TANK = ()=> HOUSE_IN.add(vec3(HOUSE_AQUARIUM.x, 1.55, HOUSE_AQUARIUM.z));
let caption = null, named = null;
function nameFish(f)
{
    if (!caption)
    {
        caption = document.createElement('div');
        caption.className = 'ui tank-name';
        caption.innerHTML = '<div class="cap-kicker">Swimming by</div><div class="cap-name"></div><div class="stars"></div>';
        document.body.append(caption);
    }
    if (f === named) return;
    named = f;
    caption.classList.remove('show');
    if (!f) return;
    caption.querySelector('.cap-name').textContent = f.name;
    caption.querySelector('.stars').textContent = '★'.repeat(f.stars);
    void caption.offsetWidth;       // restart the fade for the new name
    caption.classList.add('show');
}
function lookIntoTank()
{
    const view = { x: 0 };
    player.hidden = true;
    const stop = ()=> { player.hidden = false; nameFish(null); activity.end(); };
    activity.start({
        name: 'aquarium', ownsPhysics: true, lockCamera: true,
        update()
        {
            view.x = clamp(view.x + input.move().x * timeDelta * .9, -.5, .5);
            let near = null;
            for (const a of aquariumList) if (a.f && (!near || Math.abs(a.x - view.x) < Math.abs(near.x - view.x))) near = a;
            nameFish(near?.f ?? null);
            if (input.act()) return openJournal('fish');
            if (input.back() || input.jump()) { clearTouchPresses(); stop(); }
        },
        cancel: stop,
        hint: ()=> `{use}|Open the journal · {back} step back${MOBILE ? '' : ' · {move} look along the tank'}`,
        cam: ()=>
        {
            const c = TANK(), sway = Math.sin(time * .4) * .04;
            const pos = c.add(vec3(view.x * .85 + sway, .12 + Math.sin(time * .3) * .03, 2.15));
            return { pos, look: c.add(vec3(view.x, -.05, 0)), fov: .62, snap: 5 };
        },
    });
}

export function buildAquarium()
{
    new AquariumFish();
    addInteract({ pos: HOUSE_IN.add(vec3(HOUSE_AQUARIUM.x, 0, HOUSE_AQUARIUM.z + 1.1)), r: 1.7, zone: 'house', label: 'Look at the aquarium', act: ()=>
    {
        if (!save.aquarium.length) say('', 'The aquarium is empty, except for a little crystal castle. Fish you choose to keep will swim here.');
        else lookIntoTank();
    } });
}
