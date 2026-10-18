// Kinetic text: a line of markup typed out letter by letter, with words that move.
// Markup wraps one word (punctuation inside the markers):
//     *glow*   warm and swelling        ~drift~   letters float on a wave
//     _hush_   small and trembling       !big!     lands large with a thump
//     ^joy^    hops in, letter by letter, with a bright little tune
// The letters are spans that the stylesheet animates; this file decides when each one appears.
import { voice } from '../audio/sfx.js';

const MARKS = { '*': 'glow', '~': 'drift', '_': 'hush', '!': 'big', '^': 'joy' };
const PITCH = { glow: 1.12, drift: 1.06, hush: .9, big: 1.28, joy: 1.4 };

export function parseMarkup(text)
{
    return text.split(/(\s+)/).filter((s)=> s.length).map((raw)=>
    {
        if (/^\s+$/.test(raw)) return { space: raw.includes('\n') ? '\n' : ' ' };
        const m = raw[0];
        if (raw.length > 2 && MARKS[m] && raw[raw.length - 1] === m) return { text: raw.slice(1, -1), style: MARKS[m] };
        return { text: raw, style: '' };
    });
}

// When each letter of a line appears: tokens from parseMarkup with a time on every letter, and when the line ends.
function schedule(text, cps, start)
{
    let t = start;
    const toks = parseMarkup(text).map((tok)=>
    {
        if (tok.space) { t += 1 / cps; return tok; }
        if (tok.style === 'big' || tok.style === 'joy') t += .18;   // a breath before a big or joyful word
        const at = [];
        for (const ch of tok.text) { at.push(t); t += (tok.style === 'big' ? .5 : tok.style === 'joy' ? .75 : tok.style === 'hush' ? 1.4 : 1) / cps; }
        const end = tok.text[tok.text.length - 1];
        t += tok.text.endsWith('...') ? .5 : '.!?'.includes(end) ? .32 : ',;:'.includes(end) ? .16 : 0;
        return { ...tok, at };
    });
    return { toks, end: t };
}
// how long a line takes to type at cps letters a second, for sizing a cutscene beat around it
export const lineSeconds = (text, cps = 34)=> schedule(text, cps, 0).end;

// Builds the line into `el` and returns a typist: call update(now) each frame; it reveals letters, speaks syllables
// in the given voice pitch (0 for silence) and reports `done`. finish() shows everything at once. onBig and onJoy are
// called as a big or joy word lands.
/** @param {HTMLElement} el @param {string} text @param {{ cps?: number, start?: number, pitch?: number, onBig?: ()=> void, onJoy?: ()=> void }} [opts] */
export function typeLine(el, text, { cps = 34, start = 0, pitch = 0, onBig = undefined, onJoy = undefined } = {})
{
    el.textContent = '';
    const letters = [];
    const { toks, end } = schedule(text, cps, start);
    let i = 0;
    for (const tok of toks)
    {
        if (tok.space) { el.append(tok.space === '\n' ? document.createElement('br') : ' '); continue; }
        const word = document.createElement('span');
        word.className = 'kw' + (tok.style ? ' k-' + tok.style : '');
        let k = 0;
        for (const ch of tok.text)
        {
            const c = document.createElement('span');
            c.className = 'kc';
            c.textContent = ch;
            c.style.setProperty('--i', String(k));
            word.append(c);
            letters.push({ el: c, at: tok.at[k++], style: tok.style, word, first: k === 1, speak: /[\p{L}\p{N}]/u.test(ch) && i++ % 2 === 0 });
        }
        el.append(word);
    }
    let shown = 0;
    const line = {
        end,
        get done() { return shown >= letters.length; },
        update(now, silent = false)
        {
            while (shown < letters.length && letters[shown].at <= now)
            {
                const l = letters[shown++];
                l.el.classList.add('on');
                if (l.first)
                {
                    l.word.classList.add('on');
                    if (!silent && l.style === 'big') onBig?.();
                    if (!silent && l.style === 'joy') onJoy?.();
                }
                if (pitch && l.speak && !silent) voice(pitch * (PITCH[l.style] || 1));
            }
        },
        finish() { line.update(Infinity, true); },
    };
    return line;
}
