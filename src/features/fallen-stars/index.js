// Stars that fall onto the island, to collect as stardust.
import {
    EngineObject3D, Light3D, PI, abs, buildMatrix, hsl, min, rand, randInt, render3D, timeDelta, vec3,
} from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { addStardust, core } from '../../game/progress.js';
import { state } from '../../game/state.js';
import { TAU, dist2 } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { CONE, SPH } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { burst, sparkleColumn } from '../../render/particles.js';
import { ShootingStar } from '../../sky/shooting-star.js';
import { addTodo } from '../../ui/journal.js';
import { toast } from '../../ui/toast.js';
import { isClear } from '../../world/clearings.js';
import { solidContains, solidsAt } from '../../world/collision.js';
import { P, insideIsland } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const fallenStars = [];
let nextStarFall = 22;
class FallenStar extends EngineObject3D
{
    constructor(pos)
    {
        super(pos.copy());
        this.castShadow = false;
        this.t = 0;
        this.light = new Light3D(pos.add(vec3(0, 1, 0)), 10, hsl(.13, .8, .7), 2);
        this.light.glow = 2;
        this.addChild(this.light);
        this.light.pos3D = vec3(0, 1, 0);
        fallenStars.push(this);
    }
    update()
    {
        this.t += timeDelta;
        if (this.t > 150) return this.vanish();
        if (state.mode === 'play' && player.zone === 'island' && dist2(player.pos.x, player.pos.z, this.pos3D.x, this.pos3D.z) < 1.6 && abs(player.pos.y - this.pos3D.y) < 2.5)
        {
            const n = randInt(3, 8);
            addStardust(n);
            playSfx('collect', this.pos3D, 1);
            sparkleColumn(this.pos3D, hsl(.13, .9, .75), 36, 2);
            toast(`+${n} stardust`);
            this.vanish();
        }
    }
    vanish()
    {
        const i = fallenStars.indexOf(this);
        if (i >= 0) fallenStars.splice(i, 1);
        this.destroy();
    }
    render3D()
    {
        const p = this.pos3D, s = .55 + Math.sin(this.t * 4) * .05;
        const e = render3D.emissive; render3D.emissive = 2;
        const m = mtx(undefined, p.add(vec3(0, .7 + Math.sin(this.t * 2) * .15, 0)), vec3(0, this.t * 1.5, 0));
        for (let k = 0; k < 5; k++)
            render3D.drawMesh(CONE, mtx(m, vec3(), vec3(0, 0, k / 5 * TAU), vec3(.18, s, .12)).multiply(buildMatrix(vec3(0, .5, 0))), undefined, hsl(.13, .8, .75));
        render3D.drawMesh(SPH, mtx(m, vec3(), vec3(), vec3(.35, .35, .2)), undefined, hsl(.13, .6, .9));
        render3D.emissive = e;
    }
}
class StarPillars extends EngineObject3D
{
    constructor() { super(vec3()); this.additive = true; this.castShadow = false; }
    render3D()
    {
        for (const f of fallenStars)
        {
            const p = f.pos3D, a = .35 * min(1, f.t) * (f.t > 140 ? (150 - f.t) / 10 : 1);
            render3D.drawRibbon([p, p.add(vec3(0, 18, 0)), p.add(vec3(0, 60, 0))], [1.2, .7, .2], undefined, [hsl(.13, .7, .8, a), hsl(.13, .7, .8, a * .5), hsl(.13, .7, .8, 0)]);
        }
    }
}
function landFallenStar(pos)
{
    playSfx('collect', pos, .6, .5);
    burst(pos.add(vec3(0, .5, 0)), hsl(.13, .9, .75), 30, .12, .3);
    new FallenStar(pos);
}
function compassWord(dx, dz)
{
    const a = Math.atan2(dx, -dz);
    return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][(Math.round(a / (PI / 4)) + 8) % 8];
}
function updateStarFall()
{
    if (state.mode !== 'play') return;
    nextStarFall -= timeDelta;
    if (rand() < timeDelta / 9) new ShootingStar();
    if (nextStarFall > 0 || fallenStars.length >= 3 || player.zone !== 'island') return;
    nextStarFall = rand(40, 75);
    for (let i = 0; i < 40; i++)
    {
        const a = rand(TAU), d = rand(22, 55);
        const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
        if (!insideIsland(x, z, 6) || dist2(x, z, P.pond.x, P.pond.z) < P.pond.r + 2 || !isClear(x, z, -1)) continue;
        if (solidsAt(x, z).some((s)=> solidContains(s, x, z, .8))) continue;
        new ShootingStar(vec3(x, heightAt(x, z), z), landFallenStar);
        setTimeout(()=> toast(`A star fell to the ${compassWord(x - player.pos.x, z - player.pos.z)}.`), 2400);
        return;
    }
}

export const fallenStarsFeature = {
    build() { addTodo(110, 'Collect a fallen star', ()=> core.stardust > 0); },
    buildLate() { new StarPillars; },
    update: updateStarFall,
};
