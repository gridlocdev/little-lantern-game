// Oswin the lantern snail. The first time you talk to him there is a cutscene; after that he offers a race or a chat.
import { EngineObject3D, Light3D, PI, WHITE, clamp, hsl, max, render3D, time, timeDelta, vec3 } from '../../platform/engine.js';
import { SNAIL_ASK, SNAIL_LINES } from './lines-data.js';
import { buildRace, race, startRace, updateRace } from './race.js';
import { save } from './save.js';
import { OSWIN_VOICE, playMeeting } from './scene.js';
import { addInteract } from '../../game/interact.js';
import { writeSave } from '../../game/state.js';
import { wrapAngle } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { CAPS, CYL, SPH, SPH_LO, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { camNear, focusCamera } from '../../render/camera.js';
import { burst } from '../../render/particles.js';
import { say, setVoice } from '../../ui/dialog.js';
import { addTodo } from '../../ui/journal.js';
import { addSolid } from '../../world/collision.js';
import { P } from '../../world/layout.js';
import { heightAt } from '../../world/terrain.js';

const NAME = 'Oswin the lantern snail';
let snailLine = 0;
class Snail extends EngineObject3D
{
    constructor(pos)
    {
        super(pos);
        this.castShadow = true;
        this.home = pos.copy();
        this.homeYaw = this.yaw = -2.4;
        this.light = new Light3D(pos.add(vec3(0, 1.1, 0)), 6, hsl(.5, .8, .6), 1.3);
        this.light.glow = 1;
        this.glow = 0;      // the shell flares when he says something that matters
        this.talk = 0;      // seconds of bobbing along to his own words
        this.wiggle = 0;    // a happy shimmy, 0..1
        this.speed = 0;     // m/s, while he races
        this.slide = 0;     // phase of his stretch, faster the faster he goes
        this.eyes = 0;      // how far his eyestalks have turned toward you
        this.trail = 0;
        /** @type {any} */ this.solid = null;   // his collision circle, off while he races
    }
    update()
    {
        const dt = timeDelta;
        this.glow = max(0, this.glow - dt * .8);
        this.talk = max(0, this.talk - dt);
        this.wiggle = max(0, this.wiggle - dt * .7);
        this.slide += dt * (1.3 + this.speed * 2.2);
        this.light.intensity = 1.3 + this.glow * 1.6;
        this.light.pos3D = this.pos3D.add(vec3(0, 1.1, 0));
        // the eyestalks follow you when you are near
        const dx = player.pos.x - this.pos3D.x, dz = player.pos.z - this.pos3D.z;
        const near = dx * dx + dz * dz < 64 && player.zone === 'island';
        const want = near ? clamp(wrapAngle(Math.atan2(-dx, -dz) - this.yaw), -.7, .7) : Math.sin(time * .4) * .25;
        this.eyes += (want - this.eyes) * Math.min(1, dt * 5);
        // a sparkly slime trail while he races
        this.trail -= dt * this.speed;
        if (this.speed > 1 && this.trail < 0)
        {
            this.trail = .7;
            const back = vec3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).scale(.9);
            burst(this.pos3D.add(back).add(vec3(0, .15, 0)), hsl(.5, .8, .7), 3, .02, .14, 1.2, .0005);
        }
    }
    render3D()
    {
        if (!camNear(this.pos3D, 90)) return;
        const t = time, m = mtx(undefined, this.pos3D, vec3(0, this.yaw, Math.sin(t * 18) * .08 * this.wiggle));
        const body = hsl(.58, .25, .62), shell = hsl(.82, .35, .45);
        const stretch = 1 + Math.sin(this.slide) * (.04 + Math.min(this.speed, 6) * .012);
        const bob = this.talk > 0 ? Math.abs(Math.sin(t * 11)) * .05 : 0;
        const hop = Math.abs(Math.sin(t * 9)) * .12 * this.wiggle;
        render3D.drawMesh(CAPS, mtx(m, vec3(0, .25, 0), vec3(PI / 2, 0, 0), vec3(.8, 1.5 * stretch, .55)), undefined, body);
        const head = mtx(m, vec3(0, .55 + bob + hop, -.65 * stretch), vec3(-bob * 2, this.eyes * .35, 0));
        render3D.drawMesh(SPH, mtx(head, vec3(), vec3(), vec3(.42)), undefined, body);
        render3D.drawMesh(SPH_LO, mtx(head, vec3(0, -.06, -.2), vec3(), vec3(.16, .04, .05)), undefined, hsl(.95, .4, .5));   // a mouth
        for (const s of [-1, 1])
        {
            // the stalks sway on their own, lean back as he speeds up and turn toward you
            const sway = Math.sin(t * 2.3 + s * 1.7) * .12 + Math.sin(t * 13) * .1 * this.wiggle;
            const stalk = mtx(head, vec3(s * .1, .18, -.05), vec3(.3 + sway + this.speed * .06, this.eyes * .5, s * (.2 + .1 * this.wiggle)));
            render3D.drawMesh(CYL, mtx(stalk, vec3(0, .2, 0), vec3(), vec3(.04, .4, .04)), undefined, body);
            render3D.drawMesh(SPH_LO, mtx(stalk, vec3(0, .42, 0), vec3(), vec3(.11)), undefined, hsl(.7, .5, .15));
            render3D.drawMesh(SPH_LO, mtx(stalk, vec3(.025, .45, -.07), vec3(), vec3(.035)), undefined, WHITE);
        }
        for (let i = 0; i < 4; i++)
            render3D.drawMesh(TORUS, mtx(m, vec3(0, .78 + i * .05 + hop * .5, .25), vec3(PI / 2, 0, 0), vec3(1.1 - i * .25, .9 - i * .2, 1.1 - i * .25)), undefined, shell.lerp(WHITE, i * .08));
        const e = render3D.emissive; render3D.emissive = 1.3 + this.glow;
        render3D.drawMesh(SPH_LO, mtx(m, vec3(0, .8 + hop * .5, .25), vec3(), vec3(.32 + Math.sin(t * 2) * .02 + this.glow * .05)), undefined, hsl(.5, .8, .7));
        render3D.emissive = e;
    }
}
function buildSnail()
{
    const x = P.snail.x, z = P.snail.z;
    const s = new Snail(vec3(x, heightAt(x, z), z));
    s.solid = addSolid({ kind: 'circle', x, z, r: .7, top: 1.2 });
    setVoice(NAME, OSWIN_VOICE);
    addInteract({ pos: vec3(x, heightAt(x, z), z), r: 2.6, label: 'Talk to Oswin', when: ()=> !race.on, act: async ()=>
    {
        player.yaw = Math.atan2(-(x - player.pos.x), -(z - player.pos.z));
        if (!save.met) return playMeeting(s, ()=> { save.met = true; writeSave(); });
        // the camera leans toward him while he talks
        const look = focusCamera(s.pos3D.add(vec3(0, 1, 0)), { pull: .4, zoom: .84 });
        s.glow = .6; s.talk = 1.6;
        const pick = await say(NAME, save.raced ? SNAIL_ASK.again : SNAIL_ASK.first,
            [{ label: SNAIL_ASK.race, id: 'race' }, { label: SNAIL_ASK.chat, id: 'chat' }, { label: SNAIL_ASK.bye, id: 'bye', cancel: true }]);
        if (pick?.id === 'race') { look.release(); return startRace(s); }
        if (pick?.id === 'chat')
        {
            s.talk = 3;
            await say(NAME, SNAIL_LINES[snailLine++ % SNAIL_LINES.length]);
        }
        look.release();
    } });
    snail = s;
}
let snail = null;

export const snailFeature = {
    build()
    {
        buildSnail();
        buildRace();
        addTodo(15, 'Beat Oswin in a race', ()=> save.wins > 0);
    },
    update() { if (snail) updateRace(snail); },
};
