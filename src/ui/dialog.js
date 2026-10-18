// The dialog sheet. Lines type themselves out in the speaker's voice (see kinetic.js for the markup).
import { MOBILE, inputClear, max, keyWasPressed, mouseWasPressed, timeReal } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { clearTouchPresses, input } from '../platform/input.js';
import { $, ui } from './dom.js';
import { glyph } from './glyphs.js';
import { focusDefault, keyNav } from './keynav.js';
import { typeLine } from './kinetic.js';

// who speaks in what voice: a pitch for their syllables, 0 for none (the narrator)
const voices = {};
export const setVoice = (who, pitch)=> { voices[who] = pitch; };

export function say(who, pages, options)
{
    return new Promise((resolve)=>
    {
        pages = Array.isArray(pages) ? pages : [pages];
        ui.dialog = { who, pages, i: 0, options, resolve, opened: timeReal, line: null, endedPage: -1 };
        renderDialog();
        playSfx('pop', undefined, .6);
    });
}
function renderDialog()
{
    const d = ui.dialog;
    $('dialog').hidden = !d;
    if (!d) return;
    $('dlgWho').textContent = d.who || '';
    d.line = typeLine($('dlgText'), d.pages[d.i], { start: timeReal + .05, pitch: voices[d.who] ?? (d.who ? 1 : 0), onJoy: ()=> playSfx('joy', undefined, .45) });
    $('dlgOpts').innerHTML = '';
    $('dlgHint').textContent = '';
}
// once a page has finished typing: its options, or how to go on
function renderEnd()
{
    const d = ui.dialog;
    const opts = $('dlgOpts');
    const last = d.i === d.pages.length - 1;
    if (last && d.options)
    {
        d.options.forEach((o, k)=>
        {
            const b = document.createElement('button');
            b.className = 'btn' + (k === 0 ? ' primary' : '');
            b.type = 'button';
            b.append(o.label + ' ');
            if (!MOBILE && k < 4) { const g = document.createElement('span'); g.dataset.glyph = String(k + 1); g.innerHTML = glyph(String(k + 1)); b.append(g); }
            b.onclick = ()=> closeDialog(o);
            opts.appendChild(b);
        });
        if (!MOBILE) focusDefault(opts);
    }
    else $('dlgHint').innerHTML = MOBILE ? 'Tap to continue' : `<span data-glyph="use">${glyph('use')}</span> ${last ? 'to close' : 'to continue'}`;
}
export function advanceDialog()
{
    const d = ui.dialog;
    if (!d || timeReal - d.opened < .15) return;
    if (!d.line.done) { d.line.finish(); return; }   // the first press shows the whole line
    if (d.i < d.pages.length - 1) { d.i++; d.opened = timeReal; renderDialog(); playSfx('tok', undefined, .6); }
    else if (!d.options) closeDialog();
}
function closeDialog(option)
{
    const d = ui.dialog;
    if (!d) return;
    if ($('dialog').contains(document.activeElement)) /** @type {HTMLElement} */ (document.activeElement).blur();
    ui.dialog = null;
    renderDialog();
    inputClear();
    clearTouchPresses();
    if (option && option.fn) option.fn();
    d.resolve(option);
}
keyNav($('dlgOpts'));
$('dialog').addEventListener('pointerdown', (e)=> { if (/** @type {HTMLElement} */ (e.target).tagName !== 'BUTTON') advanceDialog(); });
export function updateDialog()
{
    const d = ui.dialog;
    if (!d) return;
    const wasDone = d.line.done;
    d.line.update(timeReal);
    if (d.line.done && d.endedPage !== d.i) { d.endedPage = d.i; renderEnd(); }
    const last = d.i === d.pages.length - 1;
    if (wasDone && last && d.options)
    {
        for (let k = 0; k < d.options.length; k++)
            if (keyWasPressed('Digit' + (k + 1))) return closeDialog(d.options[k]);
        if (input.back()) return closeDialog(d.options.find((o)=> o.cancel) || d.options[d.options.length - 1]);
        if (input.act() || input.jump())
        {
            const k = Array.prototype.indexOf.call($('dlgOpts').children, /** @type {Element} */ (document.activeElement));   // the choice the arrows are on
            return closeDialog(d.options[max(0, k)]);
        }
        return;
    }
    if (input.act() || input.jump() || mouseWasPressed(0) || input.back()) advanceDialog();
}
