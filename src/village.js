'use strict';

// ================================================================ VILLAGE: POND, HOUSE, BENCH, SIGNPOST, SNAIL
function waterShader(cx, cz, radius, tint = 0)
{
    return new Shader(GLSL_NOISE + `
float wStars(vec2 q, float density, float s){
  vec2 id = floor(q); vec2 f = fract(q) - .5;
  float h = vh2(id + s);
  vec2 off = (vec2(vh2(id + s + 3.1), vh2(id + s + 7.7)) - .5) * .6;
  float tw = .55 + .45*sin(iTime*(1. + h*2.) + h*40.);
  return smoothstep(.1, 0., length(f - off)) * step(density, h) * tw;
}
void mainImage(out vec4 c, vec2 uv){
  vec2 p = (worldPos.xz - vec2(${cx.toFixed(3)}, ${cz.toFixed(3)})) / ${radius.toFixed(3)};
  float r = length(p);
  vec3 V = normalize(cameraPos - worldPos);
  float ring = 0.;
  for (int i = 0; i < 2; i++){
    float t = iTime*.13 + float(i)*.5;
    float cyc = floor(t), ph = fract(t);
    vec2 cc = vec2(vh2(vec2(cyc, float(i))), vh2(vec2(float(i), cyc + 3.)))*.8 - .4;
    float d = length(p - cc);
    ring += exp(-pow((d - ph*1.3)*16., 2.)) * (1. - ph) * smoothstep(0., .1, ph);
  }
  vec2 par = V.xz / max(V.y, .12);
  vec3 sapph = vec3(.05, .2, .8), vio = vec3(.42, .12, .8), deep = vec3(.03, .02, .12);
  ${tint ? 'sapph = vec3(.55,.5,.95); vio = vec3(.95,.8,.45);' : ''}
  vec3 col = mix(vio, sapph, smoothstep(.05, .95, r + .06*sin(iTime*.4 + atan(p.y, p.x)*2.)));
  col *= .45 + .12*sin(iTime*.5 + r*6.);
  vec2 q1 = p - par*.25, q2 = p - par*.7;
  col = mix(col, deep + vec3(.25, .08, .35)*fb3(vec3(q2*1.6, iTime*.03)), .35);
  col += vec3(.9, .92, 1.) * wStars(q1*14., .8, 1.) * 1.7;
  col += vec3(.75, .7, 1.) * wStars(q2*26., .72, 9.) * .9;
  vec3 n = normalize(vec3(ring*.25*p.x, 1., ring*.25*p.y));
  float m = max(dot(reflect(-V, n), normalize(sunDirection)), 0.);
  col += vec3(.85, .82, 1.) * (pow(m, 900.)*1.1 + pow(m, 80.)*.12);
  col += vec3(.55, .68, 1.) * ring * .5;
  col += mix(sapph, vec3(.5, .6, 1.), .5) * smoothstep(.75, 1., r) * .35;
  c = vec4(col, 1.);
}`);
}
function discMesh(radius, segs = 64)
{
    const pts = [vec3()], idx = [];
    for (let i = 0; i <= segs; i++) { const a = i / segs * TAU; pts.push(vec3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
    for (let i = 1; i <= segs; i++) idx.push(0, i + 1, i);
    return triMesh(pts, idx, vec3(0, 1, 0), WHITE);
}
function buildPond()
{
    const w = obj3(vec3(P.pond.x, WATER_Y, P.pond.z), discMesh(P.pond.r + .6), WHITE, { emissive: 1, castShadow: false });
    w.shader = waterShader(P.pond.x, P.pond.z, P.pond.r);
    const L = new Light3D(vec3(P.pond.x, WATER_Y + .7, P.pond.z), 16, hsl(.66, .8, .62), 1.5);
    // stones around the shore and glowing lily pads
    const stones = new InstancedMesh3D(buildSphere(1, 6, 4, false), 70, undefined, hsl(.74, .1, .4));
    for (let i = 0; i < 70; i++)
    {
        const a = i / 70 * TAU + rr(-.04, .04), r = P.pond.r - .9 + rr(-.2, .5);
        const x = P.pond.x + Math.cos(a) * r, z = P.pond.z + Math.sin(a) * r, s = rr(.25, .5);
        stones.setMatrixAt(i, buildMatrix(vec3(x, max(heightAt(x, z), WATER_Y - .05), z), vec3(rr(0, 3), rr(0, 3), 0), vec3(s * 1.3, s * .55, s)));
        stones.setColorAt(i, hsl(rr(.72, .78), .12, rr(.3, .46)));
    }
    const pads = new InstancedMesh3D(buildCylinder(1, .04, 14), 14, undefined, hsl(.48, .45, .3));
    const buds = new InstancedMesh3D(buildSphere(.22, 8, 6), 14, undefined, WHITE);
    buds.emissive = 1.2;
    for (let i = 0; i < 14; i++)
    {
        const a = rr(0, TAU), r = rr(1.5, P.pond.r - 2.4);
        const x = P.pond.x + Math.cos(a) * r, z = P.pond.z + Math.sin(a) * r, s = rr(.5, .9);
        pads.setMatrixAt(i, buildMatrix(vec3(x, WATER_Y + .02, z), vec3(0, rr(0, 3), 0), vec3(s, 1, s)));
        buds.setMatrixAt(i, buildMatrix(vec3(x + .1, WATER_Y + .12, z)));
        buds.setColorAt(i, hsl([.9, .55, .12][i % 3], .8, .75));
    }
    addClearing(2, -1, 21);
    PLACE_NAMES.push({ name: 'Starlight Pond', sub: 'cosmic fish swim here', x: P.pond.x, z: P.pond.z, r: P.pond.r + 3, zone: 'island' });
    addClearing(P.pond.x, P.pond.z, P.pond.r + 1);
}

// ---------------------------------------------------------------- the crooked house
const HOUSE = { W: 8, D: 7, H: 4 };
let houseWindowLight;
function prismRoof(w, d, h, over)
{
    const hw = w / 2 + over, hd = d / 2 + over;
    const pts = [], idx = [], uvs = [], nrm = [];
    const slopeL = vec3(-h, hw, 0).normalize(), slopeR = vec3(h, hw, 0).normalize();
    const quad = (a, b, c2, d2, n, u)=>
    {
        const k = pts.length;
        pts.push(a, b, c2, d2); nrm.push(n, n, n, n); uvs.push(...u);
        idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    };
    const s = Math.hypot(hw, h) / 2;
    quad(vec3(-hw, 0, hd), vec3(0, h, hd), vec3(0, h, -hd), vec3(-hw, 0, -hd), slopeL, [vec2(0, 0), vec2(s, 0), vec2(s, hd), vec2(0, hd)]);
    quad(vec3(0, h, hd), vec3(hw, 0, hd), vec3(hw, 0, -hd), vec3(0, h, -hd), slopeR, [vec2(s, 0), vec2(0, 0), vec2(0, hd), vec2(s, hd)]);
    const m = triMesh(pts, idx, nrm, WHITE, uvs);
    m.doubleSided = true;
    return m;
}
function buildHouseExterior()
{
    const { W, D, H } = HOUSE;
    const hx = P.house.x, hz = P.house.z, y0 = heightAt(hx, hz) - .1;
    const base = mtx(undefined, vec3(hx, y0, hz), vec3(0, 0, .018));
    const place = (mesh, tex, color = WHITE, opts)=>
    {
        const o = new EngineObject3D(vec3(), mesh, tex, color);
        o.localMatrix = base;
        Object.assign(o, opts);
        return o;
    };
    const walls = buildBox(vec3(W, H, D)); walls.scaleUVs(vec2(2.4, 1.4));
    walls.transform(buildMatrix(vec3(0, H / 2 + .3, 0)));
    place(walls, texPlank, hsl(.68, .12, .78));
    const found = buildBox(vec3(W + .5, .7, D + .5)); found.scaleUVs(vec2(3, .5));
    found.transform(buildMatrix(vec3(0, .2, 0)));
    place(found, texStone);
    const gable = new Mesh();
    for (const z of [D / 2, -D / 2])
    {
        const g = triMesh([vec3(-W / 2, 0, 0), vec3(W / 2, 0, 0), vec3(0, 3.4, 0)], z > 0 ? [0, 1, 2] : [0, 2, 1], vec3(0, 0, Math.sign(z)), WHITE,
            [vec2(0, 1), vec2(2.4, 1), vec2(1.2, 0)]);
        gable.combine(g, vec3(0, H + .3, z));
    }
    place(gable, texPlank, hsl(.68, .12, .72));
    const roof = prismRoof(W, D, 3.4, .55); roof.scaleUVs(vec2(1.3, 1.3));
    roof.transform(buildMatrix(vec3(0, H + .3, 0)));
    place(roof, texRoof);
    const wood = hsl(.75, .25, .2);
    const trim = new Mesh();
    for (const [x, z] of [[-W / 2, D / 2], [W / 2, D / 2], [-W / 2, -D / 2], [W / 2, -D / 2]]) trim.combine(buildBox(vec3(.3, H, .3)), vec3(x, H / 2 + .3, z), wood);
    trim.combine(buildBox(vec3(W + .3, .25, .3)), vec3(0, H + .3, D / 2), wood);
    // door, knob, step, window frames
    trim.combine(buildBox(vec3(1.5, 2.6, .18)), vec3(-1.7, 1.6, D / 2 + .05), hsl(.78, .35, .22));
    trim.combine(buildBox(vec3(1.8, .2, .28)), vec3(-1.7, 3, D / 2 + .08), wood);
    trim.combine(buildSphere(.14, 8, 6), vec3(-1.2, 1.6, D / 2 + .2), hsl(.12, .6, .55));
    trim.combine(buildBox(vec3(2.2, .35, 1.3)), vec3(-1.7, .2, D / 2 + .7), hsl(.74, .1, .4));
    const ring = buildTorus(1.5, .16, 24, 6); ring.transform(buildMatrix(undefined, vec3(PI / 2, 0, 0)));
    trim.combine(ring, vec3(1.8, 2.4, D / 2 + .08), wood);
    trim.combine(buildBox(vec3(.1, 1.4, .1)), vec3(1.8, 2.4, D / 2 + .1), wood);
    trim.combine(buildBox(vec3(1.4, .1, .1)), vec3(1.8, 2.4, D / 2 + .1), wood);
    // side window
    trim.combine(buildBox(vec3(.18, 1.5, 1.3)), vec3(W / 2 + .02, 2.4, -.6), wood);
    // chimney
    trim.combine(buildBox(vec3(1, 3, 1)), vec3(2.2, H + 2.4, -1.2), hsl(.74, .1, .38));
    trim.combine(buildBox(vec3(1.25, .25, 1.25)), vec3(2.2, H + 3.95, -1.2), hsl(.74, .1, .32));
    place(trim, undefined, WHITE);
    const glass = new Mesh()
        .combine(buildCylinder(1.35, .06, 24), buildMatrix(vec3(1.8, 2.4, D / 2 + .03), vec3(PI / 2, 0, 0)))
        .combine(buildBox(vec3(.08, 1.2, 1.1)), vec3(W / 2 + .06, 2.4, -.6));
    place(glass, undefined, hsl(.1, .9, .62), { emissive: 1.4, castShadow: false });
    const wpos = base.transformPoint(vec3(1.8, 2.4, D / 2 + 1.2));
    houseWindowLight = new Light3D(wpos, 9, hsl(.09, .9, .6), 1.6);
    houseWindowLight.glow = 1.2;
    // smoke that rises and turns into stars
    const top = base.transformPoint(vec3(2.2, H + 4.1, -1.2));
    new ParticleEmitter3D(top, .4, 0, 3.2, .25, undefined,
        hsl(.72, .15, .55, .22), hsl(.72, .1, .6, .18), hsl(.13, .5, 1, .95), hsl(.6, .4, 1, .9),
        11, .7, .07, .018, .997, .00035, .3, .4, true);
    addSolid({ kind: 'box', x: hx, z: hz, hx: W / 2 + .2, hz: D / 2 + .2, yaw: 0, top: 99 });
    addClearing(hx, hz, 7, true);
    const door = base.transformPoint(vec3(-1.7, 0, D / 2 + 1.2));
    addInteract({ pos: vec3(door.x, heightAt(door.x, door.z), door.z), r: 2.2, label: 'Go inside', act: ()=> enterHouse(), priority: 1 });
    PLACE_NAMES.push({ name: 'The Crooked House', sub: 'home, more or less', x: hx, z: hz + 2, r: 7.5, zone: 'island' });
    HOUSE.door = door;
}

// ---------------------------------------------------------------- bench and its lantern
function benchMesh()
{
    const wood = hsl(.75, .2, .42), dark = hsl(.75, .2, .22);
    const m = new Mesh();
    for (let i = 0; i < 3; i++) m.combine(buildBox(vec3(1.9, .07, .16)), vec3(0, .48, -.18 + i * .18), wood);
    for (let i = 0; i < 2; i++) m.combine(buildBox(vec3(1.9, .14, .05)), buildMatrix(vec3(0, .78 + i * .24, -.33), vec3(-.15, 0, 0)), wood);
    for (const [x, z] of [[-.82, .15], [.82, .15], [-.82, -.24], [.82, -.24]]) m.combine(buildBox(vec3(.09, .48, .09)), vec3(x, .24, z), dark);
    for (const x of [-.82, .82]) m.combine(buildBox(vec3(.07, .62, .07)), buildMatrix(vec3(x, .8, -.32), vec3(-.15, 0, 0)), dark);
    return m;
}
function placeBench(x, z, yaw, zone = 'island', y)
{
    y ??= heightAt(x, z);
    obj3(vec3(x, y, z), benchMesh(), WHITE, { rotation3D: vec3(0, yaw + PI, 0) });
    addSolid({ kind: 'box', x, z, hx: 1, hz: .38, yaw, top: y + .55, zone, wood: true });
    const seat = vec3(x, y, z);
    addInteract({ pos: seat, r: 1.8, zone, label: 'Sit', act: ()=> startSit(seat, yaw) });
}
function buildBenchArea()
{
    const yaw = Math.atan2(-(P.pond.x - P.bench.x), -(P.pond.z - P.bench.z));
    placeBench(P.bench.x, P.bench.z, yaw);
    // curved lantern post with a blue flame
    const lx = P.bench.x - 1.6, lz = P.bench.z + .4, ly = heightAt(lx, lz);
    const curve = [vec3(0, 0, 0), vec3(0, 1.6, 0), vec3(.05, 2.6, 0), vec3(.35, 2.95, 0), vec3(.75, 2.8, 0)];
    const post = new Mesh();
    for (let i = 0; i < curve.length - 1; i++)
    {
        const a = curve[i], b = curve[i + 1], d = b.subtract(a), L = d.length();
        const m = buildMatrix(a.lerp(b, .5), vec3(0, 0, -Math.atan2(d.x, d.y)), vec3(1, L, 1));
        post.combine(buildCylinder(.1, 1, 6), m, hsl(.72, .2, .16));
    }
    post.combine(buildCone(.4, .2, 6), vec3(.75, 2.7, 0), hsl(.72, .2, .16));
    obj3(vec3(lx, ly, lz), post);
    obj3(vec3(lx + .75, ly + 2.4, lz), buildSphere(.28, 10, 8), hsl(.58, .9, .7), { emissive: 1.6, castShadow: false });
    const L = new Light3D(vec3(lx + .75, ly + 2.4, lz), 9, hsl(.58, .8, .66), 1.5);
    L.glow = 1.4;
    addSolid({ kind: 'circle', x: lx, z: lz, r: .2, top: 3 });
}

// ---------------------------------------------------------------- signpost at the crossing
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
function buildSignpost()
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

// ---------------------------------------------------------------- Oswin the lantern snail
const SNAIL_LINES = [
    ['Oh, hello, little lantern. I am Oswin. I carry my house on my back, so I never have to walk home.',
        'The pond by the crooked house is full of fish that fell out of the sky. Stand at the edge and you can fish for them.'],
    ['The crystals on Amethyst Hill each hum one note.', 'Someone carved a song on the stone up there. Play it in order and the moon may answer.'],
    ['The swing on the willow hill goes higher if you lean in at the very top of each swing.', 'Let go at the top and your wings will do the rest.'],
    ['Stars fall here sometimes. Look for a pillar of light and run to it before it fades.', 'Bring the stardust home. The jar on your shelf likes it.'],
    ['The pier on the south edge goes nowhere at all, which is why the strangest fish live at the end of it.'],
    ['The telescope on Observatory Hill sees shapes in the stars. Hold it still on one and the shape will show itself.',
        'There is also something very large out there that sings. Do not be frightened. It only wants company.'],
    ['If you are tired, your bed will take you to a different sky. I have been asleep for most of this conversation.'],
];
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
