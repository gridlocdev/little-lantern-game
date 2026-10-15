// The sky dome, moon, planet and halo.
import { EngineObject3D, Shader, buildSphere, buildTorus, hsl, render3D, rgb, time, vec3 } from '../platform/engine.js';
import { core } from '../game/progress.js';
import { mixColor } from '../platform/color.js';
import { GLSL_NOISE } from '../render/glsl-noise.js';
import { MOON_DIR, PLANET_DIR } from './directions.js';
import { PALETTES } from './palettes.js';
import { skyShader } from './sky-shader.js';
import { addJournalSection } from '../ui/journal.js';

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
        const p = PALETTES[core.palette];
        render3D.drawSoftDisc(cam.add(MOON_DIR.scale(700)), 300, p.glow.scale(.35, .35));
        render3D.drawSoftDisc(cam.add(MOON_DIR.scale(700)), 175, rgb(1, 1, 1, .18));
    }
}
function buildSky()
{
    for (const p of PALETTES) skyShaders.push(skyShader(p));
    const dome = buildSphere(1, 40, 20, true).flipNormals();
    skyDome = new EngineObject3D(vec3(), dome);
    skyDome.shader = skyShaders[core.palette];
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
export function setPalette(i)
{
    core.palette = i % PALETTES.length;
    skyDome.shader = skyShaders[core.palette];
    const p = PALETTES[core.palette];
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

export const skySystem = {
    build()
    {
        buildSky();
        setPalette(core.palette);
        addJournalSection('sky', 10, ()=> [['transparent', `Sky: ${PALETTES[core.palette].name}`, 'Sleeping in the house changes which sky you wake under.', '', false, undefined]]);
    },
    updatePost: updateSky,
};
