// The corner HUD: counters that features add, and the journal and menu buttons.
import { core } from '../game/progress.js';
import { state } from '../game/state.js';
import { $, ui } from './dom.js';
import { openJournal } from './journal.js';
import { openMenu } from './menu.js';
import { closeModal } from './modal.js';

$('btnJournal').onclick = ()=> { if (state.mode === 'play' && !ui.dialog) ui.modal === 'journal' ? closeModal() : openJournal(); };
$('btnMenu').onclick = ()=> { if (state.mode === 'play' && !ui.dialog) ui.modal === 'menu' ? closeModal() : openMenu(); };

const counters = [];    // { id: element id, value() }
export const addHudCounter = (id, value)=> counters.push({ id, value });
addHudCounter('dust', ()=> core.stardust);

let hudCache = '';
function updateHud()
{
    const values = counters.map((c)=> c.value());
    const key = values.join('|');
    if (key === hudCache) return;
    hudCache = key;
    counters.forEach((c, i)=> $(c.id).textContent = values[i]);
}

export const hudSystem = { update: updateHud };
