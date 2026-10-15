// Fade to black and back.
import { $ } from './dom.js';

export function fadeTransition(fn, hold = 350)
{
    const f = $('fade');
    f.classList.add('on');
    setTimeout(()=>
    {
        try { fn(); } catch (e) { console.error(e); }
        setTimeout(()=> f.classList.remove('on'), hold);
    }, 620);
}
