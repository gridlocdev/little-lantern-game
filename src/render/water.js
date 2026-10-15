// The starry water shader and the disc it is drawn on.
import { Shader, WHITE, vec3 } from '../platform/engine.js';
import { TAU } from '../lib/math.js';
import { triMesh } from '../platform/mesh.js';
import { GLSL_NOISE } from './glsl-noise.js';

export function waterShader(cx, cz, radius, tint = 0)
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
export function discMesh(radius, segs = 64)
{
    const pts = [vec3()], idx = [];
    for (let i = 0; i <= segs; i++) { const a = i / segs * TAU; pts.push(vec3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
    for (let i = 1; i <= segs; i++) idx.push(0, i + 1, i);
    return triMesh(pts, idx, vec3(0, 1, 0), WHITE);
}
