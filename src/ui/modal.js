// Modal cards. Each card registers how it handles input and what happens when it is closed.
import { inputClear } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { clearTouchPresses } from '../platform/input.js';
import { $, ui } from './dom.js';
import { focusDefault, keyNav } from './keynav.js';

const modalHandlers = {};    // modal id -> { update(), onClose(), dismiss }
// dismiss: a click on the dimmed backdrop around the card closes it (cards that ask for a choice leave it off)
export function registerModal(id, handler)
{
    modalHandlers[id] = handler;
    if (handler.dismiss) $(id).addEventListener('pointerdown', (e)=> { if (e.target === $(id) && ui.modal === id) closeModal(); });
}

export function openModal(id)
{
    if (ui.modal) $(ui.modal).hidden = true;
    ui.modal = id;
    $(id).hidden = false;
    $(id).querySelector('.card').scrollTop = 0;
    focusDefault($(id));
    inputClear();
    playSfx('open', undefined, .5);
}
export function closeModal()
{
    if (!ui.modal) return;
    /** @type {HTMLElement} */ (document.activeElement)?.blur();    // keys go back to the game
    $(ui.modal).hidden = true;
    const was = ui.modal;
    ui.modal = null;
    inputClear();
    clearTouchPresses();
    modalHandlers[was]?.onClose?.();
}
document.querySelectorAll('.ui.modal').forEach(keyNav);
// the engine cancels every touch on the page that is not on a control, so the page never scrolls under the game; a
// card too long for a phone needs its touches to scroll it, so they stop here, short of the engine
for (const el of [...Array.from(document.querySelectorAll('.ui.modal')), $('title')])
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) el.addEventListener(type, (e)=> e.stopPropagation(), { passive: true });
export function updateModals()
{
    if (ui.modal) modalHandlers[ui.modal]?.update?.();
}
