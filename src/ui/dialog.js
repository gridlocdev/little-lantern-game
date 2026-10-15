// The dialog sheet.
import { MOBILE, inputClear, keyWasPressed, mouseWasPressed, timeReal } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { clearTouchPresses, input } from '../platform/input.js';
import { $, ui } from './dom.js';

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
export function advanceDialog()
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
