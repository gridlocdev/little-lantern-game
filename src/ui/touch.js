// On-screen touch buttons.
import { state } from '../game/state.js';
import { touchState } from '../platform/input.js';
import { advanceDialog } from './dialog.js';
import { $, ui } from './dom.js';
import { openJournal } from './journal.js';
import { closeModal } from './modal.js';

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
bindTap('tJournal', ()=> { if (state.mode === 'play' && !ui.dialog) ui.modal === 'journal' ? closeModal() : openJournal(); });
