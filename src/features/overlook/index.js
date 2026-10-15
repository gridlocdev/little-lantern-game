// The North Overlook, where you send wish lanterns up.
import {
    EngineObject3D, Light3D, WHITE, buildBox, buildCylinder, hsl, min, randInt, render3D, time, timeDelta, vec3,
} from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { WISHES } from './wishes-data.js';
import { addInteract } from '../../game/interact.js';
import { state, writeSave } from '../../game/state.js';
import { TAU } from '../../lib/math.js';
import { mtx, obj3 } from '../../platform/mesh.js';
import { rr } from '../../platform/random.js';
import { CYL } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { texStone } from '../../render/textures.js';
import { say } from '../../ui/dialog.js';
import { addJournalSection, addTodo } from '../../ui/journal.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { toast } from '../../ui/toast.js';
import { addClearing } from '../../world/clearings.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const save = state.slice('overlook', { lanterns: 0 });

class WishLantern extends EngineObject3D
{
    constructor(pos, fromSave)
    {
        super(pos.copy());
        this.castShadow = false;
        this.t = fromSave ? rr(20, 200) : 0;
        this.ph = rr(0, TAU);
        this.hue = rr(.04, .12);
        this.start = pos.copy();
        this.drift = vec3(rr(-1, 1), 0, rr(-1, .2)).normalize();
    }
    update()
    {
        this.t += timeDelta;
        const t = this.t;
        this.pos3D = this.start.add(vec3(Math.sin(t * .5 + this.ph) * 1.5, t * 1.1, 0)).add(this.drift.scale(t * .9));
        if (this.pos3D.y > 420) this.destroy();
    }
    render3D()
    {
        const m = mtx(undefined, this.pos3D, vec3(Math.sin(time + this.ph) * .1, this.t * .2, 0));
        const e = render3D.emissive;
        render3D.emissive = 1.5;
        render3D.drawMesh(CYL, mtx(m, vec3(), vec3(), vec3(.5, .62, .5)), undefined, hsl(this.hue, .9, .64));
        render3D.drawMesh(CYL, mtx(m, vec3(0, .33, 0), vec3(), vec3(.56, .05, .56)), undefined, hsl(this.hue, .5, .5));
        render3D.emissive = e;
    }
}
function buildOverlook()
{
    const o = P.overlook, y = heightAt(o.x, o.z);
    obj3(vec3(o.x, y - .25, o.z), buildCylinder(9, .6, 24), WHITE, { tileInfo: texStone });
    const out = Math.atan2(o.x, o.z);
    for (let k = -6; k <= 6; k++)
    {
        const a = out + k * .17, px = o.x + Math.sin(a) * 4.2, pz = o.z + Math.cos(a) * 4.2;
        obj3(vec3(px, y + .55, pz), buildCylinder(.12, 1.1, 6), hsl(.72, .2, .2));
        if (k < 6)
        {
            const a2 = out + (k + 1) * .17, qx = o.x + Math.sin(a2) * 4.2, qz = o.z + Math.cos(a2) * 4.2;
            const len = Math.hypot(qx - px, qz - pz);
            obj3(vec3((px + qx) / 2, y + 1.08, (pz + qz) / 2), buildBox(vec3(.08, .08, len)), hsl(.72, .2, .2), { rotation3D: vec3(0, Math.atan2(qx - px, qz - pz), 0) });
            addSolid({ kind: 'box', x: (px + qx) / 2, z: (pz + qz) / 2, hx: .1, hz: len / 2, yaw: Math.atan2(qx - px, qz - pz), top: y + 1.2 });
        }
    }
    // a table of paper lanterns
    const tx = o.x - Math.sin(out) * 1.8, tz = o.z - Math.cos(out) * 1.8;
    obj3(vec3(tx, y + .45, tz), buildCylinder(1.3, .9, 12), hsl(.75, .2, .35));
    for (let i = 0; i < 5; i++)
        obj3(vec3(tx + Math.cos(i * 1.3) * .4, y + 1.15, tz + Math.sin(i * 1.3) * .4), buildCylinder(.32, .42, 10), hsl(.08, .8, .62), { emissive: .9 });
    addSolid({ kind: 'circle', x: tx, z: tz, r: .7, top: y + .9 });
    addInteract({ pos: vec3(tx, y, tz), r: 2.4, label: 'Light a wish lantern', act: releaseLantern });
    new Light3D(vec3(tx, y + 1.6, tz), 8, hsl(.09, .9, .6), 1.4);
    for (let i = 0; i < min(save.lanterns, 30); i++) new WishLantern(vec3(o.x + rr(-6, 6), y + 2, o.z + rr(-6, 6)), true);
    PLACE_NAMES.push({ name: 'North Overlook', sub: 'send a wish up into the dark', x: o.x, z: o.z, r: 8, zone: 'island' });
    addClearing(o.x, o.z, 8);
    addClearing(o.x, o.z, 4.6, true);
}
function releaseLantern()
{
    const pick = [];
    while (pick.length < 3) { const w = WISHES[randInt(WISHES.length)]; if (!pick.includes(w)) pick.push(w); }
    say('A paper lantern', 'You light the little candle inside. What do you wish for?', pick.map((w)=> ({
        label: 'I wish ' + w,
        fn: ()=>
        {
            save.lanterns++; writeSave();
            player.pose = 'carry';
            setTimeout(()=>
            {
                const out = Math.atan2(P.overlook.x, P.overlook.z);
                new WishLantern(player.pos.add(vec3(Math.sin(out) * .6, 1.6, Math.cos(out) * .6)));
                playSfx('whoosh', player.pos, .5, .8);
                playSfx('shimmer', player.pos, .5);
                player.pose = 'free';
                toast(save.lanterns === 1 ? 'Your lantern drifts up toward the moon.' : `${save.lanterns} lanterns now float above the island.`);
            }, 500);
        },
    })));
}

export const overlookFeature = {
    build()
    {
        buildOverlook();
        addTodo(100, 'Send a wish lantern into the sky', ()=> save.lanterns > 0);
        addJournalSection('sky', 40, ()=> [['', `${save.lanterns} wish lanterns`, 'Sent up from the North Overlook.', '', false, save.lanterns > 0]]);
    },
};
