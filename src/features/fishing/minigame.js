// Fishing: aim, cast, wait for a bite, reel in.
import {
    MOBILE, PI, abs, clamp, gamepadWasPressed, hsl, keyWasPressed, rand, timeDelta, usingGamepadInput, vec3,
} from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { showCatch } from './catch-card.js';
import { FISH } from './fish-list.js';
import { FishingRig } from './rig.js';
import { ripple } from './ripples.js';
import { save } from './save.js';
import { activity } from '../../game/activity.js';
import { addInteract } from '../../game/interact.js';
import { clearTouchPresses, input, touchState } from '../../platform/input.js';
import { moth } from '../../player/mothling.js';
import { player } from '../../player/player.js';
import { focusCamera, kickCamera } from '../../render/camera.js';
import { burst } from '../../render/particles.js';
import { $ } from '../../ui/dom.js';
import { toast } from '../../ui/toast.js';

let fishing = null;
const FISH_SPOTS = [];
export function addFishingSpot(spot)
{
    // spot: {kind: 'pond'|'void'|'moonlet', center, radius(water), y, pos()->stand point, castDir()}
    FISH_SPOTS.push(spot);
    addInteract({ pos: spot.pos, r: spot.r || 2.2, label: 'Fish', when: spot.when, act: ()=> startFishing(spot), priority: .5, zone: spot.zone || 'island' });
}
function pickFish(kind)
{
    const pool = FISH.filter((f)=> f.where === kind);
    let total = 0;
    const w = pool.map((f)=> { const k = f.id === 'calf' && !save.fish.calf ? f.w * 1.2 : f.w; total += k; return k; });
    let r = rand(total);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[0];
}
let fishingRig;
function startFishing(spot)
{
    const center = spot.center();
    const stand = player.pos;
    player.yaw = spot.kind === 'void' ? spot.yaw : Math.atan2(-(center.x - stand.x), -(center.z - stand.z));
    player.pose = 'fish';
    player.hold = 'rod';
    fishing = { spot, state: 'aim', power: 0, powerDir: 1, t: 0, bob: player.pos.copy(), progress: .3, zone: .3, zoneV: 0, fishX: .5, fishV: 0, tilt: 0 };
    activity.start({
        name: 'fishing', lockCamera: false, mouseHold: true,
        update: updateFishing,
        cancel: stopFishing,
        hint: ()=> fishingHint(),
        cam: ()=> ({ target: player.pos.add(vec3(0, 1.4, 0)), dist: 7.5, yaw: player.yaw + .35, pitch: .38 }),
    });
    showFishMeter();
    if (!fishingRig) fishingRig = new FishingRig(()=> fishing);
}
function stopFishing()
{
    fishing = null;
    activity.end();
    player.pose = 'free';
    player.hold = 'lantern';
    $('meter').hidden = true;
}
function fishingHint()
{
    const F = fishing;
    if (!F) return '';
    const k = MOBILE ? 'Use' : usingGamepadInput() ? 'X' : 'E';
    if (F.state === 'aim') return `${k}|Hold to cast, release to let go · ${MOBILE ? 'Jump' : 'Q'} to stop fishing`;
    if (F.state === 'wait') return `${k}|Wait for a bite · ${k} reels in`;
    if (F.state === 'bite') return `${k}|Now! Hook it`;
    if (F.state === 'reel') return `${k}|Hold to pull the green band onto the fish`;
    return '';
}
function showFishMeter()
{
    const F = fishing;
    const box = $('meterBox');
    $('meter').hidden = false;
    if (F.state === 'aim')
        box.innerHTML = '<div class="label"><span>Cast distance</span><span id="mVal"></span></div><div class="track"><div class="fill" id="mFill" style="width:0%"></div></div>';
    else if (F.state === 'reel')
        box.innerHTML = '<div class="label"><span id="mName">Something is pulling</span><span>Keep it in the band</span></div><div class="track" id="mTrack"><div class="zone" id="mZone"></div><div class="fishmark" id="mFish"></div></div><div class="progress"><i id="mProg"></i></div>';
    else $('meter').hidden = true;
}
function updateFishing()
{
    const F = fishing, dt = timeDelta, spot = F.spot;
    F.t += dt;
    const held = input.actHeld(activity.current?.mouseHold);
    if (F.state !== 'reel' && F.state !== 'caught' && (keyWasPressed('KeyQ') || keyWasPressed('Escape') || gamepadWasPressed(1) || (MOBILE && touchState.jump && F.state === 'aim')))
    {
        clearTouchPresses();
        return stopFishing();
    }
    if (F.state === 'aim')
    {
        F.bob = moth.rodTip ? moth.rodTip.copy() : player.pos.copy();
        if (held)
        {
            F.charging = true;
            F.power += F.powerDir * dt * .9;
            if (F.power > 1) { F.power = 1; F.powerDir = -1; }
            if (F.power < 0) { F.power = 0; F.powerDir = 1; }
            const fill = $('mFill');
            if (fill) { fill.style.width = (F.power * 100).toFixed(0) + '%'; $('mVal').textContent = (3 + F.power * spot.reach).toFixed(1) + ' m'; }
            player.pose = 'reel';
        }
        else if (F.charging)
        {
            F.charging = false;
            const dir = vec3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
            let target = player.pos.add(dir.scale(2.5 + F.power * spot.reach));
            target = spot.clamp(target);
            F.from = moth.rodTip ? moth.rodTip.copy() : player.pos.add(vec3(0, 2, 0));
            F.to = target;
            F.state = 'fly'; F.t = 0;
            player.pose = 'fish';
            playSfx('cast', player.pos, .8);
            $('meter').hidden = true;
        }
    }
    else if (F.state === 'fly')
    {
        const t = clamp(F.t / .7);
        F.bob = F.from.lerp(F.to, t).add(vec3(0, Math.sin(t * PI) * 2.2, 0));
        if (t >= 1)
        {
            F.state = 'wait'; F.t = 0;
            F.biteAt = rand(2.5, 8);
            F.nibbles = [rand(.8, F.biteAt - .5), rand(.8, F.biteAt - .5)];
            spot.kind === 'void' ? playSfx('bite', F.to, .5, .5) : playSfx('plop', F.to, .8);
            ripple(F.to, spot.kind === 'void' ? hsl(.75, .7, .8) : hsl(.6, .6, .85));
        }
    }
    else if (F.state === 'wait')
    {
        let dip = Math.sin(F.t * 2.3) * .04;
        for (const n of (F.nibbles || [])) if (abs(F.t - n) < .15) { dip -= .12; if (!F['n' + n]) { F['n' + n] = 1; playSfx('tick', F.to, .7); ripple(F.to, hsl(.6, .5, .8), .5); } }
        F.bob = F.to.add(vec3(0, dip, 0));
        if (input.act()) { F.state = 'aim'; F.power = 0; showFishMeter(); return; }
        if (F.t > F.biteAt)
        {
            F.state = 'bite'; F.t = 0;
            F.fish = pickFish(spot.kind);
            playSfx('bite', F.to, 1);
            ripple(F.to, hsl(.95, .7, .8), 1.4);
            focusCamera(F.to, { pull: .55, zoom: .8, dur: .9, rise: .25 });     // look: the bobber dips
        }
    }
    else if (F.state === 'bite')
    {
        F.bob = F.to.add(vec3(0, -.25 + Math.sin(F.t * 30) * .05, 0));
        if (input.act() || (held && F.t > .05 && !F.heldBefore))
        {
            F.state = 'reel'; F.t = 0;
            F.progress = .3; F.zone = .35; F.zoneV = 0; F.fishX = .5; F.fishV = 0;
            showFishMeter();
            $('mName').textContent = F.fish.stars >= 3 ? 'Something big and quick' : F.fish.stars === 2 ? 'Something lively' : 'Something small';
            playSfx('splash', F.to, .8);
            kickCamera(.05);
        }
        else if (F.t > .9)
        {
            toast('It slipped away. Try again.');
            F.state = 'wait'; F.t = 0; F.biteAt = rand(3, 8); F.nibbles = [rand(.8, 2)];
        }
        F.heldBefore = held;
    }
    else if (F.state === 'reel')
    {
        const f = F.fish, d = f.diff;
        // the fish darts about the track
        F.fishT = (F.fishT || 0) - dt;
        if (F.fishT <= 0) { F.fishT = rand(.25, 1.1) * (1.2 - d); F.fishGoal = rand(.05, .95); }
        F.fishV += (F.fishGoal - F.fishX) * dt * (6 + d * 14) - F.fishV * dt * 3;
        F.fishX = clamp(F.fishX + F.fishV * dt, 0, 1);
        // your band rises while you hold and sinks when you let go
        F.zoneV += (held ? 2.6 : -2.2) * dt;
        F.zoneV *= .985;
        F.zone += F.zoneV * dt;
        const zw = .3 - d * .1;
        if (F.zone < 0) { F.zone = 0; F.zoneV = abs(F.zoneV) * .3; }
        if (F.zone > 1 - zw) { F.zone = 1 - zw; F.zoneV = -abs(F.zoneV) * .3; }
        const inside = F.fishX > F.zone && F.fishX < F.zone + zw;
        F.progress += inside ? dt * .3 : -dt * (.14 + d * .2);
        if (inside && rand() < dt * 8) playSfx('tick', undefined, .4, 1 + F.progress);
        $('mZone').style.left = (F.zone * 100) + '%';
        $('mZone').style.width = (zw * 100) + '%';
        $('mZone').classList.toggle('hit', inside);
        $('mFish').style.left = (F.fishX * 100) + '%';
        $('mProg').style.width = (clamp(F.progress) * 100) + '%';
        F.bob = F.to.lerp(player.pos.add(vec3(0, .3, 0)), F.progress * .5).add(vec3(Math.sin(F.t * 13) * .15, Math.sin(F.t * 9) * .08, Math.cos(F.t * 11) * .15));
        F.tilt = Math.sin(F.t * 17) * .4;
        player.pose = 'reel';
        if (rand() < dt * 3) ripple(F.bob, hsl(.6, .5, .8), .6);
        if (F.progress >= 1) landFish();
        else if (F.progress <= 0)
        {
            playSfx('snap', player.pos, 1);
            kickCamera(.05);
            toast(`The line went slack. The ${F.fish.stars >= 3 ? 'big one' : 'fish'} swam off.`);
            F.state = 'aim'; F.power = 0; player.pose = 'fish';
            showFishMeter();
        }
    }
    else if (F.state === 'caught')
    {
        if (F.flyFish)
        {
            F.flyFish.t += dt / .8;
            if (F.flyFish.t >= 1)
            {
                F.holdFish = { f: F.flyFish.f, sizeCm: F.flyFish.sizeCm };
                F.flyFish = null;
                player.pose = 'cheer';
                showCatch(F.holdFish.f, F.holdFish.sizeCm, spot.kind, backToAim);
            }
        }
    }
}
function landFish()
{
    const F = fishing, f = F.fish;
    const sizeCm = Math.round(rand(f.size[0], f.size[1]) * (rand() < .08 ? 1.25 : 1));
    F.state = 'caught';
    $('meter').hidden = true;
    F.flyFish = { f, sizeCm, from: F.bob.copy(), to: player.pos.add(vec3(0, 1.5, 0)), t: 0 };
    playSfx('splash', F.bob, 1);
    burst(F.bob, f.glow, 22, .09, .25);
    kickCamera(.07);
    focusCamera(()=> F.flyFish ? F.flyFish.from.lerp(F.flyFish.to, F.flyFish.t) : player.pos.add(vec3(0, 1.5, 0)), { pull: .5, zoom: .78, dur: 1.4 });
    player.hold = 'none';
}

// after a catch is kept or let go, go back to aiming if still fishing
function backToAim()
{
    if (!fishing) return;
    fishing.holdFish = null;
    fishing.state = 'aim'; fishing.power = 0;
    player.pose = 'fish'; player.hold = 'rod';
    showFishMeter();
}
