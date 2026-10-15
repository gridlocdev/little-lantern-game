// Pure math helpers. No engine, no DOM, no game state, so they run under node --test.

export const TAU = Math.PI * 2;
export const mix = (a, b, t)=> a + (b - a) * t;
export const sstep = (a, b, x)=> { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const wrapAngle = (a)=> Math.atan2(Math.sin(a), Math.cos(a));
export const dist2 = (ax, az, bx, bz)=> Math.hypot(ax - bx, az - bz);
