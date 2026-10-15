// Oswin the lantern snail.
import { EngineObject3D, Light3D, PI, WHITE, hsl, render3D, time, vec3 } from '../../platform/engine.js';
import { SNAIL_LINES } from './lines-data.js';
import { addInteract } from '../../game/interact.js';
import { mtx } from '../../platform/mesh.js';
import { CAPS, CYL, SPH, SPH_LO, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { camNear } from '../../render/camera.js';
import { say } from '../../ui/dialog.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

let snailLine = 0;
class Snail extends EngineObject3D
{
    constructor(pos)
    {
        super(pos);
        this.castShadow = true;
        this.yaw = -2.4;
        this.light = new Light3D(pos.add(vec3(0, 1.1, 0)), 6, hsl(.5, .8, .6), 1.3);
        this.light.glow = 1;
    }
    render3D()
    {
        if (!camNear(this.pos3D, 90)) return;
        const t = time, m = mtx(undefined, this.pos3D, vec3(0, this.yaw, 0));
        const body = hsl(.58, .25, .62), shell = hsl(.82, .35, .45);
        const stretch = 1 + Math.sin(t * 1.3) * .04;
        render3D.drawMesh(CAPS, mtx(m, vec3(0, .25, 0), vec3(PI / 2, 0, 0), vec3(.8, 1.5 * stretch, .55)), undefined, body);
        render3D.drawMesh(SPH, mtx(m, vec3(0, .55, -.65 * stretch), vec3(), vec3(.42)), undefined, body);
        for (const s of [-1, 1])
        {
            render3D.drawMesh(CYL, mtx(m, vec3(s * .1, .85, -.7 * stretch), vec3(.3, 0, s * .2), vec3(.04, .4, .04)), undefined, body);
            render3D.drawMesh(SPH_LO, mtx(m, vec3(s * .16, 1.04, -.62 * stretch), vec3(), vec3(.11)), undefined, hsl(.7, .5, .15));
        }
        for (let i = 0; i < 4; i++)
            render3D.drawMesh(TORUS, mtx(m, vec3(0, .78 + i * .05, .25), vec3(PI / 2, 0, 0), vec3(1.1 - i * .25, .9 - i * .2, 1.1 - i * .25)), undefined, shell.lerp(WHITE, i * .08));
        const e = render3D.emissive; render3D.emissive = 1.3;
        render3D.drawMesh(SPH_LO, mtx(m, vec3(0, .8, .25), vec3(), vec3(.32 + Math.sin(t * 2) * .02)), undefined, hsl(.5, .8, .7));
        render3D.emissive = e;
    }
}
function buildSnail()
{
    const x = P.snail.x, z = P.snail.z;
    const s = new Snail(vec3(x, heightAt(x, z), z));
    addSolid({ kind: 'circle', x, z, r: .7, top: 1.2 });
    addInteract({ pos: vec3(x, heightAt(x, z), z), r: 2.6, label: 'Talk to Oswin', act: ()=>
    {
        player.yaw = Math.atan2(-(x - player.pos.x), -(z - player.pos.z));
        say('Oswin the lantern snail', SNAIL_LINES[snailLine % SNAIL_LINES.length]);
        snailLine++;
    } });
}

export const snailFeature = { build: buildSnail };
