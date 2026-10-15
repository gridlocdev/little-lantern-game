'use strict';

// ================================================================ WORLD LAYOUT
const EDGE_Y = -1.5;
const edgeR = (th)=> 104 + 7 * Math.sin(3 * th + 1) + 4 * Math.sin(7 * th + 2) + 2.5 * Math.sin(13 * th + .5);
const edgeAt = (x, z)=> edgeR(Math.atan2(z, x));
const edgePoint = (th, off = 0)=> { const r = edgeR(th) + off; return [Math.cos(th) * r, Math.sin(th) * r]; };
const insideIsland = (x, z, margin = 0)=> Math.hypot(x, z) < edgeAt(x, z) - margin;

const OVERLOOK_TH = -1.42, PIER_TH = 1.68, MOONLET_TH = PI + .14;
const P = {
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

const HILLS = [
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
function shapeH(x, z)
{
    let h = (fbm(x * .011 + 7, z * .011 - 3, 3) - .5) * 9;
    for (const k of HILLS)
    {
        const dx = x - k.x, dz = z - k.z;
        h += k.h * Math.exp(-(dx * dx + dz * dz) / (2 * k.s * k.s));
    }
    return h;
}
const VILLAGE_H = max(1.2, shapeH(0, 0));
const WATER_Y = VILLAGE_H - .3;
const FLATS = [
    { x: 2, z: -2, r: 24, fall: 14, h: VILLAGE_H },
    { x: P.chimes.x, z: P.chimes.z, r: 8.5, fall: 7 },
    { x: P.telescope.x, z: P.telescope.z, r: 5, fall: 6 },
    { x: P.swing.x, z: P.swing.z, r: 7, fall: 6 },
    { x: P.overlook.x, z: P.overlook.z, r: 7, fall: 5 },
    { x: P.pierBase.x, z: P.pierBase.z, r: 5, fall: 5 },
    { x: P.bridgeStart.x, z: P.bridgeStart.z, r: 5, fall: 4 },
];
for (const f of FLATS) if (f.h === undefined) f.h = shapeH(f.x, f.z);

// ---------------------------------------------------------------- roads
const ROAD_DEFS = [
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
const ROADS = ROAD_DEFS.map((d)=> sampleCurve(d, 1));
const HALF = 128, STEP = 1, GN = 2 * HALF / STEP + 1;
const roadField = new Float32Array(GN * GN).fill(99);
for (const pts of ROADS)
for (let i = 0; i < pts.length - 1; i++)
{
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const x0 = Math.floor((min(ax, bx) - 7 + HALF) / STEP), x1 = Math.ceil((max(ax, bx) + 7 + HALF) / STEP);
    const z0 = Math.floor((min(az, bz) - 7 + HALF) / STEP), z1 = Math.ceil((max(az, bz) + 7 + HALF) / STEP);
    for (let gz = max(0, z0); gz <= min(GN - 1, z1); gz++)
    for (let gx = max(0, x0); gx <= min(GN - 1, x1); gx++)
    {
        const px = -HALF + gx * STEP, pz = -HALF + gz * STEP;
        const t = clamp(((px - ax) * dx + (pz - az) * dz) / L2);
        const d = Math.hypot(ax + dx * t - px, az + dz * t - pz);
        const k = gz * GN + gx;
        if (d < roadField[k]) roadField[k] = d;
    }
}
function gridSample(arr, x, z)
{
    const gx = clamp((x + HALF) / STEP, 0, GN - 1.001), gz = clamp((z + HALF) / STEP, 0, GN - 1.001);
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const a = arr[j * GN + i], b = arr[j * GN + i + 1], c = arr[(j + 1) * GN + i], d = arr[(j + 1) * GN + i + 1];
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}
const roadDist = (x, z)=> gridSample(roadField, x, z);

// ---------------------------------------------------------------- terrain heights
function heightRaw(x, z)
{
    const r = Math.hypot(x, z), Rr = edgeAt(x, z);
    let h = shapeH(x, z);
    const detail = (fbm(x * .08 + 3, z * .08 + 8, 3) - .5) * 1.8;
    let flat = 0, flatH = 0;
    for (const f of FLATS)
    {
        const m = 1 - sstep(f.r, f.r + f.fall, dist2(x, z, f.x, f.z));
        if (m > flat) { flat = m; flatH = f.h; }
    }
    const rm = 1 - sstep(2.2, 5.5, roadDist(x, z));
    h += detail * (1 - max(rm, flat));
    h = mix(h, flatH, flat);
    const pd = dist2(x, z, P.pond.x, P.pond.z);
    const bowl = 1 - sstep(P.pond.r - 3, P.pond.r + .4, pd);
    h = mix(h, VILLAGE_H - 1.7 + sstep(0, P.pond.r, pd) * .6, bowl);
    const e = sstep(Rr - 16, Rr, r);
    return mix(h, EDGE_Y, Math.pow(e, 1.4));
}
const heights = new Float32Array(GN * GN);
for (let j = 0; j < GN; j++)
for (let i = 0; i < GN; i++)
{
    const x = -HALF + i * STEP, z = -HALF + j * STEP;
    heights[j * GN + i] = Math.hypot(x, z) > edgeAt(x, z) + 1.5 ? EDGE_Y : heightRaw(x, z);
}
const heightAt = (x, z)=> gridSample(heights, x, z);
// the drawn terrain sinks into a bed under the roads, deeper where it is steep, so a road never sinks into the
// hillside between its vertices; walking still uses heightAt, which is where the road surface is
const gridH = (i, j)=> heights[clamp(j, 0, GN - 1) * GN + clamp(i, 0, GN - 1)];
const gridNormal = (i, j)=> vec3(gridH(i - 1, j) - gridH(i + 1, j), 2 * STEP, gridH(i, j - 1) - gridH(i, j + 1)).normalize();
function drawnH(i, j)
{
    const bed = (.06 + .25 * (1 / max(.3, gridNormal(i, j).y) - 1)) * (1 - sstep(1.6, 2.8, roadDist(-HALF + i * STEP, -HALF + j * STEP)));
    return gridH(i, j) - bed;
}
// the height of the terrain mesh as drawn: grid cells split into two triangles along one diagonal
function terrainMeshY(x, z)
{
    const gx = clamp((x + HALF) / STEP, 0, GN - 1.001), gz = clamp((z + HALF) / STEP, 0, GN - 1.001);
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const a = drawnH(i, j), b = drawnH(i + 1, j), c = drawnH(i, j + 1), d = drawnH(i + 1, j + 1);
    return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
function normalAt(x, z)
{
    const e = .6;
    return vec3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
}

// ================================================================ SOLIDS (collision)
// a solid is a circle or a turned box on the ground: a wall below its top, a floor on top of it
const SOLID_CELL = 8;
const solidGrid = new Map();
const solidKey = (cx, cz)=> cx * 10007 + cz;
function addSolid(s)
{
    s.zone ||= 'island';
    s.bottom ??= -1e9;
    if (s.kind === 'box') { s.c = Math.cos(s.yaw || 0); s.s = Math.sin(s.yaw || 0); }
    const ext = s.kind === 'box' ? Math.hypot(s.hx, s.hz) : s.r;
    for (let cz = Math.floor((s.z - ext) / SOLID_CELL); cz <= Math.floor((s.z + ext) / SOLID_CELL); cz++)
    for (let cx = Math.floor((s.x - ext) / SOLID_CELL); cx <= Math.floor((s.x + ext) / SOLID_CELL); cx++)
    {
        const k = solidKey(cx, cz);
        if (!solidGrid.has(k)) solidGrid.set(k, []);
        solidGrid.get(k).push(s);
    }
    return s;
}
function removeSolid(s)
{
    for (const list of solidGrid.values())
    {
        const i = list.indexOf(s);
        if (i >= 0) list.splice(i, 1);
    }
}
const solidsAt = (x, z)=> solidGrid.get(solidKey(Math.floor(x / SOLID_CELL), Math.floor(z / SOLID_CELL))) || [];
// local box coordinates
function boxLocal(s, x, z)
{
    const dx = x - s.x, dz = z - s.z;
    return [dx * s.c - dz * s.s, dx * s.s + dz * s.c];
}
function solidContains(s, x, z, pad = 0)
{
    if (s.kind === 'circle') return dist2(x, z, s.x, s.z) < s.r + pad;
    const [lx, lz] = boxLocal(s, x, z);
    return Math.abs(lx) < s.hx + pad && Math.abs(lz) < s.hz + pad;
}
const solidTop = (s, x, z)=> s.topFn ? s.topFn(x, z) : s.top;

// keep spots clear for scenery placement
const clearings = [];
const addClearing = (x, z, r, noGrass = false)=> clearings.push({ x, z, r, noGrass });
const isClear = (x, z, pad = 0)=> !clearings.some((c)=> dist2(x, z, c.x, c.z) < c.r + pad);
const grassClear = (x, z)=> !clearings.some((c)=> c.noGrass && dist2(x, z, c.x, c.z) < c.r);

// ================================================================ TEXTURES
let texDetail, texCobble, texPlank, texRoof, texStone, texRug, texWallpaper, texBook;
function makeTextures()
{
    texDetail = canvasTexture(256, (g, s)=>
    {
        const img = g.createImageData(s, s);
        for (let y = 0; y < s; y++)
        for (let x = 0; x < s; x++)
        {
            const n = noise2D(x / 9, y / 9) * .5 + noise2D(x / 3.1, y / 3.1) * .35 + Math.random() * .15;
            const v = 200 + n * 55, k = (y * s + x) * 4;
            img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        g.globalAlpha = .18;
        for (let i = 0; i < 900; i++)
        {
            const x = Math.random() * s, y = Math.random() * s, l = 4 + Math.random() * 8, a = -PI / 2 + (Math.random() - .5) * .8;
            g.strokeStyle = Math.random() < .5 ? '#fff' : '#555';
            g.lineWidth = 1;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
        }
    });
    texCobble = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#6b6388'; g.fillRect(0, 0, s, s);
        const rows = 8, rh = s / rows;
        for (let r = 0; r < rows; r++)
        {
            let x = (r % 2) * -18;
            while (x < s)
            {
                const w = 26 + Math.random() * 22;
                const edge = x < 34 || x + w > s - 34;
                const l = edge ? 66 + Math.random() * 8 : 78 + Math.random() * 12;
                g.fillStyle = `hsl(${255 + Math.random() * 25},${12 + Math.random() * 10}%,${l}%)`;
                const px = x + 2.5, py = r * rh + 2.5, pw = w - 5, ph = rh - 5;
                g.beginPath();
                g.roundRect ? g.roundRect(px, py, pw, ph, 7) : g.rect(px, py, pw, ph);
                g.fill();
                g.fillStyle = 'rgba(255,255,255,.12)';
                g.fillRect(px + 3, py + 2, pw - 6, 3);
                x += w;
            }
        }
    });
    texPlank = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#9aa0bd'; g.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += 32)
        {
            g.fillStyle = `hsl(${228 + Math.random() * 20},18%,${58 + Math.random() * 10}%)`;
            g.fillRect(0, y, s, 32);
            g.fillStyle = 'rgba(30,25,60,.45)'; g.fillRect(0, y, s, 3);
            for (let k = 0; k < 30; k++)
            {
                g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(20,20,50,.08)';
                g.fillRect(Math.random() * s, y + 5 + Math.random() * 24, 20 + Math.random() * 70, 1.5);
            }
            const seam = Math.random() * s;
            g.fillStyle = 'rgba(30,25,60,.4)'; g.fillRect(seam, y, 2, 32);
        }
    });
    texRoof = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#2a2a6e'; g.fillRect(0, 0, s, s);
        const rows = 10, rh = s / rows;
        for (let r = 0; r < rows; r++)
        for (let x = (r % 2) * -12; x < s; x += 24)
        {
            g.fillStyle = `hsl(${238 + Math.random() * 18},45%,${30 + Math.random() * 10}%)`;
            g.beginPath();
            g.moveTo(x + 1, r * rh); g.lineTo(x + 23, r * rh); g.lineTo(x + 23, r * rh + rh * .75);
            g.quadraticCurveTo(x + 12, r * rh + rh + 3, x + 1, r * rh + rh * .75); g.closePath(); g.fill();
        }
    });
    texStone = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#5b5470'; g.fillRect(0, 0, s, s);
        for (let i = 0; i < 70; i++)
        {
            const x = Math.random() * s, y = Math.random() * s, w = 30 + Math.random() * 40, h = 20 + Math.random() * 22;
            g.fillStyle = `hsl(${250 + Math.random() * 20},10%,${38 + Math.random() * 18}%)`;
            g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); g.fill();
        }
    });
    texRug = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#5a2f6e'; g.fillRect(0, 0, s, s);
        g.strokeStyle = '#e8c27a'; g.lineWidth = 6; g.strokeRect(14, 14, s - 28, s - 28);
        g.strokeStyle = '#9b6bd6'; g.lineWidth = 4; g.strokeRect(30, 30, s - 60, s - 60);
        g.fillStyle = '#e8c27a';
        for (let i = 0; i < 5; i++)
        {
            const cx = s / 2, cy = s / 2, r = 18 + i * 16;
            g.beginPath();
            for (let k = 0; k < 10; k++)
            {
                const a = k / 10 * TAU - PI / 2, rad = k % 2 ? r * .45 : r;
                g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
            }
            g.closePath();
            g.globalAlpha = .35 - i * .05; g.fill(); g.globalAlpha = 1;
        }
    }, false);
    texWallpaper = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#3b3474'; g.fillRect(0, 0, s, s);
        g.fillStyle = 'rgba(255,240,200,.18)';
        for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
        {
            const x = i * 64 + (j % 2) * 32 + 16, y = j * 64 + 16;
            g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
            g.fillStyle = '#3b3474'; g.beginPath(); g.arc(x + 4, y - 2, 8, 0, TAU); g.fill();
            g.fillStyle = 'rgba(255,240,200,.18)';
            g.fillRect(x + 22, y + 24, 2, 2);
        }
    });
}

// ================================================================ TERRAIN MESH
let terrainObj;
function terrainColor(x, z, h, slope, rd, r, Rr)
{
    const n1 = fbm(x * .045 + 40, z * .045 - 12, 3);
    const n2 = noise2D(x * .35 + 5, z * .35 + 9);
    let c = hsl(mix(.71, .79, n1), mix(.3, .48, n1), .2 + .09 * n1 + .03 * n2);
    c = mixColor(c, hsl(.74, .22, .44), sstep(8, 16, h) * .55);
    c = mixColor(c, hsl(.75, .12, .26 + .06 * n2), sstep(.6, 1.1, slope));
    const pd = dist2(x, z, P.pond.x, P.pond.z);
    c = mixColor(c, hsl(.68, .3, .13), (1 - sstep(P.pond.r - 1, P.pond.r + 2.5, pd)) * .8);
    c = mixColor(c, hsl(.77, .22, .2), sstep(Rr - 5, Rr, r));
    if (rd < 2) c = mixColor(c, hsl(.74, .2, .2), .5);
    return c;
}
function buildTerrain()
{
    const pts = [], nrm = [], cols = [], uvs = [], idx = [];
    const vIndex = new Int32Array(GN * GN).fill(-1);
    for (let j = 0; j < GN; j++)
    for (let i = 0; i < GN; i++)
    {
        let x = -HALF + i * STEP, z = -HALF + j * STEP;
        const th = Math.atan2(z, x), Rr = edgeR(th), r = Math.hypot(x, z);
        if (r > Rr + 3) continue;
        let h, n;
        if (r > Rr) { x = Math.cos(th) * Rr; z = Math.sin(th) * Rr; h = EDGE_Y; n = vec3(Math.cos(th) * .3, 1, Math.sin(th) * .3).normalize(); }
        else { h = drawnH(i, j); n = gridNormal(i, j); }
        vIndex[j * GN + i] = pts.length;
        pts.push(vec3(x, h, z));
        nrm.push(n);
        cols.push(terrainColor(x, z, h, Math.hypot(n.x, n.z) / n.y, roadDist(x, z), r, Rr));
        uvs.push(vec2(x / 5, z / 5));
    }
    for (let j = 0; j < GN - 1; j++)
    for (let i = 0; i < GN - 1; i++)
    {
        const a = vIndex[j * GN + i], b = vIndex[j * GN + i + 1], c = vIndex[(j + 1) * GN + i], d = vIndex[(j + 1) * GN + i + 1];
        if (a < 0 || b < 0 || c < 0 || d < 0) continue;
        const x = -HALF + i * STEP + .5, z = -HALF + j * STEP + .5;
        if (Math.hypot(x, z) > edgeAt(x, z) + 1.5) continue;
        idx.push(a, c, b, b, c, d);
    }
    const mesh = triMesh(pts, idx, nrm, cols, uvs);
    terrainObj = new EngineObject3D(vec3(), mesh, texDetail);
    terrainObj.castShadow = true;
}

// the jagged amethyst root under the island
function buildUnderside()
{
    const ANG = 180, LV = 30, DEPTH = 80;
    const pts = [], cols = [], idx = [];
    for (let l = 0; l <= LV; l++)
    {
        const t = l / LV;
        for (let a = 0; a <= ANG; a++)
        {
            const th = a / ANG * TAU, R0 = edgeR(th), cx = Math.cos(th), sz = Math.sin(th);
            const jag = l === 0 ? 0 : (noise2D(cx * 3 + t * 6 + 9, sz * 3 - t * 5) - .5) * .6 * Math.sin(min(t, .95) * PI);
            const rad = l === LV ? 0 : l === 1 ? R0 * .995 : R0 * Math.pow(1 - t, .8) * (1 + jag);
            const y = l === 0 ? EDGE_Y : l === 1 ? EDGE_Y - 2.5 : EDGE_Y - 2.5 - t * DEPTH + (noise2D(cx * 5 + 2, sz * 5 + t * 8) - .5) * 7 * t;
            pts.push(vec3(cx * rad, y, sz * rad));
            const glow = sstep(.55, 1, t);
            cols.push(mixColor(mixColor(hsl(.76, .28, .2), hsl(.77, .45, .26), sstep(0, .5, t)), hsl(.76, .75, .5), glow));
        }
    }
    for (let l = 0; l < LV; l++)
    for (let a = 0; a < ANG; a++)
    {
        const i0 = l * (ANG + 1) + a, i1 = i0 + 1, i2 = i0 + ANG + 1, i3 = i2 + 1;
        idx.push(i0, i1, i2, i1, i3, i2);
    }
    const mesh = triMesh(pts, idx, undefined, cols);
    mesh.computeNormals(false);
    mesh.doubleSided = true;
    const o = new EngineObject3D(vec3(), mesh);
    o.emissive = .22;
    o.castShadow = false;
    // hanging crystals
    const crystal = buildSphere(1, 4, 2);
    const set = new InstancedMesh3D(crystal, 46, undefined, hsl(.76, .7, .6));
    set.emissive = .85; set.castShadow = false;
    for (let i = 0; i < 46; i++)
    {
        const tip = i < 14;
        const a = rr(0, TAU), rad = tip ? rr(0, 10) : rr(20, 70);
        const t = tip ? 1 : 1 - Math.pow(rad / 95, 1 / .8);
        const y = tip ? rr(-80, -60) : EDGE_Y - 2.5 - clamp(t, 0, 1) * DEPTH * .95 - 2;
        set.setMatrixAt(i, buildMatrix(vec3(Math.cos(a) * rad, y, Math.sin(a) * rad), vec3(rr(-.3, .3), rr(0, 3), rr(-.3, .3)),
            vec3(rr(1, 2.4), rr(4, 11), rr(1, 2.4))));
        set.setColorAt(i, hsl(rr(.72, .8), .7, rr(.5, .7)));
    }
}

// ================================================================ ROADS
// height of a road edge vertex at (ex, ez) on road ri whose centre is at (x, z)
const roadEdgeY = (x, z, ex, ez, ri)=> max(heightAt(ex, ez), heightAt(x, z) - .3) + .07 + ri * .006;
// raise any stretch of road where the terrain mesh would show through, sampling across each road quad
function liftRoadClear(P2, clearance = .04)
{
    for (let pass = 0; pass < 3; pass++)
    {
        let moved = false;
        for (let a = 0; a + 3 < P2.length; a += 2)
        {
            const q = [P2[a], P2[a + 1], P2[a + 2], P2[a + 3]];
            let worst = -1e9;
            for (let u = 0; u <= 1.001; u += .125)
            for (let v = 0; v <= 1.001; v += .125)
            {
                const w = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
                const x = q.reduce((t, p, k)=> t + p.x * w[k], 0), z = q.reduce((t, p, k)=> t + p.z * w[k], 0);
                const y = q.reduce((t, p, k)=> t + p.y * w[k], 0);
                worst = max(worst, terrainMeshY(x, z) + clearance - y);
            }
            if (worst > 0) { for (const p of q) p.y += worst; moved = true; }
        }
        if (!moved) break;
    }
}
function buildRoads()
{
    const mesh = new Mesh;
    ROADS.forEach((pts, ri)=>
    {
        const P2 = [], idx = [], N2 = [], UV = [];
        let len = 0;
        const W = 3.3;
        for (let i = 0; i < pts.length; i++)
        {
            const [x, z] = pts[i];
            const [nx, nz] = pts[min(pts.length - 1, i + 1)], [px, pz] = pts[max(0, i - 1)];
            let tx = nx - px, tz = nz - pz;
            const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
            const lx = -tz, lz = tx;
            // texture along the length walked, so cobbles on a climb are not stretched
            if (i) len += Math.hypot(x - pts[i - 1][0], heightAt(x, z) - heightAt(pts[i - 1][0], pts[i - 1][1]), z - pts[i - 1][1]);
            for (const side of [-1, 1])
            {
                const ex = x + lx * W / 2 * side, ez = z + lz * W / 2 * side;
                P2.push(vec3(ex, roadEdgeY(x, z, ex, ez, ri), ez));
                N2.push(normalAt(ex, ez));
                UV.push(vec2(side < 0 ? 0 : 1, len / 3.3));
            }
            if (i)
            {
                const a = (i - 1) * 2, b = a + 1, c = a + 2, d = a + 3;
                // a,b previous left/right, c,d current; up facing
                const cross = (P2[b].x - P2[a].x) * (P2[c].z - P2[a].z) - (P2[b].z - P2[a].z) * (P2[c].x - P2[a].x);
                if (cross > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
            }
        }
        liftRoadClear(P2);
        mesh.addTriangles(P2, idx, N2, UV, WHITE);
    });
    mesh.doubleSided = true;
    const o = new EngineObject3D(vec3(), mesh, texCobble);
    o.castShadow = false;
}

// ================================================================ SCENERY
const lampLights = [];
let glowSet; // the lamp glass glows
// a soft pool of lamplight on the ground, so a lamp reads as shining down
class LampPool extends EngineObject3D
{
    constructor(pos, size, color)
    {
        super(pos);
        this.additive = true;
        this.castShadow = false;
        this.poolSize = size;
        this.poolColor = color;
    }
    render3D() { if (camNear(this.pos3D, 80)) render3D.drawSoftDisc(this.pos3D, this.poolSize, this.poolColor, vec3(0, 1, 0), 24); }
}
function buildLamps()
{
    const spots = [];
    ROADS.forEach((pts, ri)=>
    {
        let acc = 9 + ri * 3, side = ri % 2 ? 1 : -1;
        for (let i = 1; i < pts.length - 1; i++)
        {
            acc += dist2(pts[i][0], pts[i][1], pts[i - 1][0], pts[i - 1][1]);
            if (acc < 17) continue;
            acc = 0; side = -side;
            const [x, z] = pts[i], [nx, nz] = pts[i + 1];
            let tx = nx - x, tz = nz - z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
            const px = x - tz * 2.7 * side, pz = z + tx * 2.7 * side;
            if (dist2(px, pz, P.pond.x, P.pond.z) < P.pond.r + 2) continue;
            if (spots.some((s)=> dist2(s[0], s[1], px, pz) < 8)) continue;
            if (!insideIsland(px, pz, 3)) continue;
            spots.push([px, pz]);
        }
    });
    // the crossroads by the spawn gets a warmer lamp, its arm reaching out over the junction
    const cross = { x: P.spawn.x - 2.9, z: P.spawn.z - 1.05 }; // the tip of the grass corner west of the junction
    const crossYaw = Math.atan2(-(P.spawn.z - cross.z), P.spawn.x - cross.x);
    spots.push([cross.x, cross.z]);
    const post = new Mesh()
        .combine(buildCylinder(.12, 3, 6), vec3(0, 1.5, 0), hsl(.72, .2, .14))
        .combine(buildCylinder(.32, .25, 8), vec3(0, .1, 0), hsl(.72, .12, .3))
        .combine(buildBox(vec3(.7, .07, .07)), vec3(.3, 2.95, 0), hsl(.72, .2, .14))
        .combine(buildCone(.42, .22, 6), vec3(.58, 2.78, 0), hsl(.72, .2, .14))
        .combine(buildCylinder(.3, .05, 6), vec3(.58, 2.27, 0), hsl(.72, .2, .14));
    const posts = new InstancedMesh3D(post, spots.length);
    glowSet = new InstancedMesh3D(buildSphere(.26, 8, 6), spots.length, undefined, hsl(.58, .8, .75));
    glowSet.emissive = 1.6; glowSet.castShadow = false;
    spots.forEach(([x, z], i)=>
    {
        const isCross = i === spots.length - 1;
        const randomYaw = rr(0, TAU); // drawn for every lamp so the scenery placed after this stays where it was
        const y = heightAt(x, z), yaw = isCross ? crossYaw : randomYaw;
        posts.setMatrixAt(i, buildMatrix(vec3(x, y - .05, z), vec3(0, yaw, 0)));
        const head = vec3(x + Math.cos(yaw) * .58, y + 2.5, z - Math.sin(yaw) * .58);
        glowSet.setMatrixAt(i, buildMatrix(head));
        glowSet.setColorAt(i, isCross ? hsl(.11, .8, .75) : hsl(.58, .8, .75));
        // the crossroads light hangs just under the shade so it falls on the junction below
        const L = isCross ? new Light3D(head.add(vec3(0, -.2, 0)), 11, hsl(.1, .65, .7), 2.2) : new Light3D(head, 10, hsl(.6, .7, .7), 1.5);
        L.glow = 1.6; L.glowFalloff = 1.4;
        lampLights.push(L);
        if (isCross) new LampPool(vec3(head.x, heightAt(head.x, head.z) + .04, head.z), 7, hsl(.1, .7, .6, .26));
        addSolid({ kind: 'circle', x, z, r: .25, top: 3 });
    });
}

// grass tufts: a few meshes that sway, drawn as instances in chunks near the camera
const grassMeshes = [], grassChunks = [];
function buildGrass()
{
    const VARIANTS = 4;
    for (let v = 0; v < VARIANTS; v++)
    {
        const pts = [], cols = [], nrm = [], idx = [], base = [];
        const blades = 6;
        for (let b = 0; b < blades; b++)
        {
            const a = b / blades * TAU + rr(-.3, .3), off = rr(0, .18);
            const ox = Math.cos(a) * off, oz = Math.sin(a) * off;
            const face = rr(0, TAU), fx = Math.cos(face), fz = Math.sin(face);
            const h = rr(.3, .6), w = rr(.04, .06), lean = rr(.06, .2);
            const k = pts.length;
            const n = vec3(fx, .5, fz).normalize();
            for (const [t, ww] of [[0, w], [.55, w * .7]])
            {
                const lx = ox + Math.cos(a) * lean * t * t, lz = oz + Math.sin(a) * lean * t * t;
                pts.push(vec3(lx - fz * ww, h * t, lz + fx * ww), vec3(lx + fz * ww, h * t, lz - fx * ww));
                base.push(t, t);
                const c = hsl(.74, .42, .16 + t * .2);
                cols.push(c, c); nrm.push(n, n);
            }
            pts.push(vec3(ox + Math.cos(a) * lean, h, oz + Math.sin(a) * lean)); base.push(1); cols.push(hsl(.73, .38, .5)); nrm.push(n);
            idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2, k + 2, k + 3, k + 4);
        }
        const mesh = triMesh(pts, idx, nrm, cols);
        mesh.doubleSided = true;
        mesh.dynamicDraw = true;
        mesh.basePoints = pts.map((p)=> p.copy());
        mesh.heightT = base;
        mesh.phase = v * 1.7;
        grassMeshes.push(mesh);
    }
    const CH = 24, N = Math.ceil(2 * HALF / CH);
    const density = MOBILE ? .55 : 1.05;
    for (let cz = 0; cz < N; cz++)
    for (let cx = 0; cx < N; cx++)
    {
        const x0 = -HALF + cx * CH, z0 = -HALF + cz * CH;
        const lists = grassMeshes.map(()=> []);
        const target = Math.round(CH * CH * density);
        for (let k = 0; k < target; k++)
        {
            const x = x0 + rr(0, CH), z = z0 + rr(0, CH);
            if (!insideIsland(x, z, 2)) continue;
            if (roadDist(x, z) < 2.1) continue;
            if (dist2(x, z, P.pond.x, P.pond.z) < P.pond.r - .7) continue;
            if (!grassClear(x, z)) continue;
            if (solidsAt(x, z).some((s)=> s.zone === 'island' && !s.platformOnly && s.kind === 'box' && solidContains(s, x, z))) continue;
            const n = normalAt(x, z);
            if (n.y < .78) continue;
            if (fbm(x * .06 + 3, z * .06 + 1, 2) < .32 && rr(0, 1) < .65) continue;
            const sc = rr(.75, 1.35), kk = rr(.8, 1.2);
            lists[k % 4].push([buildMatrix(vec3(x, heightAt(x, z) - .03, z), vec3(0, rr(0, TAU), 0), vec3(sc, sc * rr(.8, 1.5), sc)),
                rgb(kk * rr(.9, 1.08), kk * rr(.88, 1.02), kk)]);
        }
        lists.forEach((list, v)=>
        {
            if (!list.length) return;
            const set = new InstancedMesh3D(grassMeshes[v], list.length);
            list.forEach(([m, c], i)=> { set.setMatrixAt(i, m); set.setColorAt(i, c); });
            set.castShadow = false;
            set.center = vec3(x0 + CH / 2, 0, z0 + CH / 2);
            set.full = list.length;
            grassChunks.push(set);
        });
    }
}
function updateGrass()
{
    const t = time, c = render3D.camera.pos, far = gfx.low ? 46 : MOBILE ? 58 : 78;
    for (const g of grassChunks)
    {
        const d = Math.hypot(g.center.x - c.x, g.center.z - c.z);
        g.count = d < far && player.zone === 'island' ? g.full : 0;
    }
    for (const m of grassMeshes)
    {
        const gust = .5 + .5 * Math.sin(t * .37 + m.phase);
        const sx = (Math.sin(t * 1.3 + m.phase) * .06 + .05) * (.6 + gust * .8);
        const sz = Math.cos(t * 1.05 + m.phase * 1.3) * .045;
        for (let i = 0; i < m.points.length; i++)
        {
            const b = m.basePoints[i], k = m.heightT[i] * m.heightT[i];
            const p = m.points[i];
            p.x = b.x + sx * k; p.z = b.z + sz * k; p.y = b.y - (sx * sx + sz * sz) * k * .8;
        }
        m.dirty = true;
    }
}

// trees, rocks and glowing flowers
function buildTrees()
{
    const trunkCol = hsl(.8, .22, .17);
    const puff = (h)=> new Mesh()
        .combine(buildCylinder(.42, h, 7, false), vec3(0, h / 2, 0), trunkCol)
        .combine(buildSphere(3.0, 7, 5, false), vec3(0, h + .6, 0), hsl(.75, .42, .3))
        .combine(buildSphere(2.3, 7, 5, false), vec3(.9, h + 1.5, .3), hsl(.73, .45, .34))
        .combine(buildSphere(1.9, 7, 5, false), vec3(-.7, h + 1.8, -.4), hsl(.77, .4, .37));
    const spire = new Mesh()
        .combine(buildCylinder(.32, 2, 6, false), vec3(0, 1, 0), trunkCol)
        .combine(buildCone(3.2, 3, 7, false), vec3(0, 2.6, 0), hsl(.63, .4, .24))
        .combine(buildCone(2.5, 2.6, 7, false), vec3(0, 3.9, 0), hsl(.64, .42, .28))
        .combine(buildCone(1.7, 2.2, 7, false), vec3(0, 5.1, 0), hsl(.65, .45, .32));
    const meshes = [puff(2.6), puff(3.4), spire];
    const caps = [130, 110, 120];
    const sets = meshes.map((m, i)=> new InstancedMesh3D(m, caps[i]));
    const counts = [0, 0, 0];
    const fruitSet = new InstancedMesh3D(buildSphere(.34, 8, 6), 600, undefined, WHITE);
    fruitSet.emissive = 1.3; fruitSet.castShadow = false;
    let fruits = 0, tries = 0;
    while (tries++ < 9000 && counts.some((c, i)=> c < caps[i]))
    {
        const a = rr(0, TAU), r = Math.sqrt(rr(0, 1)) * 100;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!insideIsland(x, z, 7)) continue;
        if (roadDist(x, z) < 5.5) continue;
        if (!isClear(x, z, 3)) continue;
        if (dist2(x, z, P.pond.x, P.pond.z) < P.pond.r + 6) continue;
        if (fbm(x * .03 + 11, z * .03 - 7, 3) < .47) continue;
        if (normalAt(x, z).y < .8) continue;
        const v = WR.int(3);
        if (counts[v] >= caps[v]) continue;
        const i = counts[v]++;
        const sc = rr(.8, 1.3), yaw = rr(0, TAU), y = heightAt(x, z) - .15;
        sets[v].setMatrixAt(i, buildMatrix(vec3(x, y, z), vec3(0, yaw, 0), vec3(sc)));
        sets[v].setColorAt(i, hsl(0, 0, rr(.85, 1.1)));
        addSolid({ kind: 'circle', x, z, r: .4 * sc, top: 9 });
        clearings.push({ x, z, r: 1.6 });
        if (v < 2 && rr(0, 1) < .45 && fruits < 590)
        {
            const h = v ? 3.4 : 2.6, hue = [.12, .52, .9][WR.int(3)];
            for (let k = 0; k < 5; k++)
            {
                const fa = rr(0, TAU), fr = rr(1.1, 1.6);
                const local = vec3(Math.cos(fa) * fr, h + rr(-.2, 1.4), Math.sin(fa) * fr).scale(sc);
                fruitSet.setMatrixAt(fruits, buildMatrix(vec3(x + local.x, y + local.y, z + local.z)));
                fruitSet.setColorAt(fruits, hsl(hue, .9, .68));
                fruits++;
            }
        }
    }
    sets.forEach((s, i)=> s.count = counts[i]);
    fruitSet.count = max(1, fruits);
}
function buildRocks()
{
    const set = new InstancedMesh3D(buildSphere(1, 6, 4, false), 170, undefined, hsl(.74, .1, .42));
    let n = 0, tries = 0;
    while (n < 170 && tries++ < 5000)
    {
        const a = rr(0, TAU), r = Math.sqrt(rr(0, 1)) * 102;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!insideIsland(x, z, 4) || roadDist(x, z) < 3.5 || !isClear(x, z, 1)) continue;
        if (dist2(x, z, P.pond.x, P.pond.z) < P.pond.r + 2) continue;
        const s = Math.pow(rr(0, 1), 2) * 1.5 + .3;
        set.setMatrixAt(n, buildMatrix(vec3(x, heightAt(x, z) - s * .25, z), vec3(rr(0, 3), rr(0, 3), rr(0, 3)),
            vec3(s * rr(.8, 1.5), s * rr(.5, .9), s)));
        set.setColorAt(n, hsl(rr(.72, .78), rr(.08, .2), rr(.3, .45)));
        if (s > .7) addSolid({ kind: 'circle', x, z, r: s * .85, top: heightAt(x, z) + s * .5 });
        n++;
    }
    set.count = n;
}
let flowerSet;
function buildFlowers()
{
    const petal = new Mesh();
    for (let k = 0; k < 5; k++)
    {
        const a = k / 5 * TAU;
        petal.combine(buildSphere(1, 6, 4), buildMatrix(vec3(Math.cos(a) * .09, 0, Math.sin(a) * .09), vec3(0, -a, 0), vec3(.13, .03, .07)));
    }
    petal.combine(buildSphere(.07, 6, 4), vec3(0, .02, 0));
    const stemSet = new InstancedMesh3D(buildCylinder(.02, 1, 4), 900, undefined, hsl(.5, .4, .25));
    stemSet.castShadow = false;
    flowerSet = new InstancedMesh3D(petal, 900, undefined, WHITE);
    flowerSet.emissive = .95; flowerSet.castShadow = false;
    let n = 0, tries = 0;
    const put = (x, z, hue)=>
    {
        const h = rr(.22, .42), y = heightAt(x, z);
        stemSet.setMatrixAt(n, buildMatrix(vec3(x, y + h / 2, z), undefined, vec3(1, h, 1)));
        flowerSet.setMatrixAt(n, buildMatrix(vec3(x, y + h, z), vec3(rr(-.3, .3), rr(0, 3), rr(-.3, .3)), vec3(rr(.8, 1.3))));
        flowerSet.setColorAt(n, hsl(hue, rr(.5, .8), rr(.7, .82)));
        n++;
    };
    while (n < 820 && tries++ < 12000)
    {
        const a = rr(0, TAU), r = Math.sqrt(rr(0, 1)) * 103;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!insideIsland(x, z, 3) || roadDist(x, z) < 2.4 || !isClear(x, z)) continue;
        if (dist2(x, z, P.pond.x, P.pond.z) < P.pond.r + .6) continue;
        if (noise2D(x * .09 + 50, z * .09) < .62) continue;
        put(x, z, [.55, .62, .85, .12, .95][WR.int(5)]);
    }
    stemSet.count = flowerSet.count = n;
}

// orbiting shards in the void
let shardSet; const shards = [];
function buildShards()
{
    const N = 70;
    shardSet = new InstancedMesh3D(buildSphere(1, 4, 2), N, undefined, hsl(.75, .6, .6));
    shardSet.emissive = .7; shardSet.castShadow = false;
    for (let i = 0; i < N; i++)
        shards.push({ r: rr(112, 260), h: rr(-120, 10), a: rr(0, TAU), sp: rr(.006, .02) * (rr(0, 1) < .5 ? 1 : -1), ph: rr(0, TAU), s: rr(.8, 4.5), spin: rr(.1, .5) });
}
function updateShards()
{
    for (let i = 0; i < shards.length; i++)
    {
        const s = shards[i];
        s.a += s.sp * timeDelta;
        const blink = Math.pow(max(0, Math.sin(time * .5 + s.ph)), 16);
        shardSet.setMatrixAt(i, buildMatrix(vec3(Math.cos(s.a) * s.r, s.h + Math.sin(time * .3 + s.ph) * 2, Math.sin(s.a) * s.r),
            vec3(time * s.spin, time * s.spin * .7 + s.ph, 0), vec3(s.s * .6, s.s * 1.4, s.s * .6)));
        shardSet.setColorAt(i, hsl(.75, .6, .55 + blink * .4));
    }
}
