import {
    inputClear, keyWasPressed, lerp, max, mouseWasPressed, render3D, setCanvasPixelRatio, setSoundVolume,
    soundVolume, timeDelta, timeReal, usingGamepadInput,
} from './platform/engine.js';
import { CONSTELLATIONS } from './activities.js';
import { music, playSfx, setMusic } from './audio.js';
import { activity, clearTouchPresses, focusItem, gameMode, input, touchState } from './controls.js';
import { MOBILE, dist2 } from './core.js';
import { FISH, pendingCatch, resolveCatch } from './fishing.js';
import { BOOKS } from './house.js';
import { OUTFITS, player } from './player.js';
import { forgetSave, save, writeSetting } from './save.js';
import { PALETTES } from './sky.js';

// ================================================================ HTML INTERFACE
export const $ = (id)=> document.getElementById(id);
export const ui = { modal: null, dialog: null };
export const uiOpen = ()=> !!(ui.modal || ui.dialog);
if (MOBILE) document.body.classList.add('touch');

export function toast(text, ms = 3200)
{
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(()=> { el.classList.add('out'); setTimeout(()=> el.remove(), 700); }, ms);
}
let placeTimer = 0;
export function showPlace(name, sub)
{
    const el = $('place');
    el.innerHTML = '';
    el.append(name);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
    el.classList.add('on');
    clearTimeout(placeTimer);
    placeTimer = setTimeout(()=> el.classList.remove('on'), 3400);
}
export function fadeTransition(fn, hold = 350)
{
    const f = $('fade');
    f.classList.add('on');
    setTimeout(()=>
    {
        try { fn(); } catch (e) { console.error(e); }
        setTimeout(()=> f.classList.remove('on'), hold);
    }, 620);
}

// ---------------------------------------------------------------- prompt
let lastPrompt = '';
export function updatePrompt()
{
    let text = '';
    if (gameMode === 'play' && !uiOpen())
    {
        if (activity && activity.hint) text = activity.hint();
        else if (focusItem) text = typeof focusItem.label === 'function' ? focusItem.label() : focusItem.label;
    }
    if (text === lastPrompt) return;
    lastPrompt = text;
    $('prompt').hidden = !text;
    if (!text) return;
    const parts = text.split('|');
    $('promptKey').textContent = parts.length > 1 ? parts[0] : (usingGamepadInput() ? 'X' : MOBILE ? 'Use' : 'E');
    $('promptText').textContent = parts.length > 1 ? parts[1] : text;
    $('promptKey').hidden = MOBILE && parts.length < 2;
}

// ---------------------------------------------------------------- dialog sheet
export function say(who, pages, options)
{
    return new Promise((resolve)=>
    {
        pages = Array.isArray(pages) ? pages : [pages];
        ui.dialog = { who, pages, i: 0, options, resolve, opened: timeReal };
        renderDialog();
        playSfx('page', undefined, .5);
    });
}
function renderDialog()
{
    const d = ui.dialog;
    $('dialog').hidden = !d;
    if (!d) return;
    $('dlgWho').textContent = d.who || '';
    $('dlgText').textContent = d.pages[d.i];
    const opts = $('dlgOpts');
    opts.innerHTML = '';
    const last = d.i === d.pages.length - 1;
    if (last && d.options)
    {
        d.options.forEach((o, k)=>
        {
            const b = document.createElement('button');
            b.className = 'btn' + (k === 0 ? ' primary' : '');
            b.type = 'button';
            b.innerHTML = '';
            b.append(o.label + ' ');
            if (!MOBILE) { const kb = document.createElement('kbd'); kb.textContent = String(k + 1); b.append(kb); }
            b.onclick = ()=> closeDialog(o);
            opts.appendChild(b);
        });
        $('dlgHint').textContent = '';
    }
    else $('dlgHint').textContent = MOBILE ? 'Tap to continue' : last ? 'E to close' : 'E to continue';
}
function advanceDialog()
{
    const d = ui.dialog;
    if (!d || timeReal - d.opened < .15) return;
    if (d.i < d.pages.length - 1) { d.i++; d.opened = timeReal; renderDialog(); playSfx('page', undefined, .35); }
    else if (!d.options) closeDialog();
}
function closeDialog(option)
{
    const d = ui.dialog;
    if (!d) return;
    ui.dialog = null;
    renderDialog();
    inputClear();
    clearTouchPresses();
    if (option && option.fn) option.fn();
    d.resolve(option);
}
$('dialog').addEventListener('pointerdown', (e)=> { if (e.target.tagName !== 'BUTTON') advanceDialog(); });
export function updateDialog()
{
    const d = ui.dialog;
    if (!d) return;
    const last = d.i === d.pages.length - 1;
    if (last && d.options)
    {
        for (let k = 0; k < d.options.length; k++)
            if (keyWasPressed('Digit' + (k + 1))) return closeDialog(d.options[k]);
        if (input.back()) return closeDialog(d.options.find((o)=> o.cancel) || d.options[d.options.length - 1]);
        if (input.act() || input.jump()) return closeDialog(d.options[0]);
        return;
    }
    if (input.act() || input.jump() || mouseWasPressed(0) || input.back()) advanceDialog();
}

// ---------------------------------------------------------------- modals
export function openModal(id)
{
    if (ui.modal) $(ui.modal).hidden = true;
    ui.modal = id;
    $(id).hidden = false;
    inputClear();
    playSfx('open', undefined, .5);
}
function closeModal()
{
    if (!ui.modal) return;
    $(ui.modal).hidden = true;
    const was = ui.modal;
    ui.modal = null;
    inputClear();
    clearTouchPresses();
    if (was === 'catch' && pendingCatch) resolveCatch(false);
}
export function updateModals()
{
    if (!ui.modal) return;
    if (ui.modal === 'catch')
    {
        if (keyWasPressed('KeyK') || input.act()) return resolveCatch(true);
        if (keyWasPressed('KeyR') || input.back()) return resolveCatch(false);
        return;
    }
    if (ui.modal === 'journal' && (input.journal() || input.back())) return closeModal();
    if (ui.modal === 'menu' && input.back()) return closeModal();
}

// journal
let journalTab = 'fish';
export function openJournal(tab)
{
    if (tab) journalTab = tab;
    renderJournal();
    openModal('journal');
}
document.querySelectorAll('#journal [data-tab]').forEach((b)=> b.onclick = ()=> { journalTab = b.dataset.tab; renderJournal(); });
$('jClose').onclick = closeModal;
const TODO = [
    ['Catch a fish in Starlight Pond', ()=> FISH.some((f)=> f.where === 'pond' && save.fish[f.id])],
    ['Cast a line off the Void Pier into open space', ()=> FISH.some((f)=> f.where === 'void' && save.fish[f.id])],
    ['Swing high enough to touch the moon', ()=> save.swingHigh],
    ['Let go of the swing at the very top and glide', ()=> save.swingFlight],
    ['Play the song carved on Amethyst Hill', ()=> save.bridge],
    ['Cross the light bridge to the Moonlet', ()=> save.moonlet],
    ['Rest in the Moonlet hammock', ()=> save.hammock],
    ['Catch the Starwhale Calf', ()=> !!save.fish.calf],
    ['Bounce five times in a row on the mushrooms', ()=> save.bounceBest >= 5],
    ['Send a wish lantern into the sky', ()=> save.lanterns > 0],
    ['Collect a fallen star', ()=> save.stardust > 0],
    ['Pet a cloud sheep', ()=> save.sheep > 0],
    ['Spot the star whale through the telescope', ()=> save.whale],
    ['Find all four constellations', ()=> Object.keys(save.sky).length >= 4],
    ['Brew a pot of tea at home', ()=> save.tea > 0],
    ['Pet the star cat', ()=> save.cat > 0],
    ['Read every book on the shelf', ()=> Object.keys(save.books).length >= BOOKS.length],
    ['Grow the moonflower to full bloom', ()=> save.flower >= 4],
    ['Sleep and wake under a different sky', ()=> save.slept > 0],
    ['Try on every outfit in the wardrobe', ()=> (save.outfitsTried || []).length >= OUTFITS.length],
];
function renderJournal()
{
    document.querySelectorAll('#journal [data-tab]').forEach((b)=> b.setAttribute('aria-selected', b.dataset.tab === journalTab));
    const body = $('jBody');
    body.innerHTML = '';
    const row = (dotStyle, name, desc, count, missing, check)=>
    {
        const el = document.createElement('div');
        el.className = 'item' + (missing ? ' missing' : '');
        const dot = document.createElement('div');
        if (check !== undefined) { dot.className = 'check' + (check ? ' done' : ''); dot.textContent = check ? '✓' : ''; }
        else { dot.className = 'dot'; dot.style.background = dotStyle; }
        const mid = document.createElement('div');
        mid.style.minWidth = '0';
        const n = document.createElement('div'); n.className = 'nm'; n.textContent = name;
        const d = document.createElement('div'); d.className = 'ds'; d.textContent = desc;
        mid.append(n, d);
        const c = document.createElement('div'); c.className = 'ct'; c.textContent = count || '';
        el.append(dot, mid, c);
        body.appendChild(el);
    };
    if (journalTab === 'fish')
    {
        const got = FISH.filter((f)=> save.fish[f.id]).length;
        row('transparent', `${got} of ${FISH.length} species found`, `${save.aquarium.length} swimming in your aquarium, ${save.released} released to the sky.`, '', false, got === FISH.length);
        for (const f of FISH)
        {
            const n = save.fish[f.id];
            row(n ? f.css : 'rgba(255,255,255,.08)', n ? f.name : 'Not yet caught', n ? f.desc : f.hint, n ? `×${n} · best ${save.best[f.id]} cm` : '★'.repeat(f.stars), !n);
        }
    }
    else if (journalTab === 'island')
    {
        const done = TODO.filter((t)=> t[1]()).length;
        row('transparent', `${done} of ${TODO.length} done`, 'Little things to try while you are here.', '', false, done === TODO.length);
        for (const [name, test] of TODO) row('', name, '', '', false, !!test());
    }
    else
    {
        row('transparent', `Sky: ${PALETTES[save.palette].name}`, 'Sleeping in the house changes which sky you wake under.', '', false, undefined);
        for (const c of CONSTELLATIONS)
        {
            const f = save.sky[c.id];
            row('', f ? c.name : 'An unnamed shape', f ? c.desc : 'Look through the telescope on Observatory Hill.', '', !f, !!f);
        }
        row('', save.whale ? 'The star whale' : 'Something large', save.whale ? 'It circles the island slowly and sings every minute or so.' : 'Something sings out in the dark beyond the island.', '', !save.whale, save.whale);
        row('', `${save.lanterns} wish lanterns`, 'Sent up from the North Overlook.', '', false, save.lanterns > 0);
    }
}

// menu
export function openMenu()
{
    $('volSlider').value = soundVolume;
    $('musicToggle').textContent = music.on ? 'On' : 'Off';
    $('gfxToggle').textContent = gfx.low ? 'Light' : 'Full';
    $('resetBtn').textContent = 'Start a new dream';
    $('resetBtn').dataset.armed = '';
    openModal('menu');
}
$('mClose').onclick = closeModal;
$('volSlider').oninput = (e)=> { setSoundVolume(+e.target.value); writeSetting('volume', soundVolume); };
$('musicToggle').onclick = ()=> setMusic(!music.on);
$('gfxToggle').onclick = ()=> setGraphics(!gfx.low);
export const gfx = { low: false, checked: false, slowT: 0 };
export function setGraphics(low, quiet)
{
    gfx.low = low;
    writeSetting('graphics', low ? 'low' : 'full');
    if (render3D) render3D.shadows = !low;
    setCanvasPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.5));
    $('gfxToggle').textContent = low ? 'Light' : 'Full';
    if (!quiet) toast(low ? 'Lighter graphics: fewer shadows and less grass.' : 'Full graphics.');
}
// the engine keeps its average frame rate private to the module, so track it here the same way, once per drawn frame
let averageFPS = 0, lastFrameMS = 0;
export function trackFrameRate()
{
    const now = performance.now();
    if (lastFrameMS) averageFPS = lerp(averageFPS, 1e3 / ((now - lastFrameMS) || 1), .05);
    lastFrameMS = now;
}
// drop to lighter graphics once if the frame rate stays low for a while
export function watchFrameRate()
{
    if (gfx.low || gfx.checked || gameMode !== 'play' || timeReal < 8) return;
    if (averageFPS > 0 && averageFPS < 28) gfx.slowT += timeDelta; else gfx.slowT = max(0, gfx.slowT - timeDelta);
    if (gfx.slowT > 4) { gfx.checked = true; setGraphics(true, true); toast('Switched to lighter graphics to keep things smooth. You can change this in the menu.', 5000); }
}
$('resetBtn').onclick = (e)=>
{
    const b = e.currentTarget;
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to forget everything'; return; }
    Promise.resolve(forgetSave()).finally(()=> location.reload());
};
$('btnJournal').onclick = ()=> { if (gameMode === 'play' && !ui.dialog) ui.modal === 'journal' ? closeModal() : openJournal(); };
$('btnMenu').onclick = ()=> { if (gameMode === 'play' && !ui.dialog) ui.modal === 'menu' ? closeModal() : openMenu(); };

// touch buttons
function bindTap(id, down, up)
{
    const el = $(id);
    el.addEventListener('pointerdown', (e)=> { e.preventDefault(); down(); });
    el.addEventListener('pointerup', (e)=> { e.preventDefault(); up && up(); });
    el.addEventListener('pointercancel', ()=> up && up());
    el.addEventListener('pointerleave', ()=> up && up());
}
bindTap('tJump', ()=> { touchState.jump = true; touchState.jumpHeld = true; if (ui.dialog) advanceDialog(); }, ()=> touchState.jumpHeld = false);
bindTap('tAct', ()=> { touchState.act = true; touchState.actHeld = true; }, ()=> touchState.actHeld = false);
bindTap('tJournal', ()=> { if (gameMode === 'play' && !ui.dialog) ui.modal === 'journal' ? closeModal() : openJournal(); });

// HUD
let hudCache = '';
export function updateHud()
{
    const total = Object.values(save.fish).reduce((a, b)=> a + b, 0);
    const key = save.stardust + '|' + total;
    if (key === hudCache) return;
    hudCache = key;
    $('dust').textContent = save.stardust;
    $('fishCount').textContent = total;
}

// places you can arrive at
export const PLACE_NAMES = [];
let currentPlace = null;
export function updatePlaces()
{
    let here = null;
    for (const p of PLACE_NAMES)
        if (p.zone === player.zone && dist2(player.pos.x, player.pos.z, p.x, p.z) < p.r) { here = p; break; }
    if (here !== currentPlace)
    {
        currentPlace = here;
        if (here && gameMode === 'play') showPlace(here.name, here.sub);
    }
}
