'use strict';

// ================================================================ INSIDE THE CROOKED HOUSE
// the room floats in the dark far below the island; you get there through the front door
const HOUSE_IN = vec3(0, -260, 420);
const ROOM = { w: 12, d: 9, h: 4.2 };
const hin = (x, y, z)=> HOUSE_IN.add(vec3(x, y, z));
const houseState = { fire: true, lamp: true, kettle: 0, kettleReady: false, cupFull: false };
let fireLight, lampLight, catObj, flowerObj, jarObj, recordObj;
const BOOKS = [
    { title: 'A Field Guide to Falling Stars', pages: [
        'Chapter One. Stars do not fall so much as they wander off. They get distracted by something shiny below them and simply forget to stay up.',
        'When a star lands, it glows for a while out of embarrassment. This is the best time to collect it.',
        'Stardust keeps forever in a jar. It does, however, prefer a jar with a view.'] },
    { title: 'The Moth Who Wanted the Moon', pages: [
        'There was once a moth who flew toward the moon every night and never got any closer.',
        'One night she stopped flying and simply sat on a swing, going back and forth, higher and higher.',
        'At the very top she reached out a hand, and the moon, which had been watching her all along, reached back.'] },
    { title: 'Tea for One, Tea for Two', pages: [
        'Recipe for night tea: one kettle, one fire, a pinch of patience.',
        'Wait for the whistle. Pour slowly. Hold the cup with both hands even if it is not cold out. Especially if it is not cold out.'] },
    { title: 'Navigation by Snail', pages: [
        'Step one: decide where you are going. Step two: forget. Step three: arrive somewhere better.',
        'This book was written over a period of eleven years. The author was very thorough.'] },
    { title: 'Letters from the Star Whale', pages: [
        'Dear small island. I have been circling you for a long time now. You are the warmest thing out here.',
        'If you ever hear me singing, I am only saying hello. If you sing back, I will hear you. Even if you only hum.',
        'P.S. I have lost one of my little ones somewhere near you. If you find it, I hope you will be kind.'] },
];
const DREAMS = [
    'You dream you are a fish swimming between the stars, and the whale swims beside you without saying anything.',
    'You dream the house drifts off on its own, and you steer it with the kettle handle.',
    'You dream of a library where every book is the same book and it is your favorite one.',
    'You dream the moon is a pond, and someone on the other side is fishing for you, very gently.',
    'You dream nothing at all, which is its own kind of nice.',
];

function enterHouse()
{
    playSfx('door', player.pos, .9);
    fadeTransition(()=>
    {
        player.zone = 'house';
        player.pos = hin(-3.5, 0, 3.2);
        player.vel = vec3();
        player.yaw = 0;
        cam.look = player.pos.add(vec3(0, .9, 0));
        save.visits++; writeSave();
        render3D.camera.pos = cam.look.add(vec3(0, 8, 8));
        refreshAquarium();
        flowerObj && flowerObj.sync();
        showPlace('Home', 'the kettle is still warm');
        if (rand() < .5 && catObj) catObj.moveTo(randInt(CAT_SPOTS.length));
    });
}
function exitHouse()
{
    playSfx('door', player.pos, .9);
    fadeTransition(()=>
    {
        player.zone = 'island';
        const d = HOUSE.door;
        player.pos = vec3(d.x, heightAt(d.x, d.z), d.z + .4);
        player.vel = vec3();
        player.yaw = PI;
        cam.yaw = PI; cam.pitch = .3;
        cam.look = player.pos.add(vec3(0, 1.1, 0));
        if (player.hold === 'cup') player.hold = 'lantern';
    });
}

function roomBox(x, y, z, sx, sy, sz, color, tex, opts = {})
{
    const m = buildBox(vec3(sx, sy, sz));
    if (tex && opts.uv) m.scaleUVs(opts.uv);
    const o = new EngineObject3D(hin(x, y, z), m, tex, color);
    Object.assign(o, opts.obj || {});
    if (opts.solid !== false) addSolid({ kind: 'box', x: o.pos3D.x, z: o.pos3D.z, hx: sx / 2, hz: sz / 2, yaw: 0, top: HOUSE_IN.y + y + sy / 2, zone: 'house' });
    return o;
}
function buildHouseInterior()
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
    fireLight = new Light3D(hin(fx, 1, fz + 1.2), 13, hsl(.07, .9, .6), 2.2);
    fireLight.glow = 1.2;
    addInteract({ pos: hin(fx - .8, 0, fz + 1.1), r: 1.7, zone: 'house', label: ()=> houseState.fire ? 'Let the fire burn low' : 'Stoke the fire', act: ()=>
    {
        houseState.fire = !houseState.fire;
        playSfx(houseState.fire ? 'whoosh' : 'crackle', fireLight.pos3D, .7);
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
    lampLight = new Light3D(hin(-.8, 1.7, -2.2), 8, hsl(.1, .8, .65), 1.6);
    lampLight.glow = .9;
    addSolid({ kind: 'circle', x: HOUSE_IN.x - .8, z: HOUSE_IN.z - 2.2, r: .3, top: HOUSE_IN.y + 2, zone: 'house' });
    addInteract({ pos: hin(-.8, 0, -2.2), r: 1.4, zone: 'house', label: ()=> houseState.lamp ? 'Switch off the lamp' : 'Switch on the lamp', act: ()=>
    {
        houseState.lamp = !houseState.lamp;
        lampLight.intensity = houseState.lamp ? 1.6 : 0;
        shade.emissive = houseState.lamp ? 1 : .1;
        playSfx('click', lampLight.pos3D, .8);
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
    const ax = 1.2, az = -3.9;
    roomBox(ax, .45, az, 2.8, .9, 1.1, hsl(.75, .25, .28));
    const tank = obj3(hin(ax, 1.55, az), buildBox(vec3(2.6, 1.3, .95)), hsl(.58, .7, .55, .22), { transparent: true, castShadow: false, specular: 1, shininess: 60 });
    obj3(hin(ax, .95, az), buildBox(vec3(2.6, .1, .95)), hsl(.13, .4, .7));
    for (let i = 0; i < 9; i++) obj3(hin(ax - 1.1 + i * .27, 1.05 + rand(.1, .4), az + rand(-.3, .3)), buildCone(.12, rand(.3, .7), 5), hsl(rand(.45, .9), .6, .5), { emissive: .4 });
    new Light3D(hin(ax, 1.6, az + 1), 5, hsl(.55, .8, .6), 1.4);
    new AquariumFish();
    addInteract({ pos: hin(ax, 0, az + 1.1), r: 1.7, zone: 'house', label: 'Look at the aquarium', act: ()=>
    {
        if (!save.aquarium.length) say('', 'The aquarium is empty, except for a little crystal castle. Fish you choose to keep will swim here.');
        else openJournal('fish');
    } });
    // window with a night view
    const win = obj3(hin(ax, 3.1, -d / 2 + .02), buildBox(vec3(2.2, 1.2, .05)), WHITE, { emissive: 1, castShadow: false });
    win.shader = windowShader();
    obj3(hin(ax, 3.1, -d / 2 + .05), buildBox(vec3(2.4, .12, .12)), hsl(.75, .25, .25));
    obj3(hin(ax, 3.1, -d / 2 + .05), buildBox(vec3(.12, 1.3, .12)), hsl(.75, .25, .25));
    obj3(hin(ax, 2.45, -d / 2 + .2), buildBox(vec3(2.6, .1, .4)), hsl(.75, .25, .3));
    addInteract({ pos: hin(ax + 1.4, 0, az + 1.1), r: 1.4, zone: 'house', label: 'Look out the window', act: ()=>
        say('', ['Outside, the pond is full of stars and the willow is swaying, though there is no wind.', 'Somewhere out in the dark, something very large is humming to itself.']) });
    // moonflower pot on the sill
    flowerObj = new Moonflower(hin(ax - 1.8, 0, az + .4));
    addInteract({ pos: hin(ax - 1.8, 0, az + 1.1), r: 1.4, zone: 'house', label: ()=> save.flower >= 4 ? 'Admire the moonflower' : save.flowerWatered === save.visits ? 'The soil is still damp' : 'Water the moonflower', act: waterFlower });
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
    recordObj = obj3(hin(gx - .05, 1.02, gz + .05), buildCylinder(.5, .03, 16), hsl(.72, .3, .12));
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
    jarObj = new StardustJar(hin(jx, .8, jz));
    addInteract({ pos: hin(jx - .8, 0, jz), r: 1.5, zone: 'house', label: 'Look at the stardust jar', act: ()=>
        say('The stardust jar', save.stardust ? `${save.stardust} specks of stardust swirl around inside. It is a little brighter every time.` : 'It is empty. Stars fall on the island now and then. Look for a pillar of light.') });
    // the star cat
    catObj = new StarCat();
    addInteract({ pos: ()=> catObj.pos3D, r: 1.6, zone: 'house', label: 'Pet the star cat', act: ()=> catObj.pet() });
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

// the fire in the hearth
class HearthFire extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = false; this.additive = true; this.nextCrackle = 0; }
    update()
    {
        const on = houseState.fire;
        fireLight.intensity = on ? 2.1 + Math.sin(time * 9) * .25 + Math.sin(time * 23) * .15 : .35;
        if (on && player.zone === 'house' && time > this.nextCrackle) { this.nextCrackle = time + rand(.2, 1.4); playSfx('crackle', this.pos3D, rand(.2, .5)); }
    }
    render3D()
    {
        const on = houseState.fire ? 1 : .25;
        for (let i = 0; i < 6; i++)
        {
            const x = (i - 2.5) * .18, h = (.5 + Math.sin(time * 7 + i * 2) * .15) * on;
            render3D.drawSoftDisc(this.pos3D.add(vec3(x, h * .5, 0)), h * 1.3, hsl(.06 + i * .01, 1, .55, .8));
        }
        render3D.drawSoftDisc(this.pos3D.add(vec3(0, .25, 0)), 1.6 * on, hsl(.08, 1, .5, .4));
    }
}
class Kettle extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = true; }
    update()
    {
        if (houseState.kettle > 0 && !houseState.kettleReady)
        {
            houseState.kettle += timeDelta;
            if (rand() < timeDelta * houseState.kettle * 2) burst(this.pos3D.add(vec3(.2, .35, 0)), hsl(0, 0, .9, .35), 2, .02, .25, 1.5, .001, false);
            if (houseState.kettle > 4)
            {
                houseState.kettleReady = true;
                playSfx('whistle', this.pos3D, .8);
                if (player.zone === 'house') toast('The kettle whistles.');
            }
        }
        else if (houseState.kettleReady && rand() < timeDelta * 4) burst(this.pos3D.add(vec3(.2, .35, 0)), hsl(0, 0, .9, .3), 1, .02, .3, 1.5, .001, false);
    }
    render3D()
    {
        const m = mtx(undefined, this.pos3D, vec3(0, .4, 0));
        const c = hsl(.55, .35, .5);
        render3D.drawMesh(SPH, mtx(m, vec3(), vec3(), vec3(.5, .4, .5)), undefined, c);
        render3D.drawMesh(CYL, mtx(m, vec3(.27, .05, 0), vec3(0, 0, -.9), vec3(.07, .3, .07)), undefined, c);
        render3D.drawMesh(TORUS, mtx(m, vec3(0, .26, 0), vec3(PI / 2, 0, 0), vec3(.3, .3, .2)), undefined, hsl(.75, .2, .2));
    }
}
function drinkTea()
{
    if (!houseState.cupFull) return;
    houseState.cupFull = false;
    player.pose = 'cup';
    playSfx('sip', player.pos, .8);
    setTimeout(()=> playSfx('sip', player.pos, .7, 1.1), 500);
    setTimeout(()=>
    {
        player.pose = 'free'; player.hold = 'lantern';
        save.tea++; writeSave();
        moth.warm = 30;
        toast('Warm all the way down to your wings.');
    }, 1300);
}
// fish you keep swim here
let aquariumList = [];
function refreshAquarium()
{
    aquariumList = save.aquarium.slice(-12).map((id, i)=> ({ f: fishById(id), ph: i * 1.7 + rand(), sp: rand(.25, .5), y: rand(-.35, .35), dir: rand() < .5 ? 1 : -1 }));
}
class AquariumFish extends EngineObject3D
{
    constructor() { super(hin(1.2, 1.55, -3.9)); this.castShadow = false; refreshAquarium(); }
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
class StardustJar extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = false; this.light = new Light3D(pos.add(vec3(0, .5, 0)), 4, hsl(.13, .8, .6), 0); }
    render3D()
    {
        const p = this.pos3D, fill = clamp(save.stardust / 120);
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .32, 0)), vec3(), vec3(.42, .64, .42)), undefined, hsl(.6, .3, .8, .35));
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .68, 0)), vec3(), vec3(.3, .1, .3)), undefined, hsl(.08, .4, .4));
        const e = render3D.emissive; render3D.emissive = 1.5;
        const n = min(40, save.stardust);
        for (let i = 0; i < n; i++)
        {
            const a = time * (.4 + (i % 5) * .1) + i * 2.4, r = .08 + (i % 4) * .03;
            render3D.drawMesh(SPH_LO, mtx(undefined, p.add(vec3(Math.cos(a) * r, .08 + ((i * .37) % 1) * .45 * (.3 + fill * .7), Math.sin(a) * r)), vec3(), vec3(.03)), undefined, hsl(.13, .9, .8));
        }
        render3D.emissive = e;
        this.light.intensity = save.stardust ? .6 + fill * 1.4 : 0;
    }
}
class Moonflower extends EngineObject3D
{
    constructor(pos) { super(pos); this.castShadow = true; this.shown = save.flower; this.light = new Light3D(pos.add(vec3(0, 3.4, .4)), 4, hsl(.55, .8, .7), 0); }
    sync() { this.shown = save.flower; }
    render3D()
    {
        const p = this.pos3D.add(vec3(0, 2.5, 0)), st = this.shown;
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .15, 0)), vec3(), vec3(.45, .3, .45)), undefined, hsl(.04, .45, .45));
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .29, 0)), vec3(), vec3(.4, .02, .4)), undefined, hsl(.07, .3, .2));
        if (st < 1) return;
        const h = .2 + st * .18;
        render3D.drawMesh(CYL, mtx(undefined, p.add(vec3(0, .3 + h / 2, 0)), vec3(0, 0, Math.sin(time) * .04), vec3(.04, h, .04)), undefined, hsl(.4, .45, .4));
        for (let k = 0; k < min(st, 3) * 2; k++)
            render3D.drawMesh(SPH_LO, mtx(undefined, p.add(vec3(0, .35 + k * .08, 0)), vec3(0, k * 2.2, .7), vec3(.22, .03, .1)).multiply(buildMatrix(vec3(.5, 0, 0))), undefined, hsl(.38, .5, .45));
        const e = render3D.emissive;
        render3D.emissive = st >= 4 ? 1.4 + Math.sin(time * 2) * .2 : .4;
        const bloom = st >= 4 ? 1 : st === 3 ? .45 : 0;
        if (bloom > 0)
            for (let k = 0; k < 6; k++)
                render3D.drawMesh(SPH_LO, mtx(undefined, p.add(vec3(0, .3 + h + .05, 0)), vec3(.3 * (1 - bloom), k / 6 * TAU, .5 * bloom + .2), vec3(.22 * bloom + .05, .03, .1)).multiply(buildMatrix(vec3(.6, 0, 0))), undefined, hsl(.56, .7, .82));
        render3D.drawMesh(SPH_LO, mtx(undefined, p.add(vec3(0, .32 + h, 0)), vec3(), vec3(.09 + bloom * .05)), undefined, hsl(.13, .9, .8));
        render3D.emissive = e;
        this.light.intensity = st >= 4 ? 1.3 : 0;
    }
}
function waterFlower()
{
    if (save.flower >= 4) return say('The moonflower', 'It is in full bloom and glowing like a small, polite moon.');
    if (save.flowerWatered === save.visits) return toast('Already watered. It grows a little each time you come home.');
    save.flowerWatered = save.visits;
    save.flower++;
    writeSave();
    player.hold = 'can';
    moth.reach = 1;
    setTimeout(()=> { player.hold = 'lantern'; flowerObj.sync(); burst(flowerObj.pos3D.add(vec3(0, 3, 0)), hsl(.45, .7, .7), 12, .03, .15); }, 900);
    toast(['A tiny sprout pokes up.', 'It has leaves now.', 'A bud, glowing faintly.', 'It blooms! The whole room turns a little blue.'][save.flower - 1]);
}
function chooseBook()
{
    say('The bookshelf', 'Which one?', BOOKS.map((b, i)=> ({
        label: (save.books[i] ? '' : '★ ') + b.title,
        fn: ()=>
        {
            player.pose = 'book'; player.hold = 'book';
            save.books[i] = true; writeSave();
            say(b.title, b.pages).then(()=> { player.pose = 'free'; player.hold = 'lantern'; });
        },
    })).concat([{ label: 'Never mind', cancel: true }]));
}
function openWardrobe()
{
    playSfx('door', player.pos, .5, 1.5);
    say('The wardrobe', 'Scarves and wing dust in every color. Which look tonight?', OUTFITS.map((o, i)=> ({
        label: (i === save.outfit ? '✓ ' : '') + o.name,
        fn: ()=>
        {
            save.outfit = i;
            save.outfitsTried = [...new Set([...(save.outfitsTried || [0]), i])];
            writeSave();
            sparkleColumn(player.pos, o.spot, 30, 1.2);
            playSfx('collect', player.pos, .5, 1.3);
        },
    })).slice(0, 6));
}
function goToSleep()
{
    const dream = DREAMS[save.slept % DREAMS.length];
    fadeTransition(()=>
    {
        setPalette(save.palette + 1);
        save.slept++; writeSave();
        player.pos = hin(2.2, 0, -1.6);
        player.yaw = PI / 2;
        if (catObj) catObj.moveTo(2);
        say('', [dream, `You wake under a new sky: ${PALETTES[save.palette].name}.`]);
    }, 1400);
}

// the star cat, asleep in a different place each time
const CAT_SPOTS = [vec3(.3, .05, .5), vec3(-2.6, .62, -1.25), vec3(3.6, 1, -2.2), vec3(4, .82, .2)];
class StarCat extends EngineObject3D
{
    constructor() { super(hin(CAT_SPOTS[0].x, CAT_SPOTS[0].y, CAT_SPOTS[0].z)); this.castShadow = true; this.purr = 0; this.spot = 0; this.yaw = 1; }
    moveTo(i)
    {
        this.spot = i % CAT_SPOTS.length;
        const s = CAT_SPOTS[this.spot];
        this.pos3D = hin(s.x, s.y, s.z);
        this.yaw = rand(TAU);
    }
    pet()
    {
        this.purr = 3;
        moth.reach = 1.5;
        playSfx('purr', this.pos3D, 1);
        burst(this.pos3D.add(vec3(0, .5, 0)), hsl(.13, .9, .75), 10, .03, .12);
        save.cat++; writeSave();
        if (save.cat === 1) toast('The star cat purrs. Little stars drift off its back.');
        else if (rand() < .25) setTimeout(()=> { toast('The cat stretches, wanders off, and curls up somewhere else.'); this.moveTo(this.spot + 1 + randInt(2)); }, 3200);
    }
    update() { this.purr = max(0, this.purr - timeDelta); }
    render3D()
    {
        if (player.zone !== 'house') return;
        const m = mtx(undefined, this.pos3D, vec3(0, this.yaw, 0));
        const fur = hsl(.7, .4, .2), breathe = 1 + Math.sin(time * 2) * .03 + this.purr * .01 * Math.sin(time * 40);
        render3D.drawMesh(SPH, mtx(m, vec3(0, .2, 0), vec3(), vec3(.7 * breathe, .4 * breathe, .55)), undefined, fur);
        render3D.drawMesh(SPH, mtx(m, vec3(-.32, .26, -.15), vec3(0, .4, 0), vec3(.32, .28, .3)), undefined, fur);
        for (const s of [-1, 1]) render3D.drawMesh(CONE, mtx(m, vec3(-.36 + s * .02, .44, -.15 + s * .1), vec3(0, 0, .2 * s + (this.purr ? Math.sin(time * 10) * .1 : 0)), vec3(.1, .14, .08)), undefined, fur);
        const tail = Math.sin(time * (this.purr ? 4 : 1)) * .3;
        render3D.drawMesh(TORUS, mtx(m, vec3(.1, .08, .15), vec3(0, tail, 0), vec3(.75, .5, .55)), undefined, fur);
        const e = render3D.emissive; render3D.emissive = 1.2;
        for (let i = 0; i < 7; i++) render3D.drawMesh(SPH_LO, mtx(m, vec3(Math.sin(i * 2.3) * .25, .38 + (i % 3) * .02, Math.cos(i * 1.7) * .2), vec3(), vec3(.035)), undefined, hsl(.13, .9, .85));
        if (this.purr > 0) for (const s of [-1, 1]) render3D.drawMesh(SPH_LO, mtx(m, vec3(-.46, .3, -.15 + s * .08), vec3(), vec3(.04, .015, .04)), undefined, hsl(.55, .8, .8));
        render3D.emissive = e;
    }
}
function updateHouse()
{
    if (player.zone !== 'house') return;
    if (recordObj) recordObj.rotation3D = vec3(0, music.on ? time * 3 : recordObj.rotation3D.y, 0);
    if (player.hold === 'cup' && houseState.cupFull && !activity && !uiOpen() && !focusItem && input.act()) drinkTea();
}
