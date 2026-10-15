// The corner HUD.
import { save, state } from '../game/state.js';
import { $, ui } from './dom.js';
import { openJournal } from './journal.js';
import { openMenu } from './menu.js';
import { closeModal } from './modal.js';

$('btnJournal').onclick = ()=> { if (state.mode === 'play' && !ui.dialog) ui.modal === 'journal' ? closeModal() : openJournal(); };
$('btnMenu').onclick = ()=> { if (state.mode === 'play' && !ui.dialog) ui.modal === 'menu' ? closeModal() : openMenu(); };

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
