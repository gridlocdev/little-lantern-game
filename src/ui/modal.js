// Modal cards. Each card registers how it handles input and what happens when it is closed.
import { inputClear } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { clearTouchPresses } from '../platform/input.js';
import { $, ui } from './dom.js';

const modalHandlers = {};    // modal id -> { update(), onClose() }
export const registerModal = (id, handler)=> { modalHandlers[id] = handler; };

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
    modalHandlers[was]?.onClose?.();
}
export function updateModals()
{
    if (ui.modal) modalHandlers[ui.modal]?.update?.();
}
