// Cloud sheep in the meadow.
import {
    EngineObject3D, PI, WHITE, hsl, max, min, randInt, render3D, time, timeDelta, vec3,
} from '../../platform/engine.js';
import { PENTA, bell, playSfx } from '../../audio/sfx.js';
import { addInteract } from '../../game/interact.js';
import { state, writeSave } from '../../game/state.js';
import { TAU, mix, wrapAngle } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { rr } from '../../platform/random.js';
import { moth } from '../../player/mothling.js';
import { CAPS, SPH, SPH_LO } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { camNear } from '../../render/camera.js';
import { burst } from '../../render/particles.js';
import { addTodo } from '../../ui/journal.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { toast } from '../../ui/toast.js';
import { addClearing } from '../../world/clearings.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const save = state.slice('sheep', { sheep: 0 });

const sheep = [];
class CloudSheep extends EngineObject3D
{
    constructor(pos)
    {
        super(pos.copy());
        this.castShadow = true;
        this.yaw = rr(0, TAU);
        this.goal = pos.copy();
        this.wait = rr(0, 4);
        this.float = 0; this.floatT = 0;
        this.walk = 0;
        this.puffs = [];
        for (let i = 0; i < 9; i++) this.puffs.push(vec3(rr(-.45, .45), rr(.55, .95), rr(-.6, .6)));
        this.note = PENTA[randInt(PENTA.length)];
        sheep.push(this);
    }
    update()
    {
        const dt = timeDelta, c = P.pasture;
        this.floatT = max(0, this.floatT - dt);
        this.float = mix(this.float, this.floatT > 0 ? 3.2 : 0, min(1, dt * (this.floatT > 0 ? 1.5 : .8)));
        this.wait -= dt;
        const p = this.pos3D;
        if (this.wait < 0 && this.floatT <= 0)
        {
            const to = this.goal.subtract(p); to.y = 0;
            const d = to.length();
            if (d < .3) { this.wait = rr(2, 6); this.goal = vec3(c.x + rr(-16, 16), 0, c.z + rr(-14, 14)); }
            else
            {
                const step = to.normalize(1.1 * dt);
                this.yaw += wrapAngle(Math.atan2(-to.x, -to.z) - this.yaw) * min(1, dt * 3);
                this.pos3D = p.add(step);
                this.walk += dt * 6;
            }
        }
        // nudged by the mothling
        const dx = this.pos3D.x - player.pos.x, dz = this.pos3D.z - player.pos.z, d = Math.hypot(dx, dz);
        if (d < 1.3 && d > .01 && player.zone === 'island') this.pos3D = this.pos3D.add(vec3(dx / d, 0, dz / d).scale((1.3 - d) * .5));
        this.pos3D = vec3(this.pos3D.x, heightAt(this.pos3D.x, this.pos3D.z) + this.float + Math.sin(time * 2 + this.note) * this.float * .08, this.pos3D.z);
    }
    pet()
    {
        this.floatT = 3.2;
        bell(this.note + 5, this.pos3D, .5);
        playSfx('bleat', this.pos3D, .8, 1 + this.note / 24);
        burst(this.pos3D.add(vec3(0, 1, 0)), hsl(.9, .6, .8), 10, .04, .2);
        save.sheep++; writeSave();
        if (save.sheep === 1) toast('The cloud sheep floats up like a happy balloon.');
    }
    render3D()
    {
        if (!camNear(this.pos3D, 100)) return;
        const m = mtx(undefined, this.pos3D, vec3(0, this.yaw, 0));
        const wool = hsl(.74, .25, .9), face = hsl(.75, .35, .25);
        for (let k = 0; k < 4; k++)
        {
            const sx = k % 2 ? .25 : -.25, sz = k < 2 ? -.3 : .3;
            const swing = Math.sin(this.walk + k * PI) * .4 * (this.float < .1 ? 1 : 0);
            render3D.drawMesh(CAPS, mtx(m, vec3(sx, .25, sz), vec3(swing, 0, 0), vec3(.16, .32, .16)), undefined, face);
        }
        for (const p of this.puffs) render3D.drawMesh(SPH_LO, mtx(m, p, vec3(), vec3(.6)), undefined, wool);
        render3D.drawMesh(SPH, mtx(m, vec3(0, .82, -.72), vec3(), vec3(.38, .36, .42)), undefined, face);
        for (const s of [-1, 1]) render3D.drawMesh(SPH_LO, mtx(m, vec3(s * .22, .9, -.68), vec3(0, 0, s * .6), vec3(.18, .07, .1)), undefined, face);
        const e = render3D.emissive; render3D.emissive = 1;
        for (const s of [-1, 1]) render3D.drawMesh(SPH_LO, mtx(m, vec3(s * .1, .88, -.9), vec3(), vec3(.05)), undefined, WHITE);
        render3D.emissive = e;
    }
}
function buildSheep()
{
    for (let i = 0; i < 6; i++)
    {
        const x = P.pasture.x + rr(-12, 12), z = P.pasture.z + rr(-10, 10);
        const s = new CloudSheep(vec3(x, heightAt(x, z), z));
        addInteract({ pos: ()=> s.pos3D, r: 2, dy: 4, label: 'Pet the cloud sheep', act: ()=> { moth.reach = 1; s.pet(); } });
    }
    PLACE_NAMES.push({ name: 'Cloudsheep Meadow', sub: 'they are softer than they look', x: P.pasture.x, z: P.pasture.z, r: 16, zone: 'island' });
    addClearing(P.pasture.x, P.pasture.z, 22);
}

export const sheepFeature = {
    build()
    {
        buildSheep();
        addTodo(120, 'Pet a cloud sheep', ()=> save.sheep > 0);
    },
};
