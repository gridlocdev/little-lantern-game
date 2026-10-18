// The catch card: keep a fish in the aquarium or release it to the sky.
import { inputClear, keyWasPressed, max, vec3 } from '../../platform/engine.js';
import { bell, playSfx } from '../../audio/sfx.js';
import { refreshAquarium } from './aquarium.js';
import { save } from './save.js';
import { SkyFish } from './sky-fish.js';
import { writeSave } from '../../game/state.js';
import { TAU } from '../../lib/math.js';
import { input } from '../../platform/input.js';
import { moth } from '../../player/mothling.js';
import { $, ui } from '../../ui/dom.js';
import { openModal, registerModal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

// a picture of the fish for the catch card
function paintFishCard(f, size)
{
    const cv = /** @type {HTMLCanvasElement} */ ($('catchCanvas')), g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const css = (c, a = 1)=> `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},${a})`;
    const cx = W / 2, cy = H / 2, L = f.shape === 'eel' ? 210 : f.shape === 'puffer' ? 120 : 170;
    const grad = g.createRadialGradient(cx, cy, 10, cx, cy, 140);
    grad.addColorStop(0, css(f.glow, .45)); grad.addColorStop(1, css(f.glow, 0));
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .6})`; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    g.save(); g.translate(cx, cy);
    g.fillStyle = css(f.fin);
    g.beginPath(); g.moveTo(L * .38, 0); g.lineTo(L * .62, -L * .2); g.quadraticCurveTo(L * .54, 0, L * .62, L * .2); g.closePath(); g.fill();
    const bh = f.shape === 'puffer' ? L * .45 : f.shape === 'eel' ? L * .07 : f.shape === 'ray' ? L * .32 : f.shape === 'angler' ? L * .3 : L * .17;
    g.fillStyle = css(f.body);
    g.beginPath(); g.ellipse(0, 0, L * .45, bh, 0, 0, TAU); g.fill();
    g.fillStyle = css(f.glow, .9); g.shadowColor = css(f.glow); g.shadowBlur = 16;
    if (f.shape === 'angler') { g.beginPath(); g.arc(-L * .5, -bh - 26, 8, 0, TAU); g.fill(); }
    else if (f.shape === 'comet') { g.fillRect(L * .2, -3, L * .5, 6); }
    else { g.fillRect(-L * .25, -2, L * .5, 4); }
    g.shadowBlur = 0;
    g.fillStyle = '#120a24'; g.beginPath(); g.arc(-L * .3, -bh * .25, 5, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-L * .31, -bh * .3, 1.8, 0, TAU); g.fill();
    g.restore();
}
let pendingCatch = null;
export function showCatch(f, sizeCm, kind, onDone)
{
    const first = !save.fish[f.id];
    save.fish[f.id] = (save.fish[f.id] || 0) + 1;
    save.best[f.id] = max(save.best[f.id] || 0, sizeCm);
    writeSave();
    pendingCatch = { f, sizeCm, onDone };
    $('catchName').textContent = (first ? 'New! ' : '') + f.name;
    $('catchStars').textContent = '★'.repeat(f.stars) + '☆'.repeat(4 - f.stars);
    $('catchSize').textContent = `${sizeCm} cm` + (sizeCm >= (save.best[f.id] || 0) && save.fish[f.id] > 1 ? ' · your biggest' : '');
    $('catchWhere').textContent = { pond: 'Starlight Pond', void: 'Void Pier', moonlet: 'The Moonlet' }[kind];
    $('catchText').textContent = f.desc;
    paintFishCard(f, sizeCm);
    openModal('catch');
    playCatchJingle(f.stars);
    if (f.id === 'calf') setTimeout(()=> { playSfx('whale', undefined, .8, 1.6); toast('Far away, the great whale hums back.'); }, 1200);
}
// a rising chime up an F major chord, in the key of the island's music
function playCatchJingle(stars)
{
    const notes = stars >= 3 ? [0, 4, 7, 12, 16] : [0, 4, 7, 12];
    notes.forEach((n, i)=> setTimeout(()=> bell(n + 5, undefined, .55), i * 110));
}
function resolveCatch(keep)
{
    const c = pendingCatch;
    if (!c) return;
    pendingCatch = null;
    if (ui.modal === 'catch') { $('catch').hidden = true; ui.modal = null; inputClear(); }
    if (keep)
    {
        save.aquarium.push(c.f.id);
        if (save.aquarium.length > 24) save.aquarium.shift();
        toast(`${c.f.name} is swimming in your aquarium at home.`);
        refreshAquarium && refreshAquarium();
    }
    else
    {
        save.released++;
        new SkyFish(c.f, moth.handPos.add(vec3(0, .3, 0)));
        toast(`The ${c.f.name} swims up into the stars.`);
    }
    writeSave();
    c.onDone?.();
}
$('catchKeep').onclick = ()=> resolveCatch(true);
$('catchRelease').onclick = ()=> resolveCatch(false);

registerModal('catch', {
    update()
    {
        if (keyWasPressed('KeyK') || input.act()) return resolveCatch(true);
        if (keyWasPressed('KeyR') || input.back()) return resolveCatch(false);
    },
    onClose() { if (pendingCatch) resolveCatch(false); },
});
