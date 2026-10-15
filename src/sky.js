'use strict';

// ================================================================ SKY, MOON, PLANET, WHALE
const MOON_DIR = vec3(-.5, .3, -.81).normalize();
const PLANET_DIR = vec3(.72, .34, .6).normalize();
const g3 = (v)=> `vec3(${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)})`;
const gc = (c)=> `vec3(${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)})`;

const GLSL_NOISE = `
float vh1(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
  return mix(mix(mix(vh1(i), vh1(i+vec3(1,0,0)), f.x), mix(vh1(i+vec3(0,1,0)), vh1(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(vh1(i+vec3(0,0,1)), vh1(i+vec3(1,0,1)), f.x), mix(vh1(i+vec3(0,1,1)), vh1(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fb3(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a*vn3(p); p = p*2.03 + 1.7; a *= .5; } return s; }
float vh2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

// three dream palettes for the sky, the bed cycles through them
const PALETTES = [
    { name: 'Violet Night', top: hsl(.72, .6, .07), bottom: hsl(.76, .5, .015), a: hsl(.92, .55, .36), b: hsl(.5, .6, .3), c: hsl(.75, .6, .25), glow: hsl(.74, .5, .65) },
    { name: 'Aurora Drift', top: hsl(.6, .65, .07), bottom: hsl(.66, .5, .015), a: hsl(.38, .7, .32), b: hsl(.8, .6, .34), c: hsl(.5, .7, .22), glow: hsl(.5, .5, .65) },
    { name: 'Rose Eclipse', top: hsl(.83, .55, .08), bottom: hsl(.88, .4, .02), a: hsl(.98, .6, .38), b: hsl(.08, .7, .3), c: hsl(.9, .6, .26), glow: hsl(.95, .5, .68) },
];
function skyShader(p)
{
    return new Shader(GLSL_NOISE + `
vec3 skyStars(vec3 d, float scale, float density, float sz){
  vec3 q = d*scale; vec3 id = floor(q); vec3 f = fract(q) - .5;
  float h = vh1(id + 13.7);
  if (h > density) return vec3(0);
  vec3 off = vec3(vh1(id+3.1), vh1(id+7.7), vh1(id+1.3)) - .5;
  float dd = length(f - off*.6);
  float tw = .55 + .45*sin(iTime*(.7 + h*9.) + h*80.);
  float b = smoothstep(sz, 0., dd) * tw;
  vec3 col = mix(vec3(.75,.82,1.), vec3(1.,.86,.74), vh1(id+5.));
  return col*b;
}
void mainImage(out vec4 c, vec2 uv){
  vec3 d = normalize(worldPos - cameraPos);
  vec3 col = mix(${gc(p.bottom)}, ${gc(p.top)}, smoothstep(-.7, .8, d.y));
  vec3 ax = normalize(vec3(.35, .75, -.55));
  float k = dot(d, ax);
  float band = exp(-k*k*6.);
  float w = smoothstep(.36, .8, fb3(d*3. + vec3(iTime*.003, 0., 0.)));
  float hue = smoothstep(.3, .7, fb3(d*1.5 + 5.));
  col += mix(${gc(p.a)}, ${gc(p.b)}, hue) * band * w * (.55 + .45*fb3(d*8.));
  col += ${gc(p.c)} * pow(fb3(d*2.2 + 11.), 3.) * .45;
  col += skyStars(d, 170., .1, .2) * .7;
  col += skyStars(d, 90., .16, .14) * 1.;
  col += skyStars(d, 38., .06, .09) * 1.8;
  float m = max(dot(d, ${g3(MOON_DIR)}), 0.);
  col += ${gc(p.glow)} * (pow(m, 30.)*.3 + pow(m, 5.)*.1);
  c = vec4(col, 1);
}`);
}
const skyShaders = [];
let skyDome, moonObj, planetObj, ringObj, haloObj;

class SkyHalo extends EngineObject3D
{
    constructor()
    {
        super(vec3());
        this.additive = true;
        this.castShadow = false;
    }
    render3D()
    {
        const cam = render3D.camera.pos;
        const p = PALETTES[save.palette];
        render3D.drawSoftDisc(cam.add(MOON_DIR.scale(700)), 300, p.glow.scale(.35, .35));
        render3D.drawSoftDisc(cam.add(MOON_DIR.scale(700)), 175, rgb(1, 1, 1, .18));
    }
}
function buildSky()
{
    for (const p of PALETTES) skyShaders.push(skyShader(p));
    const dome = buildSphere(1, 40, 20, true).flipNormals();
    skyDome = new EngineObject3D(vec3(), dome);
    skyDome.shader = skyShaders[save.palette];
    skyDome.emissive = 1; skyDome.castShadow = false; skyDome.receiveShadow = false;
    skyDome.renderOrder = -1e6;
    skyDome.scale3D = vec3(2800); // diameter: a 1400 radius, so the moon (760), planet (820) and halo sit inside the sky

    moonObj = new EngineObject3D(vec3(), buildSphere(1, 48, 32, true));
    moonObj.shader = new Shader(GLSL_NOISE + `
void mainImage(out vec4 c, vec2 uv){
  vec3 n = normalize(worldNormal);
  vec3 v = normalize(cameraPos - worldPos);
  float facing = clamp(dot(n, v), 0., 1.);
  float maria = smoothstep(.46, .7, fb3(n*2.3 + 3.));
  float cr = fb3(n*10.);
  float pits = smoothstep(.62, .7, fb3(n*18. + 4.));
  vec3 col = vec3(.9, .89, .98) * (.92 - maria*.26 + cr*.14 - pits*.12);
  col *= .6 + .4*pow(facing, .5);
  col = mix(col, vec3(.74, .62, 1.)*1.2, pow(1. - facing, 2.2));
  c = vec4(col*1.25, 1);
}`);
    moonObj.emissive = 1; moonObj.castShadow = false; moonObj.receiveShadow = false;
    moonObj.scale3D = vec3(120);
    moonObj.renderOrder = -1e5;

    planetObj = new EngineObject3D(vec3(), buildSphere(1, 32, 20, true));
    planetObj.shader = new Shader(GLSL_NOISE + `
void mainImage(out vec4 c, vec2 uv){
  vec3 n = normalize(worldNormal);
  float band = sin(n.y*22. + fb3(n*4.)*4.)*.5 + .5;
  vec3 col = mix(vec3(.95,.7,.55), vec3(.55,.45,.85), band);
  float lit = clamp(dot(n, normalize(vec3(-.6,.4,-.7)))*.8 + .35, .08, 1.);
  c = vec4(col*lit, 1);
}`);
    planetObj.emissive = 1; planetObj.castShadow = false; planetObj.receiveShadow = false;
    planetObj.scale3D = vec3(46);
    planetObj.renderOrder = -1e5;
    const ring = buildTorus(1, .08, 48, 4);
    ringObj = new EngineObject3D(vec3(), ring, undefined, hsl(.08, .5, .75, .5));
    ringObj.emissive = 1; ringObj.additive = true; ringObj.castShadow = false;
    ringObj.scale3D = vec3(110, 2, 110);
    ringObj.rotation3D = vec3(.45, .3, .25);
    haloObj = new SkyHalo;
}
function setPalette(i)
{
    save.palette = i % PALETTES.length;
    skyDome.shader = skyShaders[save.palette];
    const p = PALETTES[save.palette];
    render3D.ambientColor = mixColor(p.top, hsl(.71, .42, .36), .85);
    render3D.ambientGroundColor = mixColor(p.bottom, hsl(.78, .45, .14), .75);
    render3D.sunColor = mixColor(p.glow, hsl(.69, .3, .72), .65);
}
function updateSky()
{
    const cam = render3D.camera.pos;
    skyDome.pos3D = cam.copy();
    moonObj.pos3D = cam.add(MOON_DIR.scale(760));
    moonObj.rotation3D = vec3(0, time * .004, 0);
    planetObj.pos3D = cam.add(PLANET_DIR.scale(820));
    planetObj.rotation3D = vec3(0, time * .02, 0);
    ringObj.pos3D = planetObj.pos3D.copy();
}

// ---------------------------------------------------------------- the star whale
class StarWhale extends EngineObject3D
{
    constructor()
    {
        super(vec3());
        this.additive = true;
        this.castShadow = false;
        this.body = buildSphere(1, 20, 12, true);
        this.fin = buildSphere(1, 10, 6, true);
        this.angle = 2.2;
        this.dots = [];
        for (let i = 0; i < 26; i++) this.dots.push(vec3(rr(-.9, .9), rr(-.25, .35), rr(-.95, .95)).multiply(vec3(.35, .5, 1)));
        this.songTimer = new Timer(12);
    }
    update()
    {
        this.angle += timeDelta * .012;
        const r = 245, a = this.angle;
        this.pos3D = vec3(Math.cos(a) * r, 18 + Math.sin(a * 3) * 22, Math.sin(a) * r);
        this.yaw = -a; // swims tangent to the circle
        if (this.songTimer.elapsed())
        {
            this.songTimer.set(rand(28, 50));
            playSfx('whale', this.pos3D, .9);
        }
    }
    render3D()
    {
        const base = mtx(undefined, this.pos3D, vec3(Math.sin(time * .4) * .05, this.yaw, Math.sin(time * .3) * .06));
        const body = hsl(.58, .7, .55, .16), belly = hsl(.62, .6, .7, .1);
        render3D.drawMesh(this.body, mtx(base, vec3(), vec3(), vec3(14, 11, 44)), undefined, body);
        render3D.drawMesh(this.body, mtx(base, vec3(0, -3, -2), vec3(), vec3(10, 6, 34)), undefined, belly);
        const flap = Math.sin(time * .9) * .35;
        const tail = mtx(base, vec3(0, 0, 22), vec3(flap, 0, 0));
        render3D.drawMesh(this.fin, mtx(tail, vec3(0, 0, 6), vec3(), vec3(16, 1.2, 6)), undefined, body);
        for (const s of [-1, 1])
            render3D.drawMesh(this.fin, mtx(base, vec3(s * 9, -3, -6), vec3(0, s * .4, s * (.5 + flap * .4)), vec3(10, .8, 4)), undefined, body);
        for (const d of this.dots)
        {
            const p = base.transformPoint(vec3(d.x * 14, d.y * 11 + 2, d.z * 44));
            render3D.drawSoftDisc(p, 3.2 + Math.sin(time * 2 + d.x * 9) * .6, hsl(.55, .5, .9, .55));
        }
    }
}

// ---------------------------------------------------------------- shooting stars
const skyEvents = [];
class ShootingStar extends EngineObject3D
{
    // falling ones land on the island and leave a fallen star to collect
    constructor(target)
    {
        super(vec3());
        this.additive = true; this.castShadow = false;
        this.target = target;
        this.life = 0;
        if (target)
        {
            const dir = vec3(rand(-1, 1), 0, rand(-1, 1)).normalize();
            this.start = target.add(dir.scale(160)).add(vec3(0, 190, 0));
            this.end = target;
            this.duration = 2.6;
        }
        else
        {
            const a = rand(TAU), el = rand(.25, .7);
            const d = vec3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
            const side = vec3(-d.z, rand(-.4, -.1), d.x).normalize();
            this.rel = true;
            this.start = d.scale(650);
            this.end = this.start.add(side.scale(rand(160, 260)));
            this.duration = rand(.9, 1.6);
        }
    }
    update()
    {
        this.life += timeDelta / this.duration;
        if (this.life >= 1)
        {
            if (this.target) landFallenStar(this.target);
            this.destroy();
        }
    }
    render3D()
    {
        const t = this.life, o = this.rel ? render3D.camera.pos : vec3();
        const head = this.start.lerp(this.end, t).add(o);
        const tail = this.start.lerp(this.end, max(0, t - .22)).add(o);
        const fade = Math.sin(min(1, t * 1.2) * PI) * .9 + .1;
        const w = this.rel ? 1.6 : .9;
        render3D.drawRibbon([tail, tail.lerp(head, .7), head], [0, w * .6, w], undefined,
            [hsl(.6, .6, .9, 0), hsl(.6, .6, .9, .5 * fade), hsl(.12, .5, 1, fade)]);
        render3D.drawSoftDisc(head, this.rel ? 9 : 3.5, hsl(.12, .4, 1, fade));
    }
}
