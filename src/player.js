'use strict';

// ================================================================ THE MOTHLING
// a small moth sprite in a scarf who carries its own lantern
const OUTFITS = [
    { name: 'Dusk Lilac', body: hsl(.74, .32, .7), fluff: hsl(.11, .45, .9), wing: hsl(.72, .32, .76), spot: hsl(.55, .8, .66), scarf: hsl(.64, .55, .42), ant: hsl(.12, .55, .78) },
    { name: 'Moon Pearl', body: hsl(.65, .14, .86), fluff: hsl(.6, .2, .96), wing: hsl(.62, .22, .88), spot: hsl(.8, .6, .7), scarf: hsl(.95, .5, .58), ant: hsl(.6, .3, .9) },
    { name: 'Ember Rose', body: hsl(.97, .38, .7), fluff: hsl(.08, .6, .88), wing: hsl(.93, .42, .74), spot: hsl(.12, .9, .62), scarf: hsl(.75, .5, .4), ant: hsl(.1, .7, .75) },
    { name: 'Teal Tide', body: hsl(.5, .32, .62), fluff: hsl(.14, .4, .9), wing: hsl(.47, .38, .7), spot: hsl(.85, .7, .7), scarf: hsl(.08, .6, .52), ant: hsl(.45, .5, .8) },
    { name: 'Starless', body: hsl(.72, .25, .3), fluff: hsl(.72, .2, .78), wing: hsl(.7, .3, .32), spot: hsl(.13, .95, .62), scarf: hsl(.13, .8, .55), ant: hsl(.13, .8, .7) },
    { name: 'Honeyglow', body: hsl(.11, .5, .68), fluff: hsl(.12, .3, .95), wing: hsl(.1, .55, .72), spot: hsl(.6, .8, .62), scarf: hsl(.6, .5, .42), ant: hsl(.1, .6, .6) },
];
let SPH, SPH_LO, CAPS, TORUS, CYL, CONE, BOXM;
function buildPartMeshes()
{
    SPH = buildSphere(1, 18, 12, true);
    SPH_LO = buildSphere(1, 10, 7, true);
    CAPS = buildCapsule(.5, 1, 10, 4, true); // scale by (2*diameter, length, 2*diameter)
    TORUS = buildTorus(1, .34, 22, 10, true);
    CYL = buildCylinder(1, 1, 10, true);
    CONE = buildCone(1, 1, 10, true);
    BOXM = buildBox(1);
}

const player = {
    pos: vec3(), vel: vec3(), yaw: 0, onGround: true, zone: 'island',
    glide: false, groundY: 0, lastSafe: vec3(), standing: undefined, airTime: 0, bounceChain: 0,
    hold: 'lantern', pose: 'free', poseT: 0, lockMove: false, speed: 0, fallTimer: 0,
};
// a pose the mothling eases toward
const POSE = { legAmp: 0, legPitch: 0, armR: 0, armL: 0, armRY: 0, armLY: 0, wingOpen: 0, flap: 0, flapSpeed: 0, lean: 0, drop: 0, lie: 0, headTilt: 0, tuck: 0 };

class Mothling extends EngineObject3D
{
    constructor()
    {
        super(vec3());
        this.castShadow = true;
        this.p = { ...POSE };
        this.walkPhase = 0;
        this.blink = 0;
        this.blinkTimer = 2;
        this.ant = [vec3(), vec3()];      // antenna tip lag
        this.antVel = [vec3(), vec3()];
        this.scarf = [[], []];
        this.scarfReady = false;
        this.lanternSwing = 0; this.lanternVel = 0;
        this.stretch = 0; this.stretchTimer = 6;
        this.reach = 0;
        this.handPos = vec3(); this.hipPos = vec3();
        this.light = new Light3D(vec3(), 8.5, hsl(.11, .85, .66), 1.7);
        this.light.glow = .9; this.light.glowFalloff = 1.8;
        this.outfitMix = 1;
    }
    get outfit() { return OUTFITS[save.outfit % OUTFITS.length]; }
    target()
    {
        const t = { ...POSE }, sp = player.speed;
        const mode = player.pose;
        if (mode === 'free')
        {
            if (!player.onGround)
            {
                t.wingOpen = 1; t.flapSpeed = player.glide ? 26 : 12; t.flap = player.glide ? .55 : .3;
                t.tuck = .6; t.lean = player.glide ? .25 : .1; t.armR = -.6; t.armL = -.6;
            }
            else if (sp > .3)
            {
                const run = clamp((sp - 4) / 3);
                t.legAmp = mix(.55, .85, run); t.lean = mix(.08, .22, run);
                t.wingOpen = run * .25; t.flap = run * .12; t.flapSpeed = 14;
                t.armL = .1;
            }
            else
            {
                t.wingOpen = this.stretch; t.flap = this.stretch * .25; t.flapSpeed = 6;
            }
        }
        else if (mode === 'sit') { t.legPitch = -1.4; t.drop = .27; t.armR = -.2; t.armL = .2; }
        else if (mode === 'swing') { t.legPitch = -1.3 + Math.sin(time * 3) * .1; t.drop = .27; t.armR = -2.6; t.armL = -2.6; t.armRY = .2; t.armLY = -.2; t.wingOpen = clamp(abs(swingState?.vel || 0) * .6); t.flap = .2; t.flapSpeed = 8; }
        else if (mode === 'fish') { t.armR = -1.1; t.armL = -1.1; t.armRY = .35; t.armLY = -.45; t.lean = .05; }
        else if (mode === 'reel') { t.armR = -1.25 + Math.sin(time * 18) * .08; t.armL = -1.25; t.armRY = .35; t.armLY = -.45; t.lean = -.12; t.legPitch = .15; }
        else if (mode === 'cheer') { t.armR = -2.8; t.armL = -2.8; t.wingOpen = 1; t.flap = .4; t.flapSpeed = 10; t.drop = -.05 - abs(Math.sin(time * 8)) * .08; }
        else if (mode === 'lie') { t.lie = 1; t.legPitch = -.2; t.armR = -.3; t.armL = -.3; }
        else if (mode === 'cup') { t.armR = -1.7; t.armRY = .7; t.headTilt = -.15; }
        else if (mode === 'book') { t.armR = -1.2; t.armL = -1.2; t.armRY = .55; t.armLY = -.55; t.headTilt = .25; }
        else if (mode === 'look') { t.headTilt = -.55; t.armR = -1.5; t.armL = -1.3; t.armRY = .3; t.armLY = -.3; }
        else if (mode === 'chime') { t.armR = -1.4 + Math.sin(time * 9) * .25; t.armRY = .2; }
        else if (mode === 'pet') { t.armR = -1.3 + Math.sin(time * 7) * .2; t.armRY = .25; t.lean = .15; }
        else if (mode === 'carry') { t.armR = -2.4; t.armL = -2.4; t.armRY = .25; t.armLY = -.25; t.wingOpen = .5; t.flap = .2; t.flapSpeed = 5; }
        t.armR += -this.reach * 1.3;
        return t;
    }
    update()
    {
        const dt = timeDelta;
        const t = this.target();
        const k = 1 - Math.exp(-dt * 10);
        for (const key in t) this.p[key] = mix(this.p[key], t[key], k);
        this.walkPhase += dt * (player.onGround ? player.speed * 2.4 : 0);
        this.blinkTimer -= dt;
        if (this.blinkTimer < 0) { this.blink = 1; this.blinkTimer = rand(2.5, 5.5); }
        this.blink = max(0, this.blink - dt * 7);
        this.stretchTimer -= dt;
        if (player.speed < .2 && this.stretchTimer < 0) { this.stretchTimer = rand(6, 12); this.stretchAnim = 1.4; }
        if (this.stretchAnim > 0) { this.stretchAnim -= dt; this.stretch = Math.sin(clamp(this.stretchAnim / 1.4) * PI); }
        else this.stretch = 0;
        this.reach = max(0, this.reach - dt * 2);
        this.warm = max(0, (this.warm || 0) - dt);
        // lantern sways with motion
        const acc = (player.speed - (this.lastSpeed || 0)) / max(dt, 1e-3);
        this.lastSpeed = player.speed;
        this.lanternVel += (-this.lanternSwing * 40 - this.lanternVel * 3 - acc * .08) * dt;
        this.lanternSwing += this.lanternVel * dt;
        this.lanternSwing = clamp(this.lanternSwing, -.9, .9);
        this.pos3D = player.pos.copy();
    }
    rootMatrix()
    {
        const p = this.p;
        const bob = player.onGround && player.pose === 'free' ? abs(Math.sin(this.walkPhase)) * .05 * p.legAmp + Math.sin(time * 2.2) * .01 : Math.sin(time * 2) * .01;
        const m = mtx(undefined, player.pos.add(vec3(0, bob - p.drop, 0)), vec3(0, player.yaw, 0));
        if (p.lie > .01) m.multiply(buildMatrix(vec3(0, .25 * p.lie, 0), vec3(-PI / 2 * p.lie, 0, 0)));
        m.multiply(buildMatrix(undefined, vec3(-p.lean + (player.extraPitch || 0), 0, Math.sin(this.walkPhase) * .04 * p.legAmp)));
        return m;
    }
    render3D()
    {
        const o = this.outfit, p = this.p;
        const R0 = this.rootMatrix();
        const draw = (mesh, m, c)=> render3D.drawMesh(mesh, m, undefined, c);
        const glow = (fn)=> { const e = render3D.emissive; render3D.emissive = 1; fn(); render3D.emissive = e; };

        // legs
        for (const s of [-1, 1])
        {
            const swing = Math.sin(this.walkPhase + (s > 0 ? 0 : PI)) * p.legAmp + p.legPitch - p.tuck * .7;
            const hip = mtx(R0, vec3(s * .12, .3, .02), vec3(swing, 0, 0));
            draw(CAPS, mtx(hip, vec3(0, -.1, 0), vec3(), vec3(.28, .24, .28)), o.body.scale(.8, 1));
            draw(SPH_LO, mtx(hip, vec3(0, -.22, -.04), vec3(), vec3(.17, .1, .24)), o.fluff.scale(.85, 1));
        }
        // body, belly, ruff
        const B = mtx(R0, vec3(0, .55, .02));
        draw(SPH, mtx(B, vec3(), vec3(), vec3(.62, .66, .56)), o.body);
        draw(SPH, mtx(B, vec3(0, -.06, -.2), vec3(), vec3(.42, .46, .2)), o.fluff);
        for (let i = 0; i < 3; i++) draw(SPH_LO, mtx(B, vec3(0, -.18 + i * .12, -.27), vec3(), vec3(.3 - i * .05, .03, .03)), o.body.scale(.85, 1));
        draw(TORUS, mtx(R0, vec3(0, .83, 0), vec3(.08, 0, 0), vec3(.62, .6, .58)), o.fluff);
        // head
        const H = mtx(R0, vec3(0, 1.03, -.02), vec3(p.headTilt, 0, 0));
        draw(SPH, mtx(H, vec3(), vec3(), vec3(.52, .5, .5)), o.body.lerp(WHITE, .12));
        draw(SPH_LO, mtx(H, vec3(0, .17, .02), vec3(), vec3(.36, .18, .34)), o.fluff);   // fluffy crown
        const eyeH = max(.02, .21 * (1 - this.blink));
        for (const s of [-1, 1])
        {
            draw(SPH, mtx(H, vec3(s * .12, 0, -.19), vec3(0, s * .25, 0), vec3(.17, eyeH, .1)), hsl(.7, .6, .1));
            draw(SPH_LO, mtx(H, vec3(s * .19, -.07, -.18), vec3(), vec3(.08, .05, .03)), hsl(.95, .6, .75));
        }
        if (this.blink < .5) glow(()=>
        {
            for (const s of [-1, 1])
            {
                draw(SPH_LO, mtx(H, vec3(s * .1, .05, -.25), vec3(), vec3(.05)), WHITE);
                draw(SPH_LO, mtx(H, vec3(s * .14, -.03, -.245), vec3(), vec3(.025)), hsl(.55, .8, .85));
            }
        });
        // arms and hands
        const hand = [];
        for (const s of [-1, 1])
        {
            const pitch = s > 0 ? p.armR : p.armL, yaw = s > 0 ? p.armRY : p.armLY;
            const swing = player.pose === 'free' && player.onGround ? -Math.sin(this.walkPhase + (s > 0 ? 0 : PI)) * p.legAmp * .6 : 0;
            const sh = mtx(R0, vec3(s * .27, .66, -.04), vec3(pitch + swing, yaw, s * .25));
            draw(CAPS, mtx(sh, vec3(0, -.12, 0), vec3(), vec3(.22, .26, .22)), o.body.scale(.9, 1));
            draw(SPH_LO, mtx(sh, vec3(0, -.26, 0), vec3(), vec3(.11)), o.fluff);
            hand.push(sh.transformPoint(vec3(0, -.28, 0)));
        }
        this.handPos = hand[1];
        this.handL = hand[0];
        this.hipPos = R0.transformPoint(vec3(.3, .45, .05));

        // wings: folded back at rest, spread and beating in the air
        const flap = Math.sin(time * p.flapSpeed) * p.flap;
        for (const s of [-1, 1])
        for (const lower of [0, 1])
        {
            const sweep = mix(1.15, .2, p.wingOpen) + lower * .25;
            const raise = mix(.15, .45, p.wingOpen) + flap * (lower ? .7 : 1) - lower * .55;
            const hinge = mtx(R0, vec3(s * .1, lower ? .58 : .78, .22), undefined, vec3(s, 1, 1));
            const W = mtx(hinge, vec3(), vec3(0, sweep, raise));
            const span = lower ? .5 : .68, tall = lower ? .38 : .52;
            draw(SPH, mtx(W, vec3(span * .48, lower ? -.05 : .06, 0), vec3(), vec3(span, tall, .035)), o.wing);
            draw(SPH_LO, mtx(W, vec3(span * .78, lower ? -.08 : .1, 0), vec3(), vec3(span * .35, tall * .45, .04)), o.wing.lerp(o.body, .35));
            glow(()=>
            {
                for (const z of [-.022, .022])
                    draw(SPH_LO, mtx(W, vec3(span * .55, lower ? -.06 : .07, z), vec3(), vec3(lower ? .1 : .15, lower ? .1 : .15, .01)), o.spot);
            });
        }

        // held things
        this.drawHeld(R0, draw, glow);

        // antennae and scarf are ribbons, drawn after the solid parts
        this.drawAntennae(H, o);
        this.drawScarf(R0, o);
    }
    drawHeld(R0, draw, glow)
    {
        const hold = player.hold;
        // lantern in hand, or hung at the hip while the hands are busy
        const lanternAt = hold === 'lantern' ? this.handPos : this.hipPos;
        const L = mtx(undefined, lanternAt, vec3(0, player.yaw, this.lanternSwing));
        draw(TORUS, mtx(L, vec3(0, -.02, 0), vec3(PI / 2, 0, 0), vec3(.1, .1, .05)), hsl(.1, .4, .35));
        draw(CONE, mtx(L, vec3(0, -.08, 0), vec3(), vec3(.16, .07, .16)), hsl(.1, .45, .32));
        draw(CYL, mtx(L, vec3(0, -.32, 0), vec3(), vec3(.16, .04, .16)), hsl(.1, .45, .32));
        draw(CYL, mtx(L, vec3(0, -.2, 0), vec3(), vec3(.12, .2, .12)), hsl(.12, .5, .5, 1));
        const flame = L.transformPoint(vec3(0, -.2, 0));
        glow(()=> draw(SPH_LO, mtx(L, vec3(0, -.2, 0), vec3(), vec3(.1, .14 + Math.sin(time * 13) * .01, .1)), hsl(.11, 1, .7)));
        this.light.pos3D = flame;
        this.light.intensity = (player.zone === 'house' ? 1.1 : 1.7) * (1 + Math.sin(time * 7) * .04 + Math.sin(time * 17) * .02) * (this.warm > 0 ? 1.5 : 1);
        this.light.radius = this.warm > 0 ? 11 : 8.5;

        if (hold === 'rod')
        {
            const base = this.handPos.lerp(this.handL, .5);
            const dir = vec3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
            const tip = base.add(dir.scale(1.8)).add(vec3(0, 1.5 + (fishing?.rodBend || 0), 0));
            this.rodTip = tip;
            render3D.drawLine(base, base.lerp(tip, .5), .05, hsl(.08, .45, .35));
            render3D.drawLine(base.lerp(tip, .5), tip, .03, hsl(.08, .4, .45));
        }
        else if (hold === 'cup')
        {
            const c = mtx(undefined, this.handPos.add(vec3(0, .04, 0)), vec3(0, player.yaw, 0));
            draw(CYL, mtx(c, vec3(), vec3(), vec3(.14, .14, .14)), hsl(.6, .25, .85));
            draw(TORUS, mtx(c, vec3(.08, 0, 0), vec3(0, 0, PI / 2), vec3(.08, .03, .08)), hsl(.6, .25, .85));
        }
        else if (hold === 'book')
        {
            const c = mtx(undefined, this.handPos.lerp(this.handL, .5).add(vec3(0, .08, 0)), vec3(-.6, player.yaw, 0));
            draw(BOXM, mtx(c, vec3(), vec3(), vec3(.36, .03, .26)), hsl(.95, .45, .4));
            draw(BOXM, mtx(c, vec3(0, .02, 0), vec3(), vec3(.34, .02, .25)), hsl(.13, .3, .9));
        }
        else if (hold === 'can')
        {
            const c = mtx(undefined, this.handPos, vec3(0, player.yaw, .5));
            draw(CYL, mtx(c, vec3(0, -.05, 0), vec3(), vec3(.2, .18, .2)), hsl(.45, .35, .5));
            draw(CYL, mtx(c, vec3(.15, -.02, 0), vec3(0, 0, -1), vec3(.04, .22, .04)), hsl(.45, .35, .5));
        }
    }
    drawAntennae(H, o)
    {
        const dt = timeDelta;
        for (let i = 0; i < 2; i++)
        {
            const s = i ? 1 : -1;
            const root = H.transformPoint(vec3(s * .09, .2, -.06));
            const rest = H.transformPoint(vec3(s * .34, .5, .12));
            // spring the tip toward its rest spot so it bobs as you move
            if (!this.scarfReady || this.ant[i].distance(rest) > 1.5) { this.ant[i] = rest.copy(); this.antVel[i] = vec3(); }
            const f = rest.subtract(this.ant[i]).scale(120).subtract(this.antVel[i].scale(9));
            this.antVel[i] = this.antVel[i].add(f.scale(dt));
            this.ant[i] = this.ant[i].add(this.antVel[i].scale(dt));
            const t2 = this.ant[i];
            const mid = root.lerp(t2, .5).add(vec3(0, .07, 0));
            const pts = [root, root.lerp(mid, .6), mid, mid.lerp(t2, .5), t2];
            render3D.drawRibbon(pts, [.015, .035, .085, .11, .03], undefined, o.ant.scale(.7, 1));
        }
    }
    drawScarf(R0, o)
    {
        const dt = min(timeDelta, 1 / 30);
        for (let i = 0; i < 2; i++)
        {
            const s = i ? 1 : -1;
            const anchor = R0.transformPoint(vec3(s * .1, .8, .26));
            const chain = this.scarf[i];
            if (!this.scarfReady || chain.length === 0 || chain[0].p.distance(anchor) > .8)
            {
                chain.length = 0;
                for (let k = 0; k < 6; k++) chain.push({ p: anchor.add(vec3(0, -k * .07, k * .05)), o: anchor.add(vec3(0, -k * .07, k * .05)) });
            }
            chain[0].p = anchor; chain[0].o = anchor;
            const wind = vec3(Math.sin(time * 1.3 + i) * .4, 0, Math.cos(time * .9) * .3);
            for (let k = 1; k < chain.length; k++)
            {
                const c = chain[k];
                const v = c.p.subtract(c.o).scale(.92);
                c.o = c.p;
                c.p = c.p.add(v).add(vec3(0, -6 * dt * dt, 0)).add(wind.scale(dt * dt * 4));
            }
            for (let it = 0; it < 3; it++)
            for (let k = 1; k < chain.length; k++)
            {
                const a = chain[k - 1], b = chain[k];
                const d = b.p.subtract(a.p), L = d.length() || 1e-4, seg = .085;
                const fix = d.scale((L - seg) / L);
                if (k === 1) b.p = b.p.subtract(fix);
                else { a.p = a.p.add(fix.scale(.5)); b.p = b.p.subtract(fix.scale(.5)); }
                // keep tails off the ground
                if (b.p.y < player.pos.y + .1) b.p = vec3(b.p.x, player.pos.y + .1, b.p.z);
            }
            const pts = chain.map((c)=> c.p);
            render3D.drawRibbon(pts, pts.map((_, k)=> .11 - k * .01), undefined, o.scarf.scale(.85, 1));
        }
        this.scarfReady = true;
    }
}
let moth;
