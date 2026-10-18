// The dream journal. Its tabs list rows that features and systems add; the island tab lists their things to do.
import { input } from '../platform/input.js';
import { $ } from './dom.js';
import { closeModal, openModal, registerModal } from './modal.js';

// a row: [dot color, name, description, count, missing, check] where check is true/false for a checkbox, undefined for a dot
const sections = [];    // { tab, order, rows() }
const todos = [];       // { order, label, done() }
export const addJournalSection = (tab, order, rows)=> sections.push({ tab, order, rows });
export const addTodo = (order, label, done)=> todos.push({ order, label, done });
// how many of the things to do are done, out of how many
export const todoProgress = ()=> ({ done: todos.filter((t)=> t.done()).length, total: todos.length });

let journalTab = 'fish';
export function openJournal(tab)
{
    if (tab) journalTab = tab;
    renderJournal();
    openModal('journal');
}
/** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('#journal [data-tab]')).forEach((b)=> b.onclick = ()=> { journalTab = b.dataset.tab; renderJournal(); });
$('jClose').onclick = closeModal;
registerModal('journal', { dismiss: true, update() { if (input.journal() || input.back()) closeModal(); } });

function renderJournal()
{
    /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('#journal [data-tab]')).forEach((b)=> b.setAttribute('aria-selected', String(b.dataset.tab === journalTab)));
    const body = $('jBody');
    body.innerHTML = '';
    const row = (dotStyle, name, desc, count, missing, check)=>
    {
        const el = document.createElement('div');
        el.className = 'item' + (missing ? ' missing' : '');
        el.tabIndex = 0;     // so the arrow keys can step down the list, scrolling it
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
    if (journalTab === 'island')
    {
        // what is left to do comes first, so it is never below the fold
        const list = [...todos].sort((a, b)=> (+!!a.done() - +!!b.done()) || a.order - b.order);
        const done = list.filter((t)=> t.done()).length;
        row('transparent', `${done} of ${list.length} done`, 'Little things to try while you are here.', '', false, done === list.length);
        for (const t of list) row('', t.label, '', '', false, !!t.done());
        return;
    }
    for (const s of sections.filter((s)=> s.tab === journalTab).sort((a, b)=> a.order - b.order))
        for (const r of s.rows()) row(...r);
}
