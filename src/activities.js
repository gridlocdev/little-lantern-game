import {
    EngineObject3D, InstancedMesh3D, Light3D, Matrix4, Mesh, PI, WHITE, abs, buildBox, buildCylinder, buildLathe,
    buildMatrix, buildSphere, clamp, gamepadStick, hsl, max, min, mouseDeltaScreen, mouseIsDown, mouseWheel,
    noise2D, rand, randInt, render3D, time, timeDelta, vec2, vec3,
} from './platform/engine.js';
import { PENTA, bell, playSfx } from './audio.js';
import {
    addInteract, clearTouchPresses, gameMode, groundInfo, input, pointerOnCanvas, setActivity, touchState,
} from './controls.js';
import { MOBILE, TAU, canvasTexture, dist2, fbm, mix, mtx, obj3, rr, sstep, triMesh, wrapAngle } from './core.js';
import { addFishingSpot } from './fishing.js';
import { burst, sparkleColumn } from './fx.js';
import { camNear, whale } from './main.js';
import { BOXM, CAPS, CONE, CYL, SPH, SPH_LO, TORUS, moth, player } from './player.js';
import { save, writeSave } from './save.js';
import { ShootingStar } from './sky.js';
import { $, PLACE_NAMES, say, toast } from './ui.js';
import { discMesh, waterShader } from './village.js';
import {
    P, WATER_Y, addClearing, addSolid, heightAt, insideIsland, isClear, solidContains, solidsAt, texStone,
} from './world.js';

// ================================================================ SITTING
export function startSit(seat, faceYaw, opts = {})
{
    player.yaw = faceYaw;
    player.pos = vec3(seat.x, seat.y + (opts.height ?? .45), seat.z);
    player.vel = vec3();
    player.pose = opts.pose || 'sit';
    const fromPos = player.pos.copy();
    setActivity({
        name: 'sit', ownsPhysics: true,
        update()
        {
            player.pos = fromPos.copy(); player.vel = vec3();
            if (opts.update) opts.update();
            if (input.move().length() > .4 || input.act() || input.jump() || input.back())
            {
                clearTouchPresses();
                setActivity(null);
                player.pose = 'free';
                const fwd = vec3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
                const out = seat.add(fwd.scale(opts.out ?? .9));
                const g = groundInfo(out.x, out.z, out.y + 1);
                player.pos = vec3(out.x, max(g.y, out.y), out.z);
                if (opts.onStand) opts.onStand();
            }
        },
        cancel() { setActivity(null); player.pose = 'free'; },
        hint: ()=> opts.hint || `${MOBILE ? 'Use' : 'E'}|Get up`,
        cam: opts.cam,
    });
    if (opts.onSit) opts.onSit();
}

// ================================================================ MOONWILLOW SWING
export let swingState = null;
const SWING = {};
class Moonwillow extends EngineObject3D
{
    constructor(base)
    {
        super(base.copy());
        this.castShadow = false;
        this.fronds = [];
        for (let i = 0; i < 46; i++)
        {
            const a = rr(0, TAU), r = rr(1.5, 6.5);
            this.fronds.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: rr(7.6, 9.4), len: rr(2.5, 5.5), ph: rr(0, TAU), hue: rr(0, 1) < .5 ? .5 : .85 });
        }
    }
    render3D()
    {
        const b = this.pos3D;
        if (!camNear(b, 110)) return;
        for (const f of this.fronds)
        {
            const pts = [];
            for (let k = 0; k <= 5; k++)
            {
                const t = k / 5;
                const sway = Math.sin(time * 1.1 + f.ph + t * 2) * .35 * t;
                pts.push(b.add(vec3(f.x + sway, f.y - t * f.len, f.z + sway * .6)));
            }
            const c = hsl(f.hue, .55, .5);
            render3D.drawRibbon(pts, [.05, .1, .12, .1, .07, .03], undefined, c);
        }
    }
}
export function buildSwing()
{
    const x = P.swing.x, z = P.swing.z, y = heightAt(x, z);
    // the swing hangs from a long branch and swings toward the island's middle
    const toCenter = Math.atan2(-x, -z);
    SWING.dirYaw = toCenter;
    SWING.dir = vec3(Math.sin(toCenter), 0, Math.cos(toCenter)).normalize();
    SWING.side = vec3(SWING.dir.z, 0, -SWING.dir.x);
    const trunkPos = vec3(x, y, z).add(SWING.side.scale(-4.2));
    SWING.pivot = vec3(x, y + 7.2, z);
    SWING.len = 5.4;
    const bark = hsl(.78, .2, .2);
    const tree = new Mesh()
        .combine(buildCylinder(1.5, 8, 9, true), vec3(0, 4, 0), bark)
        .combine(buildCylinder(2.2, 1.2, 9, true), vec3(0, .5, 0), bark)
        .combine(buildSphere(7, 10, 8, false), vec3(1.5, 9.3, 0), hsl(.5, .35, .26))
        .combine(buildSphere(5.5, 10, 8, false), vec3(4.6, 9.8, 1.2), hsl(.82, .3, .3))
        .combine(buildSphere(5, 10, 8, false), vec3(-1.8, 10.2, -1.6), hsl(.55, .35, .3));
    const t = obj3(trunkPos, tree);
    t.rotation3D = vec3(0, Math.atan2(SWING.side.x, SWING.side.z) - PI / 2, 0);
    // the branch from the trunk out over the swing
    const branchEnd = SWING.pivot.add(SWING.side.scale(2.2)), branchStart = trunkPos.add(vec3(0, 6.8, 0));
    const bd = branchEnd.subtract(branchStart);
    const mid = branchStart.lerp(branchEnd, .5);
    const branch = obj3(mid, buildCylinder(.55, 1, 8, true), bark);
    branch.localMatrix = Matrix4.lookAt(mid, mid.add(bd)).multiply(buildMatrix(undefined, vec3(-PI / 2, 0, 0), vec3(1, bd.length() + .6, 1)));
    addSolid({ kind: 'circle', x: trunkPos.x, z: trunkPos.z, r: 1.1, top: 99 });
    new Moonwillow(trunkPos);
    new SwingSet();
    addInteract({ pos: vec3(x, y, z), r: 2.4, label: 'Sit on the swing', act: startSwing });
    PLACE_NAMES.push({ name: 'Moonwillow Swing', sub: 'lean in at the top of each swing', x, z, r: 9, zone: 'island' });
    addClearing(x, z, 17);
}
class SwingSet extends EngineObject3D
{
    constructor() { super(SWING.pivot.copy()); this.castShadow = true; }
    render3D()
    {
        const th = swingState ? swingState.angle : Math.sin(time * .8) * .04;
        const { pivot, dir, side, len } = SWING;
        const down = vec3(0, -1, 0).scale(Math.cos(th)).add(dir.scale(Math.sin(th)));
        const seat = pivot.add(down.scale(len));
        for (const s of [-.55, .55])
        {
            const top = pivot.add(side.scale(s)), bot = seat.add(side.scale(s));
            render3D.drawLine(top, bot, .05, hsl(.12, .3, .6));
        }
        const seatYaw = Math.atan2(dir.x, dir.z);
        render3D.drawMesh(BOXM, mtx(undefined, seat, vec3(th, seatYaw, 0), vec3(.5, .08, 1.3)).multiply(buildMatrix(undefined, vec3(0, PI / 2, 0))), undefined, hsl(.75, .2, .45));
        SWING.seat = seat;
        if (swingState && swingState.window > 0)
        {
            const e = render3D.emissive; render3D.emissive = 1;
            render3D.drawMesh(TORUS, mtx(undefined, seat.add(vec3(0, .1, 0)), vec3(), vec3(1.4 + swingState.window, .3, 1.4 + swingState.window)), undefined, hsl(.13, .9, .7, .6));
            render3D.emissive = e;
        }
    }
}
function startSwing()
{
    swingState = { angle: 0, vel: 0, lastSign: 0, window: 0, peak: 0, high: false };
    player.pose = 'swing';
    player.yaw = SWING.dirYaw;
    setActivity({
        name: 'swing', ownsPhysics: true,
        update: updateSwing,
        cancel()
        {
            swingState = null; setActivity(null); player.pose = 'free'; player.extraPitch = 0;
        },
        hint: ()=> swingState.window > 0 ? `${MOBILE ? 'Use' : 'E'}|Lean in now!` : `${MOBILE ? 'Use' : 'E'}|Lean in at the top · ${MOBILE ? 'Jump' : 'Space'} lets go · ${MOBILE ? '' : 'Q gets off'}`,
        cam: ()=> ({ target: SWING.pivot.add(vec3(0, -3.2, 0)), dist: 13, yaw: Math.atan2(SWING.side.x, SWING.side.z), pitch: .12 }),
    });
}
function updateSwing()
{
    const S = swingState, dt = timeDelta;
    const g = 9.8 / SWING.len;
    S.vel += -g * Math.sin(S.angle) * dt;
    S.vel *= 1 - dt * .06;
    S.angle += S.vel * dt;
    const sign = Math.sign(S.vel);
    if (sign !== S.lastSign && S.lastSign !== 0)
    {
        S.window = .32; // just reached a turning point
        S.peak = abs(S.angle);
        playSfx('creak', SWING.pivot, .5, .9 + S.peak * .2);
    }
    S.lastSign = sign || S.lastSign;
    S.window = max(0, S.window - dt);
    if (input.act())
    {
        if (S.window > 0 || abs(S.angle) < .03)
        {
            const kick = abs(S.angle) < .03 ? 1.1 : .55 + (1.45 - abs(S.angle)) * .25;
            S.vel += (S.angle > 0 ? -1 : S.angle < 0 ? 1 : 1) * kick;
            S.window = 0;
            playSfx('whoosh', player.pos, .4, 1.4);
        }
        else S.vel *= .93;
    }
    S.angle = clamp(S.angle, -1.5, 1.5);
    if (!S.high && S.peak > 1.15)
    {
        S.high = true;
        save.swingHigh = true; writeSave();
        toast('So high you could touch the moon!');
        sparkleColumn(SWING.seat, hsl(.13, .9, .75), 40, 3);
        [0, 4, 7, 11, 14].forEach((n, i)=> setTimeout(()=> bell(n + 12, undefined, .4), i * 90));
    }
    // seat the mothling, tilted with the swing
    const { pivot, dir, len } = SWING;
    const down = vec3(0, -1, 0).scale(Math.cos(S.angle)).add(dir.scale(Math.sin(S.angle)));
    const seat = pivot.add(down.scale(len));
    player.pos = seat.add(vec3(0, .02, 0));
    player.extraPitch = S.angle;
    player.vel = vec3();
    if (input.jump() && abs(S.vel) < .45 && abs(S.angle) < .25)
    {
        endSwing(false);
        player.pos = seat.add(SWING.dir.scale(-1.2)).add(vec3(0, .5, 0));
        clearTouchPresses();
        return;
    }
    if (input.jump())
    {
        // let go: fly along the swing's path, wings open
        const tangent = vec3(0, -1, 0).scale(-Math.sin(S.angle)).add(dir.scale(Math.cos(S.angle)));
        const speed = S.vel * len;
        player.vel = tangent.scale(speed).add(vec3(0, 2.5, 0));
        if (abs(S.angle) > .9 && S.vel * S.angle > -0.2 && player.vel.y > 0)
        {
            save.swingFlight = true; writeSave();
            toast('Wheee! Hold jump to glide.');
        }
        endSwing(true);
        clearTouchPresses();
        return;
    }
    if (input.back() || (MOBILE && touchState.journal))
    {
        endSwing(false);
        player.pos = seat.add(SWING.dir.scale(-1.2)).add(vec3(0, .5, 0));
    }
}
function endSwing(fly)
{
    swingState = null; setActivity(null);
    player.pose = 'free'; player.extraPitch = 0;
    player.onGround = false;
    if (!fly) player.vel = vec3();
}

// ================================================================ AMETHYST HILL CHIMES
const CHIME_COLORS = [hsl(.95, .7, .68), hsl(.08, .8, .65), hsl(.15, .85, .65), hsl(.4, .6, .6), hsl(.5, .75, .62), hsl(.6, .7, .7), hsl(.76, .7, .72)];
const CHIME_NAMES = ['rose', 'amber', 'gold', 'mint', 'teal', 'sky', 'violet'];
const MOON_SONG = [6, 4, 2, 4, 6, 0];
const chimes = [];
let chimeLast = [];
class ChimeRing extends EngineObject3D
{
    constructor() { super(vec3(P.chimes.x, heightAt(P.chimes.x, P.chimes.z), P.chimes.z)); this.castShadow = true; }
    render3D()
    {
        if (!camNear(this.pos3D, 150)) return;
        for (const c of chimes)
        {
            c.hit = max(0, c.hit - timeDelta * 1.2);
            const sc = 1 + c.hit * .12;
            const e = render3D.emissive;
            render3D.emissive = .55 + c.hit * 1.2 + Math.sin(time * 1.5 + c.i) * .08;
            render3D.drawMesh(c.mesh, mtx(undefined, c.pos, vec3(0, c.yaw + Math.sin(time * 6) * c.hit * .05, 0), vec3(sc)), undefined, c.color);
            render3D.emissive = e;
        }
    }
}
export function buildChimes()
{
    const cx = P.chimes.x, cz = P.chimes.z, cy = heightAt(cx, cz);
    for (let i = 0; i < 7; i++)
    {
        const a = i / 7 * TAU + .3, r = 5.6;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = heightAt(x, z);
        const h = 2.2 + i * .35;
        const mesh = new Mesh()
            .combine(buildSphere(1, 6, 3, false), buildMatrix(vec3(0, h * .5, 0), undefined, vec3(.9, h, .9)))
            .combine(buildSphere(1, 5, 3, false), buildMatrix(vec3(.55, h * .3, .2), vec3(0, 0, -.35), vec3(.45, h * .5, .45)))
            .combine(buildSphere(1, 5, 3, false), buildMatrix(vec3(-.45, h * .22, -.3), vec3(.3, 0, .4), vec3(.4, h * .4, .4)));
        const c = { i, pos: vec3(x, y - .2, z), color: CHIME_COLORS[i], mesh, yaw: rr(0, TAU), hit: 0, semi: PENTA[i] + 12 };
        chimes.push(c);
        addSolid({ kind: 'circle', x, z, r: .7, top: y + h });
        addInteract({ pos: vec3(x, y, z), r: 2, label: `Ring the ${CHIME_NAMES[i]} crystal`, act: ()=> ringChime(c) });
    }
    new ChimeRing;
    // the carved stone with the song on it
    const tex = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#4c4566'; g.fillRect(0, 0, s, s);
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; g.strokeRect(10, 10, s - 20, s - 20);
        g.fillStyle = '#d9d0ff'; g.font = 'italic 24px Georgia, serif'; g.textAlign = 'center';
        g.fillText('the moon song', s / 2, 54);
        MOON_SONG.forEach((n, k)=>
        {
            const c = CHIME_COLORS[n];
            g.fillStyle = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
            g.shadowColor = g.fillStyle; g.shadowBlur = 12;
            g.beginPath(); g.arc(38 + k * 36, 130 + (k % 2 ? 18 : -6), 13, 0, TAU); g.fill();
        });
        g.shadowBlur = 0;
        g.fillStyle = '#b8aee0'; g.font = '17px Georgia, serif';
        g.fillText('play them in order', s / 2, 210);
    }, false);
    const stone = obj3(vec3(cx, cy + .9, cz), buildBox(vec3(2.2, 1.8, .45)), hsl(.74, .1, .36));
    const face = triMesh([vec3(-1, -.8, .235), vec3(1, -.8, .235), vec3(1, .8, .235), vec3(-1, .8, .235)], [0, 1, 2, 0, 2, 3], vec3(0, 0, 1), WHITE,
        [vec2(.04, .96), vec2(.96, .96), vec2(.96, .04), vec2(.04, .04)]);
    const faceObj = new EngineObject3D(vec3(cx, cy + .9, cz), face, tex);
    faceObj.emissive = .35;
    const yaw = Math.atan2(P.chimes.x - (-30), P.chimes.z - (-6)) + PI;
    stone.rotation3D = faceObj.rotation3D = vec3(0, Math.atan2(-30 - cx, -6 - cz), 0);
    addSolid({ kind: 'box', x: cx, z: cz, hx: 1.2, hz: .35, yaw: stone.rotation3D.y, top: cy + 1.8 });
    addInteract({ pos: vec3(cx, cy, cz), r: 2.6, label: 'Read the carved stone', act: ()=>
        say('The carved stone', ['Six crystals glow in a row across the stone, under the words "the moon song".',
            `In order: ${MOON_SONG.map((n)=> CHIME_NAMES[n]).join(', ')}.`]) });
    new Light3D(vec3(cx, cy + 3, cz), 14, hsl(.78, .7, .6), 1.4);
    PLACE_NAMES.push({ name: 'Amethyst Hill', sub: 'every crystal hums one note', x: cx, z: cz, r: 10, zone: 'island' });
    addClearing(cx, cz, 13);
}
function ringChime(c)
{
    c.hit = 1;
    bell(c.semi, c.pos, 1);
    burst(c.pos.add(vec3(0, 2, 0)), c.color, 12, .05, .2);
    moth.reach = 1;
    chimeLast.push(c.i);
    if (chimeLast.length > MOON_SONG.length) chimeLast.shift();
    if (chimeLast.join() === MOON_SONG.join())
    {
        chimeLast = [];
        setTimeout(()=>
        {
            for (const ch of chimes) ch.hit = 1;
            [0, 4, 7, 12, 16, 19].forEach((n, k)=> setTimeout(()=> bell(n + 12, undefined, .5), k * 120));
            if (!save.bridge)
            {
                save.bridge = true; writeSave();
                say('', ['The moon hums the song back to you.', 'Far to the west, past Cloudsheep Meadow, a bridge of light unfolds from the edge of the island.']);
                bridgeAppear(0);
            }
            else toast('The moon hums along.');
        }, 500);
    }
}

// ================================================================ LIGHT BRIDGE AND THE MOONLET
const bridgeSlabs = [];
let moonletY = 0;
const moonletHeight = (x, z)=>
{
    const d = dist2(x, z, P.moonlet.x, P.moonlet.z);
    const pool = 1 - sstep(3, 4.4, d);
    return moonletY + (1 - sstep(0, P.moonlet.r, d)) * .9 - pool * .9 + (noise2D(x * .2, z * .2) - .5) * .25 * (1 - pool);
};
class BridgeSlabs extends EngineObject3D
{
    constructor() { super(vec3()); this.castShadow = true; }
    render3D()
    {
        const e = render3D.emissive;
        render3D.emissive = .7;
        for (const s of bridgeSlabs)
        {
            if (s.show <= 0) continue;
            s.show = min(1, s.show + timeDelta * 1.5);
            const bob = Math.sin(time * 1.2 + s.i * .7) * .04;
            render3D.drawMesh(BOXM, mtx(undefined, s.pos.add(vec3(0, bob - .12, 0)), vec3(0, s.yaw + Math.sin(s.i * 1.7) * .15, 0), vec3(2 * s.show, .18, 1.5 * s.show)), undefined, hsl(.6 + Math.sin(s.i) * .06, .55, .55, 1));
        }
        render3D.emissive = e;
    }
}
export function buildMoonlet()
{
    const a = P.bridgeStart, m = P.moonlet;
    const startY = heightAt(a.x, a.z);
    moonletY = startY + 2.5;
    // bridge slabs every 2.2 m from the edge to the moonlet's rim
    const dx = m.x - a.x, dz = m.z - a.z, L = Math.hypot(dx, dz) - m.r + 1.5;
    const ux = dx / Math.hypot(dx, dz), uz = dz / Math.hypot(dx, dz);
    const yaw = Math.atan2(ux, uz);
    const n = Math.ceil(L / 2.25);
    // collision boxes overlap their neighbours by more than walkable()'s .15 inset, so there is no void gap between slabs
    const slabHz = L / n / 2 + .35;
    for (let i = 0; i <= n; i++)
    {
        const t = i / n, x = a.x + ux * (2 + L * t), z = a.z + uz * (2 + L * t);
        const y = mix(startY + .15, moonletY + .2, sstep(0, 1, t)) + Math.sin(t * PI) * 1.2;
        const s = { i, pos: vec3(x, y, z), yaw, show: save.bridge ? 1 : 0 };
        s.solid = addSolid({ kind: 'box', x, z, hx: 1.15, hz: slabHz, yaw, top: y, floor: true, platformOnly: true, disabled: !save.bridge });
        bridgeSlabs.push(s);
    }
    new BridgeSlabs;
    // the floating islet itself: a grassy dome with a pool, and a crystal root below
    const pts = [], cols = [], idx = [], nrm = [];
    const RINGS = 14, SEG = 48;
    pts.push(vec3(m.x, moonletHeight(m.x, m.z), m.z)); cols.push(hsl(.6, .4, .2)); nrm.push(vec3(0, 1, 0));
    for (let r = 1; r <= RINGS; r++)
    for (let k = 0; k < SEG; k++)
    {
        const ang = k / SEG * TAU, rad = r / RINGS * (m.r + 1);
        const x = m.x + Math.cos(ang) * rad, z = m.z + Math.sin(ang) * rad;
        const y = r === RINGS ? moonletY - .6 : moonletHeight(x, z);
        pts.push(vec3(x, y, z));
        const g = fbm(x * .2, z * .2, 2);
        cols.push(rad < 4.5 ? hsl(.62, .3, .18) : hsl(.68 + g * .08, .4, .26 + g * .1));
        nrm.push(vec3(0, 1, 0));
    }
    const ring = (r)=> r === 0 ? 0 : 1 + (r - 1) * SEG;
    for (let k = 0; k < SEG; k++) idx.push(0, ring(1) + (k + 1) % SEG, ring(1) + k);
    for (let r = 1; r < RINGS; r++)
    for (let k = 0; k < SEG; k++)
    {
        const a0 = ring(r) + k, a1 = ring(r) + (k + 1) % SEG, b0 = ring(r + 1) + k, b1 = ring(r + 1) + (k + 1) % SEG;
        idx.push(a0, a1, b0, a1, b1, b0);
    }
    const top = triMesh(pts, idx, nrm, cols);
    top.computeNormals(true);
    top.doubleSided = true;
    obj3(vec3(), top, WHITE, { castShadow: false });
    const root = new Mesh();
    const prof = [[0, -14], [3, -10], [7, -5], [10, -2.5], [m.r + .9, -.6]];
    root.combine(buildLathe(prof, 18, false), undefined, hsl(.77, .45, .3));
    obj3(vec3(m.x, moonletY, m.z), root, WHITE, { emissive: .25 });
    for (let i = 0; i < 8; i++)
        obj3(vec3(m.x + rr(-5, 5), moonletY - rr(6, 12), m.z + rr(-5, 5)), buildSphere(1, 4, 2), hsl(.75, .7, .65),
            { emissive: .9, scale3D: vec3(rr(.6, 1.2), rr(2.5, 5), rr(.6, 1.2)), castShadow: false });
    // the moon pool
    const pool = obj3(vec3(m.x, moonletY - .25, m.z), discMesh(4.3), WHITE, { emissive: 1, castShadow: false });
    pool.shader = waterShader(m.x, m.z, 4.3, 1);
    new Light3D(vec3(m.x, moonletY + .6, m.z), 12, hsl(.13, .7, .65), 1.4);
    addSolid({ kind: 'circle', x: m.x, z: m.z, r: m.r + .4, topFn: moonletHeight, floor: true, platformOnly: true });
    addSolid({ kind: 'circle', x: m.x, z: m.z, r: 3.4, top: 99 });
    addFishingSpot({
        kind: 'moonlet', reach: 2.5, r: 2.4,
        pos: ()=> { const d = vec3(player.pos.x - m.x, 0, player.pos.z - m.z); const l = d.length() || 1; return vec3(m.x + d.x / l * 4.6, moonletY, m.z + d.z / l * 4.6); },
        center: ()=> vec3(m.x, moonletY, m.z),
        clamp: (p)=> { const d = vec3(p.x - m.x, 0, p.z - m.z); const l = min(d.length(), 3); const k = d.length() > .01 ? l / d.length() : 0; return vec3(m.x + d.x * k, moonletY - .22, m.z + d.z * k); },
    });
    // hammock between two crystal posts
    const hx = m.x + Math.cos(.8) * 9, hz = m.z + Math.sin(.8) * 9, hy = moonletHeight(hx, hz);
    const hyaw = rr(0, PI);
    const side = vec3(Math.cos(hyaw), 0, -Math.sin(hyaw));
    for (const s of [-1.7, 1.7])
    {
        const p = vec3(hx, hy, hz).add(side.scale(s));
        obj3(p.add(vec3(0, 1.1, 0)), buildSphere(1, 5, 3), hsl(.55, .7, .65), { scale3D: vec3(.45, 2.4, .45), emissive: .7 });
        addSolid({ kind: 'circle', x: p.x, z: p.z, r: .35, top: hy + 2.3 });
    }
    const hammock = new Mesh();
    for (let k = 0; k <= 8; k++)
    {
        const t = k / 8 - .5;
        hammock.combine(buildBox(vec3(.42, .05, 1.1)), vec3(t * 3.2, -Math.cos(t * PI) * .55 + .55, 0), hsl(.92, .4, .6));
    }
    obj3(vec3(hx, hy + .6, hz), hammock, WHITE, { rotation3D: vec3(0, Math.atan2(side.x, side.z) - PI / 2, 0) });
    addInteract({ pos: vec3(hx, hy, hz), r: 2.2, label: 'Lie in the hammock', when: ()=> true, act: ()=>
    {
        startSit(vec3(hx, hy + .05, hz), hyaw, { pose: 'lie', height: .15, out: 1.2, hint: `${MOBILE ? 'Use' : 'E'}|Get up`,
            onSit: ()=> { if (!save.hammock) { save.hammock = true; writeSave(); } toast('The whole sky turns slowly around you.'); },
            cam: ()=> ({ target: vec3(hx, hy + 1, hz), dist: 9, yaw: time * .08, pitch: .5 }) });
    } });
    // moonflowers
    for (let i = 0; i < 40; i++)
    {
        const ang = rr(0, TAU), rad = rr(5, m.r - .5), x = m.x + Math.cos(ang) * rad, z = m.z + Math.sin(ang) * rad;
        obj3(vec3(x, moonletHeight(x, z) + .3, z), buildSphere(.2, 6, 4), hsl(.13, .8, .78), { emissive: 1, castShadow: false });
    }
    PLACE_NAMES.push({ name: 'The Moonlet', sub: 'a piece of the island that wandered off', x: m.x, z: m.z, r: m.r + 1, zone: 'island' });
}
function bridgeAppear(i)
{
    if (i >= bridgeSlabs.length) return;
    const s = bridgeSlabs[i];
    s.show = max(s.show, .01);
    s.solid.disabled = false;
    bell(PENTA[i % PENTA.length], s.pos, .5);
    setTimeout(()=> bridgeAppear(i + 1), 160);
}
export function checkMoonletVisit()
{
    if (save.moonlet) return;
    if (dist2(player.pos.x, player.pos.z, P.moonlet.x, P.moonlet.z) < P.moonlet.r)
    {
        save.moonlet = true; writeSave();
        toast('You crossed to the Moonlet. Something big is moving in the pool.');
    }
}

// ================================================================ MUSHROOM HOLLOW
const mushrooms = [];
class MushroomCaps extends EngineObject3D
{
    constructor() { super(vec3(P.mushrooms.x, 0, P.mushrooms.z)); this.castShadow = true; }
    render3D()
    {
        if (!camNear(this.pos3D, 150)) return;
        for (const m of mushrooms)
        {
            const sq = m.solid.squash || 0;
            m.solid.squash = max(0, sq - timeDelta * 3);
            const wob = Math.sin(time * 18) * sq;
            const sy = 1 - sq * .35 + wob * .1, sx = 1 + sq * .2;
            render3D.drawMesh(SPH, mtx(undefined, m.top, vec3(), vec3(m.r * 2 * sx, m.r * .95 * sy, m.r * 2 * sx)), undefined, m.color);
            const e = render3D.emissive; render3D.emissive = 1;
            for (const d of m.dots) render3D.drawMesh(SPH_LO, mtx(undefined, m.top.add(vec3(d.x * m.r * sx, d.y * m.r * .45 * sy, d.z * m.r * sx)), vec3(), vec3(m.r * .22)), undefined, m.dot);
            render3D.emissive = e;
        }
    }
}
export function buildMushrooms()
{
    const cx = P.mushrooms.x, cz = P.mushrooms.z;
    // [dx, dz, cap radius, stem height]: three low caps you can jump onto from the ground, the rest are reached by bouncing
    const spots = [[0, 0, 2.2, 1], [4, 3, 1.7, 3.2], [-3.5, 4, 1.8, 2.6], [1, 7.5, 1.6, 4.4], [-5, -2, 2, 1], [6.5, -1.5, 1.5, 4.6], [3, -5, 1.9, 1.1], [-2, -6.5, 1.5, 3.6], [-6.5, 7, 1.4, 5.4], [8, 6, 1.4, 5.5]];
    spots.forEach(([dx, dz, r, h], i)=>
    {
        const x = cx + dx, z = cz + dz, y = heightAt(x, z);
        const hue = [.85, .55, .95, .48, .75][i % 5];
        obj3(vec3(x, y + h / 2, z), buildCylinder(.5 + r * .15, h, 10, true), hsl(.12, .2, .82));
        const top = vec3(x, y + h, z);
        const dots = [];
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rr(0, .5), rad = rr(.3, .75); dots.push(vec3(Math.cos(a) * rad, Math.sqrt(1 - rad * rad) * .9, Math.sin(a) * rad)); }
        const solid = addSolid({ kind: 'circle', x, z, r: r * .95, top: y + h + r * .44, platformOnly: true, bounce: true, hue });
        addSolid({ kind: 'circle', x, z, r: .55 + r * .15, top: y + h - .2 });
        mushrooms.push({ top, r, color: hsl(hue, .55, .55), dot: hsl(hue + .1, .8, .8), dots, solid });
        new Light3D(top.add(vec3(0, r * .5, 0)), 7, hsl(hue, .7, .6), .9);
    });
    new MushroomCaps;
    // little glowing ones around
    const small = new InstancedMesh3D(new Mesh().combine(buildCylinder(.08, .3, 6), vec3(0, .15, 0), hsl(.12, .2, .8)).combine(buildSphere(1, 8, 6), buildMatrix(vec3(0, .32, 0), undefined, vec3(.3, .14, .3)), WHITE), 60, undefined, WHITE);
    small.emissive = .8; small.castShadow = false;
    for (let i = 0; i < 60; i++)
    {
        const a = rr(0, TAU), rad = rr(2, 16), x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad, s = rr(.6, 1.6);
        small.setMatrixAt(i, buildMatrix(vec3(x, heightAt(x, z), z), vec3(0, rr(0, 3), 0), vec3(s)));
        small.setColorAt(i, hsl([.85, .55, .95, .48][i % 4], .7, .72));
    }
    PLACE_NAMES.push({ name: 'Mushroom Hollow', sub: 'jump on the caps', x: cx, z: cz, r: 12, zone: 'island' });
    addClearing(cx, cz, 15);
}

// ================================================================ NORTH OVERLOOK AND WISH LANTERNS
const WISHES = [
    'that the fish I let go find their way home', 'for one more night exactly like this one', 'that the snail gets where he is going',
    'to remember this dream when I wake', 'for warm tea and a window seat', 'that the whale finds another whale',
    'that every lost thing gets found', 'to see the island from very, very high up', 'for a bigger lantern',
    'that someone, somewhere, is looking at the same moon', 'for the cat to stay asleep on my bed', 'to learn the names of all the stars',
];
class WishLantern extends EngineObject3D
{
    constructor(pos, fromSave)
    {
        super(pos.copy());
        this.castShadow = false;
        this.t = fromSave ? rr(20, 200) : 0;
        this.ph = rr(0, TAU);
        this.hue = rr(.04, .12);
        this.start = pos.copy();
        this.drift = vec3(rr(-1, 1), 0, rr(-1, .2)).normalize();
    }
    update()
    {
        this.t += timeDelta;
        const t = this.t;
        this.pos3D = this.start.add(vec3(Math.sin(t * .5 + this.ph) * 1.5, t * 1.1, 0)).add(this.drift.scale(t * .9));
        if (this.pos3D.y > 420) this.destroy();
    }
    render3D()
    {
        const m = mtx(undefined, this.pos3D, vec3(Math.sin(time + this.ph) * .1, this.t * .2, 0));
        const e = render3D.emissive;
        render3D.emissive = 1.5;
        render3D.drawMesh(CYL, mtx(m, vec3(), vec3(), vec3(.5, .62, .5)), undefined, hsl(this.hue, .9, .64));
        render3D.drawMesh(CYL, mtx(m, vec3(0, .33, 0), vec3(), vec3(.56, .05, .56)), undefined, hsl(this.hue, .5, .5));
        render3D.emissive = e;
    }
}
export function buildOverlook()
{
    const o = P.overlook, y = heightAt(o.x, o.z);
    obj3(vec3(o.x, y - .25, o.z), buildCylinder(9, .6, 24), WHITE, { tileInfo: texStone });
    const out = Math.atan2(o.x, o.z);
    for (let k = -6; k <= 6; k++)
    {
        const a = out + k * .17, px = o.x + Math.sin(a) * 4.2, pz = o.z + Math.cos(a) * 4.2;
        obj3(vec3(px, y + .55, pz), buildCylinder(.12, 1.1, 6), hsl(.72, .2, .2));
        if (k < 6)
        {
            const a2 = out + (k + 1) * .17, qx = o.x + Math.sin(a2) * 4.2, qz = o.z + Math.cos(a2) * 4.2;
            const len = Math.hypot(qx - px, qz - pz);
            obj3(vec3((px + qx) / 2, y + 1.08, (pz + qz) / 2), buildBox(vec3(.08, .08, len)), hsl(.72, .2, .2), { rotation3D: vec3(0, Math.atan2(qx - px, qz - pz), 0) });
            addSolid({ kind: 'box', x: (px + qx) / 2, z: (pz + qz) / 2, hx: .1, hz: len / 2, yaw: Math.atan2(qx - px, qz - pz), top: y + 1.2 });
        }
    }
    // a table of paper lanterns
    const tx = o.x - Math.sin(out) * 1.8, tz = o.z - Math.cos(out) * 1.8;
    obj3(vec3(tx, y + .45, tz), buildCylinder(1.3, .9, 12), hsl(.75, .2, .35));
    for (let i = 0; i < 5; i++)
        obj3(vec3(tx + Math.cos(i * 1.3) * .4, y + 1.15, tz + Math.sin(i * 1.3) * .4), buildCylinder(.32, .42, 10), hsl(.08, .8, .62), { emissive: .9 });
    addSolid({ kind: 'circle', x: tx, z: tz, r: .7, top: y + .9 });
    addInteract({ pos: vec3(tx, y, tz), r: 2.4, label: 'Light a wish lantern', act: releaseLantern });
    new Light3D(vec3(tx, y + 1.6, tz), 8, hsl(.09, .9, .6), 1.4);
    for (let i = 0; i < min(save.lanterns, 30); i++) new WishLantern(vec3(o.x + rr(-6, 6), y + 2, o.z + rr(-6, 6)), true);
    PLACE_NAMES.push({ name: 'North Overlook', sub: 'send a wish up into the dark', x: o.x, z: o.z, r: 8, zone: 'island' });
    addClearing(o.x, o.z, 8);
    addClearing(o.x, o.z, 4.6, true);
}
function releaseLantern()
{
    const pick = [];
    while (pick.length < 3) { const w = WISHES[randInt(WISHES.length)]; if (!pick.includes(w)) pick.push(w); }
    say('A paper lantern', 'You light the little candle inside. What do you wish for?', pick.map((w)=> ({
        label: 'I wish ' + w,
        fn: ()=>
        {
            save.lanterns++; writeSave();
            player.pose = 'carry';
            setTimeout(()=>
            {
                const out = Math.atan2(P.overlook.x, P.overlook.z);
                new WishLantern(player.pos.add(vec3(Math.sin(out) * .6, 1.6, Math.cos(out) * .6)));
                playSfx('whoosh', player.pos, .6, .8);
                player.pose = 'free';
                toast(save.lanterns === 1 ? 'Your lantern drifts up toward the moon.' : `${save.lanterns} lanterns now float above the island.`);
            }, 500);
        },
    })));
}

// ================================================================ FALLEN STARS
const fallenStars = [];
let nextStarFall = 22;
class FallenStar extends EngineObject3D
{
    constructor(pos)
    {
        super(pos.copy());
        this.castShadow = false;
        this.t = 0;
        this.light = new Light3D(pos.add(vec3(0, 1, 0)), 10, hsl(.13, .8, .7), 2);
        this.light.glow = 2;
        this.addChild(this.light);
        this.light.pos3D = vec3(0, 1, 0);
        fallenStars.push(this);
    }
    update()
    {
        this.t += timeDelta;
        if (this.t > 150) return this.vanish();
        if (gameMode === 'play' && player.zone === 'island' && dist2(player.pos.x, player.pos.z, this.pos3D.x, this.pos3D.z) < 1.6 && abs(player.pos.y - this.pos3D.y) < 2.5)
        {
            const n = randInt(3, 8);
            save.stardust += n; writeSave();
            playSfx('collect', this.pos3D, 1);
            sparkleColumn(this.pos3D, hsl(.13, .9, .75), 36, 2);
            toast(`+${n} stardust`);
            this.vanish();
        }
    }
    vanish()
    {
        const i = fallenStars.indexOf(this);
        if (i >= 0) fallenStars.splice(i, 1);
        this.destroy();
    }
    render3D()
    {
        const p = this.pos3D, s = .55 + Math.sin(this.t * 4) * .05;
        const e = render3D.emissive; render3D.emissive = 2;
        const m = mtx(undefined, p.add(vec3(0, .7 + Math.sin(this.t * 2) * .15, 0)), vec3(0, this.t * 1.5, 0));
        for (let k = 0; k < 5; k++)
            render3D.drawMesh(CONE, mtx(m, vec3(), vec3(0, 0, k / 5 * TAU), vec3(.18, s, .12)).multiply(buildMatrix(vec3(0, .5, 0))), undefined, hsl(.13, .8, .75));
        render3D.drawMesh(SPH, mtx(m, vec3(), vec3(), vec3(.35, .35, .2)), undefined, hsl(.13, .6, .9));
        render3D.emissive = e;
    }
}
export class StarPillars extends EngineObject3D
{
    constructor() { super(vec3()); this.additive = true; this.castShadow = false; }
    render3D()
    {
        for (const f of fallenStars)
        {
            const p = f.pos3D, a = .35 * min(1, f.t) * (f.t > 140 ? (150 - f.t) / 10 : 1);
            render3D.drawRibbon([p, p.add(vec3(0, 18, 0)), p.add(vec3(0, 60, 0))], [1.2, .7, .2], undefined, [hsl(.13, .7, .8, a), hsl(.13, .7, .8, a * .5), hsl(.13, .7, .8, 0)]);
        }
    }
}
export function landFallenStar(pos)
{
    playSfx('collect', pos, .6, .5);
    burst(pos.add(vec3(0, .5, 0)), hsl(.13, .9, .75), 30, .12, .3);
    new FallenStar(pos);
}
function compassWord(dx, dz)
{
    const a = Math.atan2(dx, -dz);
    return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][(Math.round(a / (PI / 4)) + 8) % 8];
}
export function updateStarFall()
{
    if (gameMode !== 'play') return;
    nextStarFall -= timeDelta;
    if (rand() < timeDelta / 9) new ShootingStar();
    if (nextStarFall > 0 || fallenStars.length >= 3 || player.zone !== 'island') return;
    nextStarFall = rand(40, 75);
    for (let i = 0; i < 40; i++)
    {
        const a = rand(TAU), d = rand(22, 55);
        const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
        if (!insideIsland(x, z, 6) || dist2(x, z, P.pond.x, P.pond.z) < P.pond.r + 2 || !isClear(x, z, -1)) continue;
        if (solidsAt(x, z).some((s)=> solidContains(s, x, z, .8))) continue;
        new ShootingStar(vec3(x, heightAt(x, z), z));
        setTimeout(()=> toast(`A star fell to the ${compassWord(x - player.pos.x, z - player.pos.z)}.`), 2400);
        return;
    }
}

// ================================================================ CLOUD SHEEP
const sheep = [];
class CloudSheep extends EngineObject3D
{
    constructor(pos)
    {
        super(pos.copy());
        this.castShadow = true;
        this.yaw = rr(0, TAU);
        this.goal = pos.copy();
        this.wait = rr(0, 4);
        this.float = 0; this.floatT = 0;
        this.walk = 0;
        this.puffs = [];
        for (let i = 0; i < 9; i++) this.puffs.push(vec3(rr(-.45, .45), rr(.55, .95), rr(-.6, .6)));
        this.note = PENTA[randInt(PENTA.length)];
        sheep.push(this);
    }
    update()
    {
        const dt = timeDelta, c = P.pasture;
        this.floatT = max(0, this.floatT - dt);
        this.float = mix(this.float, this.floatT > 0 ? 3.2 : 0, min(1, dt * (this.floatT > 0 ? 1.5 : .8)));
        this.wait -= dt;
        const p = this.pos3D;
        if (this.wait < 0 && this.floatT <= 0)
        {
            const to = this.goal.subtract(p); to.y = 0;
            const d = to.length();
            if (d < .3) { this.wait = rr(2, 6); this.goal = vec3(c.x + rr(-16, 16), 0, c.z + rr(-14, 14)); }
            else
            {
                const step = to.normalize(1.1 * dt);
                this.yaw += wrapAngle(Math.atan2(-to.x, -to.z) - this.yaw) * min(1, dt * 3);
                this.pos3D = p.add(step);
                this.walk += dt * 6;
            }
        }
        // nudged by the mothling
        const dx = this.pos3D.x - player.pos.x, dz = this.pos3D.z - player.pos.z, d = Math.hypot(dx, dz);
        if (d < 1.3 && d > .01 && player.zone === 'island') this.pos3D = this.pos3D.add(vec3(dx / d, 0, dz / d).scale((1.3 - d) * .5));
        this.pos3D = vec3(this.pos3D.x, heightAt(this.pos3D.x, this.pos3D.z) + this.float + Math.sin(time * 2 + this.note) * this.float * .08, this.pos3D.z);
    }
    pet()
    {
        this.floatT = 3.2;
        bell(this.note + 5, this.pos3D, .5);
        playSfx('bleat', this.pos3D, .8, 1 + this.note / 24);
        burst(this.pos3D.add(vec3(0, 1, 0)), hsl(.9, .6, .8), 10, .04, .2);
        save.sheep++; writeSave();
        if (save.sheep === 1) toast('The cloud sheep floats up like a happy balloon.');
    }
    render3D()
    {
        if (!camNear(this.pos3D, 100)) return;
        const m = mtx(undefined, this.pos3D, vec3(0, this.yaw, 0));
        const wool = hsl(.74, .25, .9), face = hsl(.75, .35, .25);
        for (let k = 0; k < 4; k++)
        {
            const sx = k % 2 ? .25 : -.25, sz = k < 2 ? -.3 : .3;
            const swing = Math.sin(this.walk + k * PI) * .4 * (this.float < .1 ? 1 : 0);
            render3D.drawMesh(CAPS, mtx(m, vec3(sx, .25, sz), vec3(swing, 0, 0), vec3(.16, .32, .16)), undefined, face);
        }
        for (const p of this.puffs) render3D.drawMesh(SPH_LO, mtx(m, p, vec3(), vec3(.6)), undefined, wool);
        render3D.drawMesh(SPH, mtx(m, vec3(0, .82, -.72), vec3(), vec3(.38, .36, .42)), undefined, face);
        for (const s of [-1, 1]) render3D.drawMesh(SPH_LO, mtx(m, vec3(s * .22, .9, -.68), vec3(0, 0, s * .6), vec3(.18, .07, .1)), undefined, face);
        const e = render3D.emissive; render3D.emissive = 1;
        for (const s of [-1, 1]) render3D.drawMesh(SPH_LO, mtx(m, vec3(s * .1, .88, -.9), vec3(), vec3(.05)), undefined, WHITE);
        render3D.emissive = e;
    }
}
export function buildSheep()
{
    for (let i = 0; i < 6; i++)
    {
        const x = P.pasture.x + rr(-12, 12), z = P.pasture.z + rr(-10, 10);
        const s = new CloudSheep(vec3(x, heightAt(x, z), z));
        addInteract({ pos: ()=> s.pos3D, r: 2, dy: 4, label: 'Pet the cloud sheep', act: ()=> { moth.reach = 1; s.pet(); } });
    }
    PLACE_NAMES.push({ name: 'Cloudsheep Meadow', sub: 'they are softer than they look', x: P.pasture.x, z: P.pasture.z, r: 16, zone: 'island' });
    addClearing(P.pasture.x, P.pasture.z, 22);
}

// ================================================================ OBSERVATORY: TELESCOPE AND CONSTELLATIONS
export const CONSTELLATIONS = [
    { id: 'kettle', name: 'The Kettle', desc: 'A kettle that has been about to boil for ten thousand years.', az: .4, el: .55,
        pts: [[-1, -.6], [1, -.6], [1.1, .4], [.5, .8], [-.5, .8], [-1.1, .4], [-1.8, .9], [.1, 1.2]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [5, 6], [3, 7], [4, 7]] },
    { id: 'moth', name: 'The Moth', desc: 'Someone up there carries a lantern too.', az: 2.3, el: .7,
        pts: [[0, -1], [0, 0], [0, .9], [-1.4, .9], [-1.2, -.4], [1.4, .9], [1.2, -.4], [-.4, 1.6], [.4, 1.6]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 1], [1, 5], [5, 6], [6, 1], [2, 7], [2, 8]] },
    { id: 'cat', name: 'The Sleeping Cat', desc: 'Curled up in the same warm spot since the beginning of time.', az: 4.0, el: .42,
        pts: [[-1.4, 0], [-.6, .6], [.4, .7], [1.3, .2], [1.2, -.5], [.2, -.6], [-1.6, .5], [-1.2, .55]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [6, 7], [7, 1]] },
    { id: 'hook', name: 'The Fishhook', desc: 'Old fishers say it points toward the Void Pier.', az: 5.4, el: .5,
        pts: [[0, 1.6], [0, .6], [0, -.4], [-.3, -1.1], [-1, -1.2], [-1.3, -.6], [-1.05, -.3]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] },
];
for (const c of CONSTELLATIONS)
{
    const dir = vec3(Math.sin(c.az) * Math.cos(c.el), Math.sin(c.el), -Math.cos(c.az) * Math.cos(c.el));
    const right = vec3(dir.z, 0, -dir.x).normalize(), up = right.cross(dir).normalize().scale(-1);
    c.dir = dir;
    c.stars = c.pts.map(([x, y])=> dir.add(right.scale(x * .07)).add(up.scale(y * .07)).normalize());
}
let scope = null;
class ConstellationSky extends EngineObject3D
{
    constructor() { super(vec3()); this.additive = true; this.castShadow = false; }
    render3D()
    {
        const cam = render3D.camera.pos, R = 640;
        for (const c of CONSTELLATIONS)
        {
            const found = save.sky[c.id];
            const focus = scope && scope.focus === c ? scope.focusT : 0;
            for (const s of c.stars) render3D.drawSoftDisc(cam.add(s.scale(R)), (scope ? 3 : 5.5) + focus * 2, hsl(.6, .3, 1, .7 + Math.sin(time * 2 + s.x * 30) * .2));
            const la = found ? .28 : focus * .5;
            if (la > 0)
                for (const [a, b] of c.lines)
                    render3D.drawLine(cam.add(c.stars[a].scale(R)), cam.add(c.stars[b].scale(R)), scope ? .8 : 1.6, hsl(.55, .6, .85, la));
        }
    }
}
export function buildTelescope()
{
    const t = P.telescope, y = heightAt(t.x, t.z);
    obj3(vec3(t.x, y - .2, t.z), buildCylinder(7, .5, 20), WHITE, { tileInfo: texStone });
    const brass = hsl(.11, .55, .5);
    for (let k = 0; k < 3; k++)
    {
        const a = k / 3 * TAU;
        obj3(vec3(t.x + Math.cos(a) * .45, y + .8, t.z + Math.sin(a) * .45), buildCylinder(.07, 1.7, 6), hsl(.75, .2, .25),
            { rotation3D: vec3(Math.sin(a) * .25, 0, -Math.cos(a) * .25) });
    }
    SCOPE.base = vec3(t.x, y + 1.65, t.z);
    new TelescopeTube();
    addSolid({ kind: 'circle', x: t.x, z: t.z, r: .7, top: y + 2 });
    addInteract({ pos: vec3(t.x, y, t.z), r: 2.3, label: 'Look through the telescope', act: startTelescope });
    new ConstellationSky();
    PLACE_NAMES.push({ name: 'Observatory Hill', sub: 'the stars are closer up here', x: t.x, z: t.z, r: 8, zone: 'island' });
    addClearing(t.x, t.z, 7);
    addClearing(t.x, t.z, 3.6, true);
}
const SCOPE = { yaw: .4, pitch: .6 };
class TelescopeTube extends EngineObject3D
{
    constructor() { super(SCOPE.base.copy()); this.castShadow = true; }
    render3D()
    {
        const m = mtx(undefined, SCOPE.base, vec3(SCOPE.pitch, SCOPE.yaw, 0));
        render3D.drawMesh(CYL, mtx(m, vec3(0, 0, -.5), vec3(PI / 2, 0, 0), vec3(.34, 2.2, .34)), undefined, hsl(.11, .55, .5));
        render3D.drawMesh(CYL, mtx(m, vec3(0, 0, -1.55), vec3(PI / 2, 0, 0), vec3(.44, .25, .44)), undefined, hsl(.11, .6, .6));
        render3D.drawMesh(CYL, mtx(m, vec3(0, 0, .65), vec3(PI / 2, 0, 0), vec3(.16, .3, .16)), undefined, hsl(.75, .2, .25));
        render3D.drawMesh(SPH_LO, mtx(m, vec3(), vec3(), vec3(.3)), undefined, hsl(.75, .2, .25));
    }
}
function startTelescope()
{
    scope = { yaw: SCOPE.yaw, pitch: SCOPE.pitch, fov: PI / 9, focus: null, focusT: 0, whaleT: 0 };
    player.pose = 'look';
    const t = P.telescope;
    player.yaw = Math.atan2(-(t.x - player.pos.x), -(t.z - player.pos.z));
    $('scope').hidden = false;
    $('scopeHint').textContent = MOBILE ? 'Drag to look around. Tap Jump to step back.' : 'Drag, or use the arrow keys, to look around. Scroll to zoom. Q to step back.';
    setActivity({
        name: 'telescope', ownsPhysics: false, lockCamera: true,
        update: updateTelescope,
        cancel: endTelescope,
        hint: ()=> '',
        cam: ()=>
        {
            const dir = vec3(-Math.sin(scope.yaw) * Math.cos(scope.pitch), Math.sin(scope.pitch), -Math.cos(scope.yaw) * Math.cos(scope.pitch));
            const eye = SCOPE.base.add(vec3(0, .3, 0));
            return { pos: eye, look: eye.add(dir.scale(50)), fov: scope.fov, snap: 12 };
        },
    });
}
function endTelescope()
{
    scope = null; setActivity(null); player.pose = 'free';
    $('scope').hidden = true;
}
function updateTelescope()
{
    const dt = timeDelta;
    if (mouseIsDown(0) && pointerOnCanvas) { scope.yaw += mouseDeltaScreen.x * .0016 * scope.fov; scope.pitch = clamp(scope.pitch + mouseDeltaScreen.y * .0016 * scope.fov, .05, 1.45); }
    const k = input.move(), rs = gamepadStick(1);
    scope.yaw -= (k.x + rs.x) * dt * scope.fov * 1.2;
    scope.pitch = clamp(scope.pitch + (k.y + rs.y) * dt * scope.fov * 1.2, .05, 1.45);
    if (mouseWheel) scope.fov = clamp(scope.fov * (1 + mouseWheel * .12), PI / 28, PI / 5);
    SCOPE.yaw = scope.yaw; SCOPE.pitch = scope.pitch;
    const dir = vec3(-Math.sin(scope.yaw) * Math.cos(scope.pitch), Math.sin(scope.pitch), -Math.cos(scope.yaw) * Math.cos(scope.pitch));
    let best = null, bestDot = Math.cos(.09);
    for (const c of CONSTELLATIONS) { const d = dir.dot(c.dir); if (d > bestDot) { bestDot = d; best = c; } }
    if (best !== scope.focus) { scope.focus = best; scope.focusT = 0; }
    if (best)
    {
        scope.focusT = min(1, scope.focusT + dt / 1.3);
        if (scope.focusT >= 1 && !save.sky[best.id])
        {
            save.sky[best.id] = true; writeSave();
            [0, 7, 12, 16].forEach((n, i)=> setTimeout(()=> bell(n + 7, undefined, .45), i * 130));
            toast(`You found a constellation: ${best.name}. ${best.desc}`, 5200);
        }
    }
    // the whale, if it is in view
    const w = whale.pos3D.subtract(render3D.camera.pos).normalize();
    if (w.dot(dir) > Math.cos(scope.fov * .45))
    {
        scope.whaleT += dt;
        if (scope.whaleT > 1 && !save.whale)
        {
            save.whale = true; writeSave();
            toast('It is a whale made of starlight, as big as a hill. It looks right back at you.', 5200);
            playSfx('whale', undefined, .9);
        }
    }
    if (input.back() || input.act() || (MOBILE && touchState.jump)) { clearTouchPresses(); endTelescope(); }
}

// ================================================================ THE VOID PIER
export function buildPier()
{
    const a = P.pierBase, b = P.pierTip;
    const y = heightAt(a.x, a.z) + .35;
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const ux = dx / L, uz = dz / L;
    const deck = new Mesh();
    for (let s = 0; s < L; s += .55)
        deck.combine(buildBox(vec3(2.8, .12, .5)), buildMatrix(vec3(rr(-.05, .05), 0, s - L / 2), vec3(0, rr(-.02, .02), 0)), hsl(.75, .15, rr(.38, .48)));
    for (let s = 0; s < L; s += 3.2)
        for (const k of [-1.25, 1.25])
        {
            deck.combine(buildCylinder(.22, 5, 6), vec3(k, -2.4, s - L / 2), hsl(.75, .2, .25));
            deck.combine(buildCylinder(.12, 1.1, 6), vec3(k, .6, s - L / 2), hsl(.75, .2, .25));
        }
    for (const k of [-1.25, 1.25]) deck.combine(buildBox(vec3(.1, .1, L)), vec3(k, 1.12, 0), hsl(.75, .2, .3));
    obj3(vec3((a.x + b.x) / 2, y, (a.z + b.z) / 2), deck, WHITE, { rotation3D: vec3(0, yaw, 0) });
    addSolid({ kind: 'box', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, hx: 1.25, hz: L / 2 + .2, yaw, top: y + .06, floor: true, platformOnly: true, wood: true });
    for (const k of [-1.32, 1.32])
        addSolid({ kind: 'box', x: (a.x + b.x) / 2 + Math.cos(yaw) * k, z: (a.z + b.z) / 2 - Math.sin(yaw) * k, hx: .08, hz: L / 2, yaw, top: y + 1.2 });
    // end-of-pier lamp
    const lp = vec3(b.x - ux * .4 + Math.cos(yaw) * 1.25, y, b.z - uz * .4 - Math.sin(yaw) * 1.25);
    obj3(lp.add(vec3(0, 1.4, 0)), buildCylinder(.1, 2.8, 6), hsl(.72, .2, .16));
    obj3(lp.add(vec3(0, 2.9, 0)), buildSphere(.32, 10, 8), hsl(.78, .8, .75), { emissive: 1.6 });
    const L3 = new Light3D(lp.add(vec3(0, 2.9, 0)), 10, hsl(.78, .7, .7), 1.6); L3.glow = 1.5;
    const tip = vec3(b.x - ux * 1.2, y + .06, b.z - uz * 1.2);
    addFishingSpot({
        kind: 'void', reach: 11, yaw: Math.atan2(-ux, -uz), r: 2.6, // face out along the pier, into open sky
        pos: ()=> tip,
        center: ()=> tip.add(vec3(ux, 0, uz).scale(8)),
        clamp: (p)=>
        {
            const d = vec3(p.x - tip.x, 0, p.z - tip.z);
            const along = max(3, d.dot(vec3(ux, 0, uz)));
            const across = clamp(d.dot(vec3(Math.cos(yaw), 0, -Math.sin(yaw))), -4, 4);
            return tip.add(vec3(ux, 0, uz).scale(along)).add(vec3(Math.cos(yaw), 0, -Math.sin(yaw)).scale(across)).add(vec3(0, -1.4, 0));
        },
    });
    PLACE_NAMES.push({ name: 'The Void Pier', sub: 'fish in the open sky', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: L / 2 + 2, zone: 'island' });
    addClearing(a.x, a.z, 6);
}
export function buildPondFishing()
{
    const c = P.pond, edge = c.r - 1.1;
    addSolid({ kind: 'circle', x: c.x, z: c.z, r: edge - .35, top: 99 });
    addFishingSpot({
        kind: 'pond', reach: 4.5, r: 1.9,
        pos: ()=> { const d = vec3(player.pos.x - c.x, 0, player.pos.z - c.z); const l = d.length() || 1; return vec3(c.x + d.x / l * (edge + .1), WATER_Y + .3, c.z + d.z / l * (edge + .1)); },
        center: ()=> vec3(c.x, WATER_Y, c.z),
        clamp: (p)=> { const d = vec3(p.x - c.x, 0, p.z - c.z); const l = d.length(); const k = l > edge - 1.2 ? (edge - 1.2) / l : 1; return vec3(c.x + d.x * k, WATER_Y, c.z + d.z * k); },
    });
}
