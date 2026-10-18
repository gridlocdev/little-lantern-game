// Racing Oswin: up the road to a light, touch it, and back to the line beside his spot. The first time he lays down
// the challenge in a cutscene; every race starts with a countdown and ends with a scene at the line.
import { EngineObject3D, PI, hsl, max, min, render3D, time, timeDelta, vec3 } from '../../platform/engine.js';
import { musicCue } from '../../audio/music.js';
import { playSfx } from '../../audio/sfx.js';
import { RACE_HUD, RACE_TOASTS } from './lines-data.js';
import { RACE } from './race-data.js';
import { along, buildCourse, course, lanePoint, lightPoint, progressOf, startPoint } from './course.js';
import { playChallenge, playCountdown, playFinish } from './race-scene.js';
import { save } from './save.js';
import { activity } from '../../game/activity.js';
import { addStardust } from '../../game/progress.js';
import { writeSave } from '../../game/state.js';
import { dist2, wrapAngle } from '../../lib/math.js';
import { mtx } from '../../platform/mesh.js';
import { CYL, SPH_LO, TORUS } from '../../player/part-meshes.js';
import { player } from '../../player/player.js';
import { burst } from '../../render/particles.js';
import { inCutscene } from '../../ui/cutscene.js';
import { $ } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';
import { heightAt } from '../../world/terrain.js';

// phase: idle, scene (a cutscene before or after), run, home (Oswin sliding back to his spot)
export const race = { on: false, phase: 'idle', t: 0, d: 0, v: 0, pause: 0, touched: false, markers: false, cue: null };

// ---------------------------------------------------------------- the light, and the line on the way back
class Markers extends EngineObject3D
{
    constructor() { super(vec3()); }
    render3D()
    {
        if (!race.markers) return;
        const e = render3D.emissive;
        const light = lightPoint(), lp = vec3(light.x, heightAt(light.x, light.z), light.z);
        const lit = race.touched ? .25 : 1, pulse = 1 + Math.sin(time * 4) * .08;
        render3D.emissive = 1.4 * lit;
        render3D.drawMesh(CYL, mtx(undefined, lp.add(vec3(0, 2.2, 0)), vec3(), vec3(.22 * pulse, 4.4, .22 * pulse)), undefined, hsl(.12, .9, .7, .8));
        render3D.drawMesh(SPH_LO, mtx(undefined, lp.add(vec3(0, 4.6 + Math.sin(time * 2) * .15, 0)), vec3(), vec3(.6 * pulse)), undefined, hsl(.13, .9, .8));
        render3D.emissive = .9 * lit;
        render3D.drawMesh(TORUS, mtx(undefined, lp.add(vec3(0, .12, 0)), vec3(0, time, 0), vec3(RACE.touch * 2, .6, RACE.touch * 2)), undefined, hsl(.12, .8, .65, .7));
        if (race.touched)
        {
            const f = startPoint(), fp = vec3(f.x, heightAt(f.x, f.z), f.z);
            render3D.emissive = .7;
            render3D.drawMesh(TORUS, mtx(undefined, fp.add(vec3(0, .1, 0)), vec3(0, -time, 0), vec3(RACE.finish * 2 * pulse, .3, RACE.finish * 2 * pulse)), undefined, hsl(.5, .8, .7, .6));
        }
        render3D.emissive = e;
    }
}
export function buildRace()
{
    buildCourse();
    new Markers;
}
// Oswin's progress (0 to 2L, out and back) as a place and a heading
function oswinAt(d)
{
    const L = course.L, out = d <= L, s = out ? d : 2 * L - d, a = along(s);
    return { pos: lanePoint(s, -1), yaw: out ? Math.atan2(-a.dx, -a.dz) : Math.atan2(a.dx, a.dz) };
}

// ---------------------------------------------------------------- running it
export function startRace(oswin)
{
    if (race.on) return;
    Object.assign(race, { on: true, phase: 'scene', t: 0, d: 0, v: 0, pause: 0, touched: false, markers: true });
    race.cue = musicCue('race');
    oswin.solid.disabled = true;
    const countdown = ()=> playCountdown(oswin, ()=> go(oswin));
    if (!save.raced) playChallenge(oswin, ()=> { save.raced = true; writeSave(); countdown(); });
    else countdown();
}
function go(oswin)
{
    Object.assign(race, { phase: 'run', t: 0, d: 0, v: 0, pause: 0, touched: false });
    const at = oswinAt(0);
    oswin.pos3D = at.pos; oswin.yaw = at.yaw;
    $('meter').hidden = false;
    $('meterBox').innerHTML = '<div class="label"><span id="rLeg"></span><span id="rTime"></span></div>' +
        '<div class="track race"><i class="turn"></i><b class="oswin" id="rOswin"></b><b class="me" id="rMe"></b></div>' +
        '<div class="label"><span id="rLead"></span></div>';
}
function end(oswin, won)
{
    race.phase = 'scene';
    race.markers = false;
    $('meter').hidden = true;
    oswin.speed = 0;
    const secs = race.t;
    if (won)
    {
        const best = !save.best || secs < save.best;
        if (best) save.best = secs;
        save.wins++;
        writeSave();
        if (save.wins === 1) addStardust(RACE.prize);
        playSfx('collect', undefined, .7);
        playFinish(oswin, true, (k)=> arrive(oswin, k), ()=>
        {
            toast((best ? RACE_TOASTS.best : RACE_TOASTS.time).replace('{s}', secs.toFixed(1)));
            if (save.wins === 1) toast(RACE_TOASTS.prize);
            stop(oswin);
        });
    }
    else
    {
        playSfx('pop', undefined, .6, .8);
        playFinish(oswin, false, ()=> {}, ()=> stop(oswin));
    }
}
// on a win, Oswin puffs the rest of the way in during the scene: k goes 0 to 1
let arriveFrom = -1;
function arrive(oswin, k)
{
    if (arriveFrom < 0) arriveFrom = race.d;
    race.d = arriveFrom + (2 * course.L - arriveFrom) * k;
    const at = oswinAt(race.d);
    oswin.pos3D = at.pos; oswin.yaw = at.yaw;
    oswin.speed = k < 1 ? RACE.speed : 0;
    if (k >= 1) arriveFrom = -1;
}
// the race is over, won, lost or given up: Oswin heads home
function stop(oswin)
{
    race.cue?.release();
    race.cue = null;
    race.phase = 'home';
    race.markers = false;
    arriveFrom = -1;
    $('meter').hidden = true;
}
function giveUp(oswin)
{
    toast(RACE_TOASTS.lost);
    stop(oswin);
}

export function updateRace(oswin)
{
    const dt = timeDelta;
    if (race.phase === 'run') run(oswin, dt);
    else if (race.phase === 'home')
    {
        // slide back to his spot, then turn to face the way he always does
        const to = oswin.home.subtract(oswin.pos3D), d = Math.hypot(to.x, to.z);
        if (d > .05)
        {
            const step = min(d, 2.5 * dt);
            oswin.pos3D = oswin.pos3D.add(vec3(to.x / d * step, 0, to.z / d * step));
            oswin.pos3D.y = heightAt(oswin.pos3D.x, oswin.pos3D.z);
            oswin.yaw += wrapAngle(Math.atan2(-to.x, -to.z) - oswin.yaw) * min(1, dt * 6);
            oswin.speed = 2.5;
        }
        else
        {
            oswin.speed = 0;
            oswin.yaw += wrapAngle(oswin.homeYaw - oswin.yaw) * min(1, dt * 3);
            if (Math.abs(wrapAngle(oswin.homeYaw - oswin.yaw)) < .02)
            {
                oswin.pos3D = oswin.home.copy();
                oswin.solid.disabled = false;
                race.on = false;
                race.phase = 'idle';
            }
        }
    }
}
function run(oswin, dt)
{
    // anything else taking over the mothling, going indoors or wandering off ends the race
    const me = progressOf(player.pos.x, player.pos.z);
    if (player.zone !== 'island' || (activity.current && !inCutscene()) || me.off > RACE.giveUp) return giveUp(oswin);
    race.t += dt;

    // Oswin: up to speed, round the light, and home
    const L = course.L;
    if (race.pause > 0)
    {
        race.pause -= dt;
        oswin.speed = 0;
        oswin.yaw += PI * dt / RACE.turnPause;     // a little pirouette
        if (race.pause <= 0) race.v = RACE.speed * .4;
    }
    else
    {
        race.v = min(RACE.speed, race.v + RACE.accel * dt);
        const before = race.d;
        race.d += race.v * dt;
        if (before < L && race.d >= L) { race.d = L; race.pause = RACE.turnPause; oswin.wiggle = 1; }
        const at = oswinAt(race.d);
        oswin.pos3D = at.pos;
        oswin.yaw += wrapAngle(at.yaw - oswin.yaw) * min(1, dt * 10);
        oswin.speed = race.v;
    }

    // you: touch the light, then come back to the line
    const light = lightPoint(), start = startPoint();
    if (!race.touched && dist2(player.pos.x, player.pos.z, light.x, light.z) < RACE.touch)
    {
        race.touched = true;
        playSfx('collect', undefined, .7);
        burst(vec3(light.x, heightAt(light.x, light.z) + 1.5, light.z), hsl(.12, .9, .7), 30, .12, .3, 1.2);
    }
    if (race.touched && dist2(player.pos.x, player.pos.z, start.x, start.z) < RACE.finish) return end(oswin, true);
    if (race.d >= 2 * L) return end(oswin, false);

    // the bar: where each of you is, out to the light (the middle) and back
    const mine = race.touched ? 2 * L - me.s : me.s;
    $('rLeg').textContent = race.touched ? RACE_HUD.back : RACE_HUD.out;
    $('rTime').textContent = race.t.toFixed(1) + ' s';
    $('rLead').textContent = mine >= race.d ? RACE_HUD.ahead : RACE_HUD.behind;
    $('rMe').style.left = (max(0, min(1, mine / (2 * L))) * 100).toFixed(1) + '%';
    $('rOswin').style.left = (max(0, min(1, race.d / (2 * L))) * 100).toFixed(1) + '%';
}
