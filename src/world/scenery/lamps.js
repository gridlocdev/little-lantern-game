// Lamps along the roads.
import {
    EngineObject3D, InstancedMesh3D, Light3D, Mesh, buildBox, buildCone, buildCylinder, buildMatrix, buildSphere,
    hsl, render3D, vec3,
} from '../../platform/engine.js';
import { TAU, dist2 } from '../../lib/math.js';
import { rr } from '../../platform/random.js';
import { camNear } from '../../render/camera.js';
import { addSolid } from '../collision.js';
import { P, insideIsland } from '../layout.js';
import { ROADS } from '../road-field.js';
import { heightAt } from '../terrain.js';

const lampLights = [];
let glowSet; // the lamp glass glows
// a soft pool of lamplight on the ground, so a lamp reads as shining down
class LampPool extends EngineObject3D
{
    constructor(pos, size, color)
    {
        super(pos);
        this.additive = true;
        this.castShadow = false;
        this.poolSize = size;
        this.poolColor = color;
    }
    render3D() { if (camNear(this.pos3D, 80)) render3D.drawSoftDisc(this.pos3D, this.poolSize, this.poolColor, vec3(0, 1, 0), 24); }
}
export function buildLamps()
{
    const spots = [];
    ROADS.forEach((pts, ri)=>
    {
        let acc = 9 + ri * 3, side = ri % 2 ? 1 : -1;
        for (let i = 1; i < pts.length - 1; i++)
        {
            acc += dist2(pts[i][0], pts[i][1], pts[i - 1][0], pts[i - 1][1]);
            if (acc < 17) continue;
            acc = 0; side = -side;
            const [x, z] = pts[i], [nx, nz] = pts[i + 1];
            let tx = nx - x, tz = nz - z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
            const px = x - tz * 2.7 * side, pz = z + tx * 2.7 * side;
            if (dist2(px, pz, P.pond.x, P.pond.z) < P.pond.r + 2) continue;
            if (spots.some((s)=> dist2(s[0], s[1], px, pz) < 8)) continue;
            if (!insideIsland(px, pz, 3)) continue;
            spots.push([px, pz]);
        }
    });
    // the crossroads by the spawn gets a warmer lamp, its arm reaching out over the junction
    const cross = { x: P.spawn.x - 2.9, z: P.spawn.z - 1.05 }; // the tip of the grass corner west of the junction
    const crossYaw = Math.atan2(-(P.spawn.z - cross.z), P.spawn.x - cross.x);
    spots.push([cross.x, cross.z]);
    const post = new Mesh()
        .combine(buildCylinder(.12, 3, 6), vec3(0, 1.5, 0), hsl(.72, .2, .14))
        .combine(buildCylinder(.32, .25, 8), vec3(0, .1, 0), hsl(.72, .12, .3))
        .combine(buildBox(vec3(.7, .07, .07)), vec3(.3, 2.95, 0), hsl(.72, .2, .14))
        .combine(buildCone(.42, .22, 6), vec3(.58, 2.78, 0), hsl(.72, .2, .14))
        .combine(buildCylinder(.3, .05, 6), vec3(.58, 2.27, 0), hsl(.72, .2, .14));
    const posts = new InstancedMesh3D(post, spots.length);
    glowSet = new InstancedMesh3D(buildSphere(.26, 8, 6), spots.length, undefined, hsl(.58, .8, .75));
    glowSet.emissive = 1.6; glowSet.castShadow = false;
    spots.forEach(([x, z], i)=>
    {
        const isCross = i === spots.length - 1;
        const randomYaw = rr(0, TAU); // drawn for every lamp so the scenery placed after this stays where it was
        const y = heightAt(x, z), yaw = isCross ? crossYaw : randomYaw;
        posts.setMatrixAt(i, buildMatrix(vec3(x, y - .05, z), vec3(0, yaw, 0)));
        const head = vec3(x + Math.cos(yaw) * .58, y + 2.5, z - Math.sin(yaw) * .58);
        glowSet.setMatrixAt(i, buildMatrix(head));
        glowSet.setColorAt(i, isCross ? hsl(.11, .8, .75) : hsl(.58, .8, .75));
        // the crossroads light hangs just under the shade so it falls on the junction below
        const L = isCross ? new Light3D(head.add(vec3(0, -.2, 0)), 11, hsl(.1, .65, .7), 2.2) : new Light3D(head, 10, hsl(.6, .7, .7), 1.5);
        L.glow = 1.6; L.glowFalloff = 1.4;
        lampLights.push(L);
        if (isCross) new LampPool(vec3(head.x, heightAt(head.x, head.z) + .04, head.z), 7, hsl(.1, .7, .6, .26));
        addSolid({ kind: 'circle', x, z, r: .25, top: 3 });
    });
}
