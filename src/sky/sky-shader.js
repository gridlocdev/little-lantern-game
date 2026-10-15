// The sky dome shader for one palette.
import { Shader } from '../platform/engine.js';
import { GLSL_NOISE } from '../render/glsl-noise.js';
import { MOON_DIR } from './dome.js';

const g3 = (v)=> `vec3(${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)})`;
const gc = (c)=> `vec3(${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)})`;
export function skyShader(p)
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
