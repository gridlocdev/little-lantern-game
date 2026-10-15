// Where things are on the island. Data and pure shape functions only.
import { PI } from '../platform/engine.js';

export const EDGE_Y = -1.5;
export const edgeR = (th)=> 104 + 7 * Math.sin(3 * th + 1) + 4 * Math.sin(7 * th + 2) + 2.5 * Math.sin(13 * th + .5);
export const edgeAt = (x, z)=> edgeR(Math.atan2(z, x));
const edgePoint = (th, off = 0)=> { const r = edgeR(th) + off; return [Math.cos(th) * r, Math.sin(th) * r]; };
export const insideIsland = (x, z, margin = 0)=> Math.hypot(x, z) < edgeAt(x, z) - margin;

const OVERLOOK_TH = -1.42, PIER_TH = 1.68, MOONLET_TH = PI + .14;
export const P = {
    house: { x: -9, z: -5 },
    pond: { x: 12, z: -9, r: 8.5 },
    spawn: { x: 5, z: 18 },
    bench: { x: 2.5, z: 1.5 },
    swing: { x: 46, z: -40 },
    chimes: { x: -55, z: -31 },
    telescope: { x: -20, z: -75 },
    mushrooms: { x: 74, z: 12 },
    pasture: { x: -44, z: 52 },
    snail: { x: 9.5, z: 31 },
};
{
    const o = edgePoint(OVERLOOK_TH, -7); P.overlook = { x: o[0], z: o[1] };
    const a = edgePoint(PIER_TH, -8); P.pierBase = { x: a[0], z: a[1] };
    const b = edgePoint(PIER_TH, 15); P.pierTip = { x: b[0], z: b[1] };
    const c = edgePoint(MOONLET_TH, -4); P.bridgeStart = { x: c[0], z: c[1] };
    const d = edgePoint(MOONLET_TH, 44); P.moonlet = { x: d[0], z: d[1], r: 15 };
}

export const HILLS = [
    { x: -55, z: -31, h: 17, s: 12 },  // Amethyst Hill
    { x: -20, z: -75, h: 11, s: 11 },  // observatory hill
    { x: 46, z: -40, h: 7.5, s: 13 },  // swing hill
    { x: 74, z: 12, h: 3, s: 18 },
    { x: 30, z: -82, h: 5, s: 11 },
    { x: 62, z: 56, h: 7, s: 12 },
    { x: -82, z: -2, h: 6, s: 11 },
    { x: -12, z: 76, h: 4, s: 13 },
    { x: 28, z: 62, h: 3.5, s: 10 },
    { x: -70, z: 72, h: 4, s: 10 },
    { x: 80, z: -50, h: 5, s: 10 },
];

// ---------------------------------------------------------------- roads
export const ROAD_DEFS = [
    [[5, 18], [1, 10], [-4, 5], [-7.6, 0.6]],
    [[5, 18], [7, 32], [11, 48], [13, 64], [12, 80], [P.pierBase.x, P.pierBase.z]],
    [[5, 18], [17, 12], [27, -4], [36, -22], [43, -35]],
    [[-4, 5], [-17, 7], [-30, -6], [-42, -20], [-50, -27]],
    [[43, -35], [38, -56], [26, -73], [P.overlook.x, P.overlook.z]],
    [[-30, -6], [-31, -30], [-25, -52], [-21, -70]],
    [[17, 12], [34, 15], [52, 16], [68, 13]],
    [[5, 18], [-8, 29], [-24, 41], [-40, 50]],
    [[-40, 50], [-62, 36], [-82, 20], [P.bridgeStart.x, P.bridgeStart.z]],
];
