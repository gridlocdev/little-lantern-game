// An open storybook beside the reader: one page at a time, typed out in kinetic text (kinetic.js) with a drop cap,
// the book's motif at the foot and a page count. Whoever opens it turns the pages and closes it.
import { timeReal } from '../platform/engine.js';
import { playSfx } from '../audio/sfx.js';
import { $ } from './dom.js';
import { typeLine } from './kinetic.js';

let book = null, page = 0, line = null;

/** @param {{ title: string, pages: string[], cover?: number, motif?: string }} b */
export function openStorybook(b)
{
    book = b; page = 0;
    const el = $('storybook');
    el.style.setProperty('--cover', String((b.cover ?? .75) * 360));
    $('sbTitle').textContent = b.title;
    $('sbMotif').textContent = b.motif || '✦';
    el.hidden = false;
    requestAnimationFrame(()=> el.classList.add('on'));
    showPage(0);
}
function showPage(i)
{
    page = i;
    const el = $('sbText');
    el.classList.remove('turn'); void el.offsetWidth; el.classList.add('turn');    // restart the page-turn fade
    line = typeLine(el, book.pages[i], { start: timeReal + .35, cps: 30 });
    el.classList.toggle('first', i === 0);
    $('sbPage').textContent = `${i + 1} / ${book.pages.length}`;
    $('sbNext').textContent = i === book.pages.length - 1 ? 'Close the book' : 'Turn the page';
}
export const storybook = {
    get open() { return !!book; },
    update() { line?.update(timeReal); $('storybook').classList.toggle('typed', !!line?.done); },
    // the next page, or finishes typing the current one first; returns false once there are no more pages
    next()
    {
        if (!book) return false;
        if (!line.done) { line.finish(); return true; }
        if (page >= book.pages.length - 1) return false;
        playSfx('tok', undefined, .5);
        showPage(page + 1);
        return true;
    },
    back() { if (book && page > 0) { playSfx('tok', undefined, .4, .85); showPage(page - 1); } },
    close()
    {
        if (!book) return;
        book = null; line = null;
        const el = $('storybook');
        el.classList.remove('on');
        setTimeout(()=> { if (!book) el.hidden = true; }, 600);
    },
};
