// Modal cards.
import { inputClear, keyWasPressed } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { pendingCatch, resolveCatch } from '../fishing.js';
import { clearTouchPresses, input } from '../platform/input.js';
import { $, ui } from './dom.js';

export function openModal(id)
{
    if (ui.modal) $(ui.modal).hidden = true;
    ui.modal = id;
    $(id).hidden = false;
    inputClear();
    playSfx('open', undefined, .5);
}
export function closeModal()
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
