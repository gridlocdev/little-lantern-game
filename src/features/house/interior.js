// Inside the crooked house: the room, and going in and out.
import {
    EngineObject3D, Light3D, MOBILE, Mesh, Shader, WHITE, buildBox, buildCone, buildCylinder, buildSphere, hsl,
    rand, vec2, vec3,
} from '../../platform/engine.js';
import { music, setMusic } from '../../audio/music.js';
import { playSfx } from '../../audio/sfx.js';
import { goToSleep } from './bed.js';
import { chooseBook } from './bookshelf.js';
import { StarCat } from './cat.js';
import { exitHouse } from './doors.js';
import { HearthFire } from './hearth.js';
import { Kettle } from './kettle.js';
import { Moonflower, waterFlower } from './moonflower.js';
import { ROOM, hin } from './plan.js';
import { furniture, houseState } from './room-state.js';
import { save } from './save.js';
import { StardustJar } from './stardust-jar.js';
import { openWardrobe } from './wardrobe.js';
import { addInteract } from '../../game/interact.js';
import { core } from '../../game/progress.js';
import { obj3 } from '../../platform/mesh.js';
import { moth } from '../../player/mothling.js';
import { player } from '../../player/player.js';
import { startSit } from '../../player/sit.js';
import { GLSL_NOISE } from '../../render/glsl-noise.js';
import { texPlank, texRug, texStone, texWallpaper } from '../../render/textures.js';
import { say } from '../../ui/dialog.js';
import { openJournal } from '../../ui/journal.js';
import { toast } from '../../ui/toast.js';
import { addSolid } from '../../world/collision.js';
import { HOUSE_AQUARIUM, HOUSE_IN } from '../../world/layout.js';

function roomBox(x, y, z, sx, sy, sz, color, tex, opts = {})
{
    const m = buildBox(vec3(sx, sy, sz));
    if (tex && opts.uv) m.scaleUVs(opts.uv);
    const o = new EngineObject3D(hin(x, y, z), m, tex, color);
    Object.assign(o, opts.obj || {});
    if (opts.solid !== false) addSolid({ kind: 'box', x: o.pos3D.x, z: o.pos3D.z, hx: sx / 2, hz: sz / 2, yaw: 0, top: HOUSE_IN.y + y + sy / 2, zone: 'house' });
    return o;
}
export function buildHouseInterior()
{
    const { w, d, h } = ROOM;
    // floor and walls
    roomBox(0, -.1, 0, w, .2, d, hsl(.08, .25, .62), texPlank, { uv: vec2(5, 4), solid: false });
    addSolid({ kind: 'box', x: HOUSE_IN.x, z: HOUSE_IN.z, hx: w / 2, hz: d / 2, top: HOUSE_IN.y, floor: true, platformOnly: true, zone: 'house', wood: true });
    roomBox(0, h / 2, -d / 2 - .15, w + .6, h, .3, WHITE, texWallpaper, { uv: vec2(4, 1.5) });
    roomBox(-w / 2 - .15, h / 2, 0, .3, h, d, WHITE, texWallpaper, { uv: vec2(3, 1.5) });
    roomBox(w / 2 + .15, h / 2, 0, .3, h, d, WHITE, texWallpaper, { uv: vec2(3, 1.5) });
    roomBox(1.5, .3, d / 2 + .15, w - 3 + .6, .6, .3, hsl(.75, .2, .3));
    roomBox(-w / 2 + .5, .3, d / 2 + .15, 1, .6, .3, hsl(.75, .2, .3));
    for (const x of [-w / 2, w / 2]) roomBox(x, h + .1, 0, .5, .2, d + .6, hsl(.75, .25, .22), undefined, { solid: false });
    roomBox(0, h + .1, -d / 2 - .15, w + .6, .2, .5, hsl(.75, .25, .22), undefined, { solid: false });
    // rug
    const rug = obj3(hin(0, .02, .3), buildBox(vec3(5, .03, 3.4)), WHITE, { tileInfo: texRug });
    // door mat and the way out
    roomBox(-3.5, .02, 4.1, 1.6, .03, .9, hsl(.07, .35, .4), undefined, { solid: false });
    addInteract({ pos: hin(-3.5, 0, 4), r: 1.6, zone: 'house', label: 'Go outside', act: exitHouse, priority: 1 });
    addSolid({ kind: 'box', x: HOUSE_IN.x - 3.5, z: HOUSE_IN.z + 4.85, hx: 1, hz: .3, top: HOUSE_IN.y + 9, zone: 'house' });

    // fireplace with kettle
    const fx = -2.6, fz = -4.05;
    roomBox(fx, 1.1, fz, 2.8, 2.2, .9, WHITE, texStone, { uv: vec2(1.5, 1.2) });
    roomBox(fx, 2.35, fz + .1, 3.2, .25, 1.1, hsl(.75, .25, .25));
    roomBox(fx, 3.2, fz - .1, 1.4, 1.8, .6, WHITE, texStone, { solid: false });
    obj3(hin(fx, .75, fz + .46), buildBox(vec3(1.6, 1.2, .05)), hsl(0, 0, .02), { castShadow: false });
    new HearthFire(hin(fx, .25, fz + .2));
    furniture.fireLight = new Light3D(hin(fx, 1, fz + 1.2), 13, hsl(.07, .9, .6), 2.2);
    furniture.fireLight.glow = 1.2;
    addInteract({ pos: hin(fx - .8, 0, fz + 1.1), r: 1.7, zone: 'house', label: ()=> houseState.fire ? 'Let the fire burn low' : 'Stoke the fire', act: ()=>
    {
        houseState.fire = !houseState.fire;
        playSfx(houseState.fire ? 'ignite' : 'crackle', furniture.fireLight.pos3D, .8);
        moth.reach = 1;
    } });
    const kettlePos = hin(fx + .6, .55, fz + .6);
    new Kettle(kettlePos);
    addInteract({ pos: hin(fx + .7, 0, fz + 1.2), r: 1.6, zone: 'house', priority: .5,
        label: ()=> houseState.kettleReady ? 'Pour a cup of tea' : houseState.kettle > 0 ? 'The kettle is heating…' : 'Put the kettle on',
        act: ()=>
        {
            if (houseState.kettleReady)
            {
                houseState.kettleReady = false; houseState.kettle = 0;
                player.hold = 'cup'; houseState.cupFull = true;
                playSfx('splash', kettlePos, .3, 2);
                toast(MOBILE ? 'Tap Use again to drink it.' : 'Press E again to drink it, wherever you like.');
            }
            else if (houseState.kettle <= 0) { houseState.kettle = .001; playSfx('click', kettlePos, .6); moth.reach = 1; }
        } });
    // armchair facing the fire
    const chair = new Mesh()
        .combine(buildBox(vec3(1.3, .5, 1.2), .12, 2), vec3(0, .35, 0), hsl(.92, .4, .4))
        .combine(buildBox(vec3(1.3, 1, .3), .12, 2), vec3(0, .9, .5), hsl(.92, .4, .36))
        .combine(buildBox(vec3(.25, .7, 1.2), .1, 2), vec3(-.7, .6, 0), hsl(.92, .4, .36))
        .combine(buildBox(vec3(.25, .7, 1.2), .1, 2), vec3(.7, .6, 0), hsl(.92, .4, .36));
    const chairPos = vec3(-2.6, 0, -1.2);
    obj3(hin(chairPos.x, 0, chairPos.z), chair);
    addSolid({ kind: 'box', x: HOUSE_IN.x + chairPos.x, z: HOUSE_IN.z + chairPos.z, hx: .8, hz: .65, top: HOUSE_IN.y + .62, zone: 'house' });
    addInteract({ pos: hin(chairPos.x, 0, chairPos.z + .3), r: 1.6, zone: 'house', label: 'Sit by the fire', act: ()=>
        startSit(hin(chairPos.x, .15, chairPos.z + .1), 0, { onSit: ()=> toast('Warm. The fire pops now and then.'), cam: ()=> ({ target: hin(-2.6, 1.2, -2), dist: 6, yaw: .5, pitch: .35 }) }) });
    // floor lamp
    const lampMesh = new Mesh()
        .combine(buildCylinder(.5, .08, 12), vec3(0, .04, 0), hsl(.11, .5, .35))
        .combine(buildCylinder(.06, 1.8, 6), vec3(0, .95, 0), hsl(.11, .5, .35));
    obj3(hin(-.8, 0, -2.2), lampMesh);
    const shade = obj3(hin(-.8, 1.95, -2.2), buildCone(.8, .55, 12, true, false), hsl(.12, .7, .7), { emissive: 1 });
    furniture.lampLight = new Light3D(hin(-.8, 1.7, -2.2), 8, hsl(.1, .8, .65), 1.6);
    furniture.lampLight.glow = .9;
    addSolid({ kind: 'circle', x: HOUSE_IN.x - .8, z: HOUSE_IN.z - 2.2, r: .3, top: HOUSE_IN.y + 2, zone: 'house' });
    addInteract({ pos: hin(-.8, 0, -2.2), r: 1.4, zone: 'house', label: ()=> houseState.lamp ? 'Switch off the lamp' : 'Switch on the lamp', act: ()=>
    {
        houseState.lamp = !houseState.lamp;
        furniture.lampLight.intensity = houseState.lamp ? 1.6 : 0;
        shade.emissive = houseState.lamp ? 1 : .1;
        playSfx('click', furniture.lampLight.pos3D, .8);
        moth.reach = 1;
    } });

    // bed with a quilt
    const bx = 4.1, bz = -2.6;
    const bed = new Mesh()
        .combine(buildBox(vec3(2.4, .5, 3.4)), vec3(0, .25, 0), hsl(.75, .25, .3))
        .combine(buildBox(vec3(2.25, .3, 3.2), .1, 2), vec3(0, .62, 0), hsl(.6, .2, .88))
        .combine(buildBox(vec3(2.3, .2, 2.1), .08, 2), vec3(0, .82, .55), hsl(.68, .45, .45))
        .combine(buildBox(vec3(1.5, .25, .7), .12, 3), vec3(0, .9, -1.15), hsl(.6, .2, .95))
        .combine(buildBox(vec3(2.5, 1.6, .2)), vec3(0, .8, -1.75), hsl(.75, .25, .26));
    obj3(hin(bx, 0, bz), bed);
    for (let i = 0; i < 9; i++) obj3(hin(bx - 1 + (i % 3) * 1, .94, bz + .1 + Math.floor(i / 3) * .6), buildBox(vec3(.18, .02, .18)), hsl(.13, .8, .7), { emissive: .9, castShadow: false });
    addSolid({ kind: 'box', x: HOUSE_IN.x + bx, z: HOUSE_IN.z + bz, hx: 1.25, hz: 1.8, top: HOUSE_IN.y + 1, zone: 'house' });
    addInteract({ pos: hin(bx - 1.6, 0, bz + .6), r: 1.8, zone: 'house', label: 'Go to sleep', act: goToSleep });
    // aquarium on a stand, a window above it
    const ax = HOUSE_AQUARIUM.x, az = HOUSE_AQUARIUM.z;
    roomBox(ax, .45, az, 2.8, .9, 1.1, hsl(.75, .25, .28));
    const tank = obj3(hin(ax, 1.55, az), buildBox(vec3(2.6, 1.3, .95)), hsl(.58, .7, .55, .22), { transparent: true, castShadow: false, specular: 1, shininess: 60 });
    obj3(hin(ax, .95, az), buildBox(vec3(2.6, .1, .95)), hsl(.13, .4, .7));
    for (let i = 0; i < 9; i++) obj3(hin(ax - 1.1 + i * .27, 1.05 + rand(.1, .4), az + rand(-.3, .3)), buildCone(.12, rand(.3, .7), 5), hsl(rand(.45, .9), .6, .5), { emissive: .4 });
    new Light3D(hin(ax, 1.6, az + 1), 5, hsl(.55, .8, .6), 1.4);
    // window with a night view
    const win = obj3(hin(ax, 3.1, -d / 2 + .02), buildBox(vec3(2.2, 1.2, .05)), WHITE, { emissive: 1, castShadow: false });
    win.shader = windowShader();
    obj3(hin(ax, 3.1, -d / 2 + .05), buildBox(vec3(2.4, .12, .12)), hsl(.75, .25, .25));
    obj3(hin(ax, 3.1, -d / 2 + .05), buildBox(vec3(.12, 1.3, .12)), hsl(.75, .25, .25));
    obj3(hin(ax, 2.45, -d / 2 + .2), buildBox(vec3(2.6, .1, .4)), hsl(.75, .25, .3));
    addInteract({ pos: hin(ax + 1.4, 0, az + 1.1), r: 1.4, zone: 'house', label: 'Look out the window', act: ()=>
        say('', ['Outside, the pond is full of stars and the willow is swaying, though there is no wind.', 'Somewhere out in the dark, something very large is humming to itself.']) });
    // moonflower pot on the sill
    furniture.flower = new Moonflower(hin(ax - 1.8, 0, az + .4));
    addInteract({ pos: hin(ax - 1.8, 0, az + 1.1), r: 1.4, zone: 'house', label: ()=> save.flower >= 4 ? 'Admire the moonflower' : save.flowerWatered === core.visits ? 'The soil is still damp' : 'Water the moonflower', act: waterFlower });
    // bookshelf
    const shx = -5.6, shz = -1.4;
    roomBox(shx, 1.6, shz, .6, 3.2, 2.2, hsl(.75, .25, .25));
    const books = new Mesh();
    for (let s = 0; s < 4; s++)
    for (let b = 0; b < 9; b++)
    {
        const bh = rand(.45, .62);
        books.combine(buildBox(vec3(.4, bh, .18)), vec3(.32, .5 + s * .72 + bh / 2 - .25, -.85 + b * .21), hsl(rand(), .45, rand(.35, .55)));
    }
    obj3(hin(shx, 0, shz), books);
    addInteract({ pos: hin(shx + 1, 0, shz), r: 1.8, zone: 'house', label: 'Read a book', act: chooseBook });
    // wardrobe
    const wx = -5.5, wz = 2;
    roomBox(wx, 1.4, wz, .9, 2.8, 1.8, hsl(.8, .3, .32));
    obj3(hin(wx + .46, 1.4, wz), buildBox(vec3(.04, 2.4, .02)), hsl(.8, .3, .2));
    for (const z of [-.25, .25]) obj3(hin(wx + .5, 1.4, wz + z), buildSphere(.09, 6, 4), hsl(.12, .6, .55));
    addInteract({ pos: hin(wx + 1.1, 0, wz), r: 1.8, zone: 'house', label: 'Open the wardrobe', act: openWardrobe });
    // desk with the journal and a candle
    const dx = 5.4, dz = 1.8;
    roomBox(dx, .45, dz, 1, .9, 2, hsl(.75, .25, .3));
    obj3(hin(dx - .1, .93, dz + .2), buildBox(vec3(.45, .05, .6)), hsl(.95, .45, .4));
    obj3(hin(dx, 1.05, dz - .6), buildCylinder(.1, .25, 8), hsl(.13, .3, .9));
    obj3(hin(dx, 1.22, dz - .6), buildSphere(.08, 6, 4), hsl(.1, 1, .7), { emissive: 2, castShadow: false });
    const candle = new Light3D(hin(dx, 1.3, dz - .6), 5, hsl(.09, .9, .6), 1.2); candle.glow = .6;
    addInteract({ pos: hin(dx - 1, 0, dz), r: 1.6, zone: 'house', label: 'Open your dream journal', act: ()=> openJournal('island') });
    // gramophone
    const gx = 3.6, gz = 3;
    roomBox(gx, .4, gz, 1, .8, .9, hsl(.75, .25, .3));
    obj3(hin(gx, .9, gz), buildBox(vec3(.7, .2, .6)), hsl(.08, .45, .35));
    const horn = obj3(hin(gx + .15, 1.35, gz - .1), buildCone(.6, .7, 12, true, false), hsl(.12, .6, .55), { rotation3D: vec3(-.5, 0, .4) });
    furniture.record = obj3(hin(gx - .05, 1.02, gz + .05), buildCylinder(.5, .03, 16), hsl(.72, .3, .12));
    addInteract({ pos: hin(gx - .9, 0, gz), r: 1.6, zone: 'house', label: ()=> music.on ? 'Lift the needle' : 'Play a record', act: ()=>
    {
        setMusic(!music.on);
        playSfx('click', horn.pos3D, .8);
        toast(music.on ? 'A slow, sleepy song starts up.' : 'The room goes quiet. You can hear the fire.');
        moth.reach = 1;
    } });
    // stardust jar on a little table
    const jx = 3.9, jz = .2;
    roomBox(jx, .4, jz, .7, .8, .7, hsl(.75, .25, .3));
    furniture.jar = new StardustJar(hin(jx, .8, jz));
    addInteract({ pos: hin(jx - .8, 0, jz), r: 1.5, zone: 'house', label: 'Look at the stardust jar', act: ()=>
        say('The stardust jar', core.stardust ? `${core.stardust} specks of stardust swirl around inside. It is a little brighter every time.` : 'It is empty. Stars fall on the island now and then. Look for a pillar of light.') });
    // the star cat
    furniture.cat = new StarCat();
    addInteract({ pos: ()=> furniture.cat.pos3D, r: 1.6, zone: 'house', label: 'Pet the star cat', act: ()=> furniture.cat.pet() });
}
function windowShader()
{
    return new Shader(GLSL_NOISE + `
void mainImage(out vec4 c, vec2 uv){
  vec2 p = localUV;
  vec3 col = mix(vec3(.02,.01,.06), vec3(.12,.06,.25), p.y);
  vec2 g = floor(p*vec2(60.,30.));
  float h = vh2(g);
  col += step(.94, h) * (.5 + .5*sin(iTime*2. + h*40.)) * vec3(.9,.9,1.);
  float moon = smoothstep(.13, .11, length((p - vec2(.75, .3))*vec2(1.8, 1.)));
  col = mix(col, vec3(.9,.88,1.), moon);
  col += vec3(.5,.4,.8) * smoothstep(.35, 0., length((p - vec2(.75, .3))*vec2(1.8,1.))) * .3;
  c = vec4(col, 1.);
}`);
}
