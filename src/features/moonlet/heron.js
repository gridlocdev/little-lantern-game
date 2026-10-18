// Ardea, the night heron who fishes the moon pool: tall and still at the water's edge in a long patched coat and a
// mustard scarf, a bamboo rod out over the pool and her line down to an amber bobber. Behind her, the camp of someone
// who has been out here a long time: a little tent, a bedroll, a stool with a thermos on it, and an empty bucket.
//
// Left alone she watches the bobber, and now and then nods off and jolts awake, reels in and casts again, sighs, or
// looks up at the sky. Come near and she turns her head to you (and if she was dozing, she startles awake). Talk to her
// and she says a few short sentences: a meeting, then a fishing tip each time, and something else once you have caught
// the whale's calf she has been waiting for.
import { EngineObject3D, Light3D, PI, WHITE, clamp, hsl, max, min, rand, render3D, time, timeDelta, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { HERON_CALF, HERON_MEET, HERON_NAME, HERON_STRANGER, HERON_TIPS } from './lines-data.js';
import { events } from '../../game/events.js';
import { addInteract } from '../../game/interact.js';
import { writeSave } from '../../game/state.js';
import { sstep, wrapAngle } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { BOXM, CAPS, CONE, CYL, SPH, SPH_LO, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { camNear, focusCamera } from '../../render/camera.js';
import { burst } from '../../render/particles.js';
import { say, setVoice } from '../../ui/dialog.js';
import { addSolid } from '../../world/collision.js';

const VOICE = .5;                       // low and unhurried
const ROD = { len: 2.7, rise: .6 };     // meters, and radians above level
const HANDS = vec3(0, 1.25, -.44);       // where she holds the rod, in her own frame (she faces -z)
const C = {
    leg: hsl(.13, .5, .55), coat: hsl(.68, .2, .44), back: hsl(.62, .12, .56), cap: hsl(.66, .35, .12),
    face: hsl(.6, .08, .86), beak: hsl(.62, .12, .26), eye: hsl(0, .8, .5), scarf: hsl(.12, .75, .55),
    rod: hsl(.13, .35, .55), node: hsl(.11, .35, .42), bobber: hsl(.09, .9, .6),
    patches: [hsl(.6, .2, .38), hsl(.75, .15, .4), hsl(.55, .18, .3)],
    tin: hsl(.6, .08, .5), wood: hsl(.08, .3, .33), canvas: hsl(.58, .2, .38), bedroll: hsl(.8, .18, .35), thermos: hsl(.45, .28, .35),
};
// what she does when nobody is talking to her, how long each takes, and how likely she is to do it next
const IDLES = { doze: { dur: 7, w: 3 }, recast: { dur: 3.2, w: 3 }, sigh: { dur: 3, w: 2 }, sky: { dur: 5.5, w: 2 } };
const JOLT = 5.2;       // seconds into a doze when she startles awake

class Heron extends EngineObject3D
{
    constructor(pos, yaw, bobber, ground)
    {
        super(pos);
        this.castShadow = true;
        this.yaw = yaw;
        this.home = bobber;             // where the bobber floats, more or less
        this.rest = bobber.copy();      // where it is floating now
        this.bob = bobber.copy();       // where it is this frame (in the air while she casts)
        this.look = 0;                  // how far her head has turned from the water toward you
        this.talking = false;
        this.blink = 0; this.nextBlink = 3;
        this.twitch = 0; this.nextTwitch = 8;   // now and then something nibbles
        this.idle = null; this.nextIdle = 6;
        this.pose = { nod: 0, up: 0, rise: 0, rod: 0, shut: 0 };   // what the idle is doing to her
        const frame = mtx(undefined, pos, vec3(0, yaw, 0));
        this.at = (local)=> frame.transformPoint(local);
        // her camp, set on the ground around her
        this.place = (local, turn = 0)=> { const p = this.at(local); return mtx(undefined, vec3(p.x, ground(p.x, p.z), p.z), vec3(0, yaw + turn, 0)); };
        this.props = { bucket: this.place(vec3(-.7, 0, -.05)), stool: this.place(vec3(.85, 0, .5), .4), tent: this.place(vec3(.3, 0, 2.6), .3), bedroll: this.place(vec3(-1.2, 0, 1.9), .2) };
        const t = this.props.tent.transformPoint(vec3());
        addSolid({ kind: 'circle', x: t.x, z: t.z, r: .75, top: t.y + 1 });
        this.light = new Light3D(this.at(vec3(.45, .6, -.3)), 6.5, hsl(.1, .8, .65), 1.7);
    }
    update()
    {
        const dt = timeDelta;
        this.nextBlink -= dt;
        if (this.nextBlink < 0) { this.blink = 1; this.nextBlink = rand(3, 7); }
        this.blink = max(0, this.blink - dt * 6);
        this.nextTwitch -= dt;
        if (this.nextTwitch < 0 && !this.idle) { this.twitch = 1; this.nextTwitch = rand(7, 20); }
        this.twitch = max(0, this.twitch - dt * 2.5);
        // she watches the bobber, and turns her head to you, slowly, when you are near
        const dx = player.pos.x - this.pos3D.x, dz = player.pos.z - this.pos3D.z;
        const near = player.zone === 'island' && dx * dx + dz * dz < 49 && Math.abs(player.pos.y - this.pos3D.y) < 3;
        const want = near ? clamp(wrapAngle(Math.atan2(-dx, -dz) - this.yaw), -1.2, 1.2) : Math.sin(time * .13) * .12;
        this.look += (want - this.look) * min(1, dt * (this.talking ? 4 : 1.6));
        this.updateIdle(dt, near);
    }
    updateIdle(dt, near)
    {
        const p = this.pose;
        if (!this.idle)
        {
            Object.assign(p, { nod: 0, up: 0, rise: 0, rod: 0, shut: 0 });
            this.bob = this.rest;
            this.nextIdle -= dt;
            if (this.nextIdle > 0 || near || this.talking) return;
            const names = Object.keys(IDLES), total = names.reduce((s, n)=> s + IDLES[n].w, 0);
            let r = rand(total), kind = names[0];
            for (const n of names) { r -= IDLES[n].w; if (r < 0) { kind = n; break; } }
            this.idle = { kind, t: 0 };
        }
        const id = this.idle, t = id.t += dt;
        if (id.kind === 'doze')
        {
            // the head sinks, the eyes close... and she jolts awake, sooner if you walk up
            if ((near || this.talking) && t < JOLT) id.t = JOLT;
            if (t < JOLT) { p.nod = sstep(.5, 4.5, t) * .6; p.shut = sstep(1.5, 4, t); }
            else
            {
                const u = t - JOLT;
                if (!id.jolted) { id.jolted = true; this.twitch = 1; playSfx('pop', this.pos3D, .3, .7); }
                p.nod = -.2 * max(0, 1 - u * 1.5); p.shut = 0; p.rise = .06 * max(0, 1 - u * 4);
            }
        }
        else if (id.kind === 'recast')
        {
            // reel in, lift the rod back, flick it forward, and the bobber arcs out to a new spot
            const tip = this.tip();
            if (!id.to) id.to = this.home.add(vec3(rand(-.5, .5), 0, rand(-.5, .5)));
            if (t < 1) { p.rod = sstep(0, 1, t) * .7; this.bob = this.rest.lerp(tip, sstep(0, 1, t)); }
            else if (t < 1.4) { p.rod = .7 - sstep(1, 1.4, t) * .85; this.bob = tip; if (!id.whoosh) { id.whoosh = true; playSfx('cast', this.pos3D, .35); } }
            else if (t < 2.2) { const k = (t - 1.4) / .8; p.rod = -.15 + k * .15; this.bob = tip.lerp(id.to, k).add(vec3(0, Math.sin(k * PI) * 1.2, 0)); }
            else { if (!id.plop) { id.plop = true; this.rest = id.to; playSfx('plop', id.to, .4); } this.bob = this.rest; p.rod = 0; }
        }
        else if (id.kind === 'sigh')
        {
            // a long breath in, shoulders up, and out, a little mist in the cold
            p.rise = Math.sin(PI * clamp(t / 1.6)) * .05;
            p.nod = -Math.sin(PI * clamp(t / IDLES.sigh.dur)) * .12;
            if (t > 1.7 && !id.mist) { id.mist = true; burst(this.headMatrix().transformPoint(vec3(0, -.02, -.45)), hsl(.6, .15, .9, .35), 6, .015, .08, .8); }
        }
        else if (id.kind === 'sky')
        {
            p.up = sstep(0, 1.5, t) * (1 - sstep(4, 5.5, t));   // looking up at the stars for a while
        }
        if (t >= IDLES[id.kind].dur) { this.idle = null; this.nextIdle = rand(5, 12); }
    }
    frame() { return mtx(undefined, this.pos3D.add(vec3(0, this.pose.rise, 0)), vec3(0, this.yaw, 0)); }
    headMatrix()
    {
        const p = this.pose, breathe = Math.sin(time * 1.1) * .01;
        const pitch = -.22 - (1 - min(1, Math.abs(this.look))) * .08 + p.nod - p.up * .9;
        return mtx(this.frame(), vec3(0, 2.02 + breathe - p.nod * .12, -.1 - p.nod * .06), vec3(pitch, this.look * (1 - p.up), 0));
    }
    rodDir() { const a = ROD.rise + this.pose.rod; return vec3(0, Math.sin(a), -Math.cos(a)); }
    tip() { return this.frame().transformPoint(HANDS.add(this.rodDir().scale(ROD.len - .3))); }
    render3D()
    {
        if (!camNear(this.pos3D, 80)) return;
        const draw = (mesh, m, c)=> render3D.drawMesh(mesh, m, undefined, c);
        const m = this.frame(), p = this.pose;
        const breathe = Math.sin(time * 1.1) * .01;
        // legs and feet stay on the ground when she starts
        const g = mtx(undefined, this.pos3D, vec3(0, this.yaw, 0));
        for (const s of [-1, 1])
        {
            draw(CYL, mtx(g, vec3(s * .1, .32 + p.rise / 2, 0), vec3(), vec3(.05, .64 + p.rise, .05)), C.leg);
            draw(SPH_LO, mtx(g, vec3(s * .1, .03, -.07), vec3(), vec3(.1, .035, .18)), C.leg);
        }
        // the long coat, flaring at the hem, with patches sewn on
        draw(CAPS, mtx(m, vec3(0, 1.06 + breathe, 0), vec3(), vec3(1.05, 1.15, .95)), C.coat);
        draw(CONE, mtx(m, vec3(0, .62, 0), vec3(), vec3(.68, .55, .6)), C.coat.scale(.9, 1));
        const patch = (at, r, c)=> draw(BOXM, mtx(m, at, r, vec3(.19, .16, .03)), c);
        patch(vec3(-.1, .8, -.25), vec3(0, 0, .15), C.patches[0]);
        patch(vec3(.04, 1.08, .25), vec3(0, 0, .1), C.patches[2]);
        patch(vec3(.27, .86, .02), vec3(0, PI / 2, .2), C.patches[1]);
        patch(vec3(-.27, 1.0, .04), vec3(0, PI / 2, -.15), C.patches[0]);
        draw(SPH, mtx(m, vec3(0, 1.58 + breathe, .03), vec3(), vec3(.52, .34, .48)), C.back);     // feathers at the shoulders
        // the mustard scarf, wound round and one end hanging down her front
        draw(TORUS, mtx(m, vec3(0, 1.76 + breathe, -.04), vec3(.2, 0, 0), vec3(.24, 1.1, .22)), C.scarf);
        draw(BOXM, mtx(m, vec3(.09, 1.56, -.25), vec3(-.12, 0, .06 + Math.sin(time * 1.4) * .04), vec3(.12, .34, .04)), C.scarf);
        // sleeves out to the rod, and the wingtips that hold it
        for (const s of [-1, 1])
        {
            draw(CAPS, mtx(m, vec3(s * .19, 1.38, -.24), vec3(.95, 0, -s * .25), vec3(.3, .46, .3)), C.coat);
            draw(SPH_LO, mtx(m, HANDS.add(vec3(s * .06, 0, s * .1)), vec3(), vec3(.1)), C.back);
        }
        // neck and head
        draw(CAPS, mtx(m, vec3(0, 1.84 + breathe, -.06), vec3(-.2 + p.nod * .5, 0, 0), vec3(.34, .32, .34)), C.face);
        const h = this.headMatrix();
        draw(SPH, mtx(h, vec3(), vec3(), vec3(.36, .32, .4)), C.face);
        draw(SPH, mtx(h, vec3(0, .07, .04), vec3(), vec3(.37, .22, .39)), C.cap);
        const shut = max(this.blink, p.shut);
        for (const s of [-1, 1])
        {
            draw(SPH_LO, mtx(h, vec3(s * .15, .01, -.1), vec3(), vec3(.07, .07 * (1 - shut * .9), .07)), C.eye);
            if (shut < .5) draw(SPH_LO, mtx(h, vec3(s * .17, .03, -.13), vec3(), vec3(.02)), WHITE);
        }
        const open = this.talking ? max(0, Math.sin(time * 9)) * max(0, Math.sin(time * 1.7)) * .22 : 0;
        draw(CONE, mtx(h, vec3(0, -.01, -.36), vec3(-PI / 2, 0, 0), vec3(.055, .42, .045)), C.beak);
        draw(CONE, mtx(h, vec3(0, -.03, -.33), vec3(-PI / 2 + open, 0, 0), vec3(.045, .34, .03)), C.beak);
        // the bamboo rod, in sections
        const dir = this.rodDir(), tilt = vec3(-(PI / 2 - ROD.rise - p.rod) - this.twitch * .05, 0, 0);
        for (let i = 0; i < 4; i++)
        {
            const a = HANDS.add(dir.scale(-.3 + i * ROD.len / 4)), mid = a.add(dir.scale(ROD.len / 8));
            draw(CYL, mtx(m, mid, tilt, vec3(.04 - i * .006, ROD.len / 4, .04 - i * .006)), C.rod);
            draw(TORUS, mtx(m, a, tilt, vec3(.024 - i * .003, .5, .024 - i * .003)), C.node);
        }
        // her line, down to the amber bobber riding the water (straighter while it flies)
        const floating = this.bob === this.rest;
        const bob = floating ? this.rest.add(vec3(0, Math.sin(time * 1.7) * .015 - this.twitch * .07, 0)) : this.bob;
        const tip = this.tip(), line = [];
        for (let k = 0; k <= 6; k++) line.push(tip.lerp(bob, k / 6).add(vec3(0, -Math.sin(k / 6 * PI) * (floating ? .2 : .03), 0)));
        render3D.drawRibbon(line, .012, undefined, hsl(.6, .1, .85, .6));
        draw(SPH_LO, mtx(undefined, bob.add(vec3(0, .03, 0)), vec3(), vec3(.08, .06, .08)), C.bobber);
        draw(SPH_LO, mtx(undefined, bob, vec3(), vec3(.08, .05, .08)), WHITE);
        // two white plumes trailing from the back of her head
        for (const s of [-1, 1])
        {
            const sway = Math.sin(time * 1.3 + s) * .03;
            const pts = [vec3(s * .03, .12, .17), vec3(s * .05 + sway, .03, .46), vec3(s * .06 + sway * 2, -.15, .66)].map((q)=> h.transformPoint(q));
            render3D.drawRibbon(pts, [.03, .022, .006], undefined, C.face);
        }
        this.renderCamp(draw);
    }
    renderCamp(draw)
    {
        const { bucket, stool, tent, bedroll } = this.props;
        // the lantern at her feet
        const g = mtx(undefined, this.pos3D, vec3(0, this.yaw, 0));
        const e = render3D.emissive; render3D.emissive = 1.3;
        const swing = Math.sin(time * 1.3) * .04;
        draw(SPH_LO, mtx(g, vec3(.45 + swing, .6, -.48), vec3(0, 0, swing), vec3(.16, .22, .16)), hsl(.08, .7, .7));
        render3D.emissive = e;
        draw(CYL, mtx(g, vec3(.45, .45, -.2), vec3(), vec3(.035, .9, .035)), C.wood);    // a crook stuck in the ground
        draw(CYL, mtx(g, vec3(.45, .9, -.34), vec3(PI / 2, 0, 0), vec3(.03, .3, .03)), C.wood);
        render3D.drawRibbon([vec3(.45, .9, -.48), vec3(.45 + swing, .74, -.48)].map((q)=> g.transformPoint(q)), .01, undefined, C.beak);
        // an empty bucket
        draw(CYL, mtx(bucket, vec3(0, .16, 0), vec3(), vec3(.32, .32, .32)), C.tin);
        draw(TORUS, mtx(bucket, vec3(0, .32, 0), vec3(), vec3(.33, .4, .33)), C.tin.scale(1.2, 1));
        draw(CYL, mtx(bucket, vec3(0, .3, 0), vec3(), vec3(.28, .02, .28)), hsl(.66, .3, .1));
        render3D.drawRibbon([vec3(-.16, .32, 0), vec3(-.1, .5, 0), vec3(.1, .5, 0), vec3(.16, .32, 0)].map((q)=> bucket.transformPoint(q)), .015, undefined, C.tin);
        // a stool, with a thermos and its cup on it
        for (let i = 0; i < 3; i++)
        {
            const a = i / 3 * PI * 2;
            draw(CYL, mtx(stool, vec3(Math.cos(a) * .12, .21, Math.sin(a) * .12), vec3(Math.sin(a) * .15, 0, -Math.cos(a) * .15), vec3(.035, .44, .035)), C.wood);
        }
        draw(CYL, mtx(stool, vec3(0, .43, 0), vec3(), vec3(.38, .05, .38)), C.wood.scale(1.15, 1));
        draw(CYL, mtx(stool, vec3(-.05, .59, 0), vec3(), vec3(.11, .28, .11)), C.thermos);
        draw(CYL, mtx(stool, vec3(-.05, .75, 0), vec3(), vec3(.1, .05, .1)), C.thermos.scale(.6, 1));
        draw(CYL, mtx(stool, vec3(.1, .49, .04), vec3(), vec3(.08, .07, .08)), C.thermos.scale(.8, 1));
        // a little A-frame tent with its ridge pole
        for (const s of [-1, 1])
            draw(BOXM, mtx(tent, vec3(s * .33, .45, 0), vec3(0, 0, s * -.95), vec3(1.11, .03, 1.3)), C.canvas.scale(s > 0 ? 1 : .85, 1));
        draw(CYL, mtx(tent, vec3(0, .9, 0), vec3(PI / 2, 0, 0), vec3(.05, 1.4, .05)), C.wood);
        // and a rolled bedroll, tied with two straps
        draw(CAPS, mtx(bedroll, vec3(0, .13, 0), vec3(PI / 2, 0, 0), vec3(.5, .8, .5)), C.bedroll);
        for (const z of [-.25, .25]) draw(TORUS, mtx(bedroll, vec3(0, .13, z), vec3(PI / 2, 0, 0), vec3(.14, .25, .14)), C.wood);
    }
}

/**
 * Puts Ardea and her camp at the pool's edge and lets you talk to her.
 * @param {{ pos: any, center: any, waterY: number, ground: (x: number, z: number)=> number, save: any }} where
 *   `save` is the moonlet's slice: heronMet, heronTip, calfCaught, heronThanked
 */
export function buildHeron({ pos, center, waterY, ground, save })
{
    const toPool = vec3(center.x - pos.x, 0, center.z - pos.z).normalize();
    const yaw = Math.atan2(-toPool.x, -toPool.z);
    const bobber = vec3(center.x - toPool.x * 2.3, waterY, center.z - toPool.z * 2.3);
    const heron = new Heron(pos, yaw, bobber, ground);
    addSolid({ kind: 'circle', x: pos.x, z: pos.z, r: .45, top: pos.y + 2.2 });
    setVoice(HERON_NAME, VOICE);
    setVoice(HERON_STRANGER, VOICE);
    events.on('fish-caught', ({ id })=> { if (id === 'calf' && !save.calfCaught) { save.calfCaught = true; writeSave(); } });
    addInteract({
        pos, r: 2.6, priority: .5, label: ()=> save.heronMet ? `Talk to ${HERON_NAME}` : 'Talk to the heron', when: ()=> true,
        act: async ()=>
        {
            player.yaw = Math.atan2(-(pos.x - player.pos.x), -(pos.z - player.pos.z));
            const look = focusCamera(pos.add(vec3(0, 1.7, 0)), { pull: .4, zoom: .84 });
            const who = save.heronMet ? HERON_NAME : HERON_STRANGER;
            let pages;
            if (!save.heronMet) { pages = HERON_MEET; save.heronMet = true; }
            else if (save.calfCaught && !save.heronThanked) { pages = HERON_CALF; save.heronThanked = true; }
            else pages = HERON_TIPS[save.heronTip++ % HERON_TIPS.length];
            writeSave();
            heron.talking = true;
            await say(who, pages);
            heron.talking = false;
            look.release();
        },
    });
    return heron;
}
