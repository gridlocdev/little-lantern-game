// The signpost at the crossing.
import { EngineObject3D, Mesh, PI, WHITE, buildBox, hsl, vec2, vec3 } from '../../platform/engine.js';
import { canvasTexture, mtx, obj3, triMesh } from '../../platform/mesh.js';
import { PLACE_NAMES } from '../../ui/places.js';
import { addSolid } from '../collision.js';
import { P } from '../layout.js';
import { heightAt } from '../terrain.js';

function signTexture(text)
{
    return canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#6c5f86'; g.fillRect(0, 0, s, s);
        g.fillStyle = '#efe6ff';
        g.font = '600 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(text, s / 2, s / 2, s - 20);
    }, false);
}
export function buildSignpost()
{
    const sx = 8.6, sz = 20.5, sy = heightAt(sx, sz);
    obj3(vec3(sx, sy + 1.4, sz), buildBox(vec3(.16, 2.8, .16)), hsl(.75, .2, .3));
    addSolid({ kind: 'circle', x: sx, z: sz, r: .2, top: 3 });
    const signs = [['The Crooked House', P.house], ['Void Pier', P.pierBase], ['Moonwillow Swing', P.swing], ['Mushroom Hollow', P.mushrooms], ['Cloudsheep Meadow', P.pasture]];
    signs.forEach(([name, to], i)=>
    {
        const yaw = Math.atan2(-(to.x - sx), -(to.z - sz));
        const board = new Mesh();
        board.combine(buildBox(vec3(1.5, .3, .06)), vec3(.62, 0, 0), hsl(.75, .2, .38));
        const face = triMesh([vec3(-.72, -.14, .035), vec3(.72, -.14, .035), vec3(.72, .14, .035), vec3(-.72, .14, .035)], [0, 1, 2, 0, 2, 3], vec3(0, 0, 1), WHITE,
            [vec2(0, .58), vec2(1, .58), vec2(1, .42), vec2(0, .42)]);
        const back = triMesh([vec3(.72, -.14, -.035), vec3(-.72, -.14, -.035), vec3(-.72, .14, -.035), vec3(.72, .14, -.035)], [0, 1, 2, 0, 2, 3], vec3(0, 0, -1), WHITE,
            [vec2(0, .58), vec2(1, .58), vec2(1, .42), vec2(0, .42)]);
        const tex = signTexture(name);
        const holder = mtx(undefined, vec3(sx, sy + 2.45 - i * .38, sz), vec3(0, yaw + PI / 2, 0));
        const b = new EngineObject3D(vec3(), board); b.localMatrix = holder;
        const f = new EngineObject3D(vec3(), face.combine(back), tex); f.localMatrix = mtx(holder, vec3(.62, 0, 0));
    });
    PLACE_NAMES.push({ name: 'Lantern Crossing', sub: 'all the roads meet here', x: 6, z: 22, r: 5, zone: 'island' });
}
