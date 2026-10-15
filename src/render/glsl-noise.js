// GLSL noise functions shared by several shaders.

// GLSL noise functions shared by several shaders.

// GLSL noise functions shared by several shaders.

// GLSL noise functions shared by several shaders.

// GLSL noise functions shared by several shaders.

export const GLSL_NOISE = `
float vh1(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
  return mix(mix(mix(vh1(i), vh1(i+vec3(1,0,0)), f.x), mix(vh1(i+vec3(0,1,0)), vh1(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(vh1(i+vec3(0,0,1)), vh1(i+vec3(1,0,1)), f.x), mix(vh1(i+vec3(0,1,1)), vh1(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fb3(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a*vn3(p); p = p*2.03 + 1.7; a *= .5; } return s; }
float vh2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;
