// Progress that several features and systems share, kept in the save's 'core' slice.
// Features read it; they change it only through the functions here. The sky owns palette (setPalette)
// and the music owns music (setMusic).
import { state, writeSave } from './state.js';

export const core = state.slice('core', { visits: 0, palette: 0, stardust: 0, outfit: 0, music: true });

export function addStardust(n) { core.stardust += n; writeSave(); }
export function countVisit() { core.visits++; writeSave(); }
export function setOutfit(i) { core.outfit = i; }
