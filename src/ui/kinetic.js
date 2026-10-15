// Kinetic text: a line of markup typed out letter by letter, with words that move.
// Markup wraps one word (punctuation inside the markers):
//     *glow*   warm and swelling        ~drift~   letters float on a wave
//     _hush_   small and trembling       !big!     lands large with a thump
// The letters are spans that the stylesheet animates; this file decides when each one appears.
import { voice } from '../audio/sfx.js';

const MARKS = { '*': 'glow', '~': 'drift', '_': 'hush', '!': 'big' };
const PITCH = { glow: 1.12, drift: 1.06, hush: .9, big: 1.28 };

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

// Builds the line into `el` and returns a typist: call update(now) each frame; it reveals letters, speaks syllables
// in the given voice pitch (0 for silence) and reports `done`. finish() shows everything at once.
/** @param {HTMLElement} el @param {string} text @param {{ cps?: number, start?: number, pitch?: number, onBig?: ()=> void }} [opts] */
export function typeLine(el, text, { cps = 34, start = 0, pitch = 0, onBig = undefined } = {})
{
    el.textContent = '';
    const letters = [];
    let t = start, i = 0;
    for (const tok of parseMarkup(text))
    {
        if (tok.space) { el.append(tok.space === '\n' ? document.createElement('br') : ' '); t += 1 / cps; continue; }
        const word = document.createElement('span');
        word.className = 'kw' + (tok.style ? ' k-' + tok.style : '');
        if (tok.style === 'big') t += .18;   // a breath before a big word
        let k = 0;
        for (const ch of tok.text)
        {
            const c = document.createElement('span');
            c.className = 'kc';
            c.textContent = ch;
            c.style.setProperty('--i', String(k++));
            word.append(c);
            letters.push({ el: c, at: t, style: tok.style, word, first: k === 1, speak: /[\p{L}\p{N}]/u.test(ch) && i++ % 2 === 0 });
            t += (tok.style === 'big' ? .5 : tok.style === 'hush' ? 1.4 : 1) / cps;
        }
        const end = tok.text[tok.text.length - 1];
        t += tok.text.endsWith('...') ? .5 : '.!?'.includes(end) ? .32 : ',;:'.includes(end) ? .16 : 0;
        el.append(word);
    }
    let shown = 0;
    const line = {
        end: t,
        get done() { return shown >= letters.length; },
        update(now, silent = false)
        {
            while (shown < letters.length && letters[shown].at <= now)
            {
                const l = letters[shown++];
                l.el.classList.add('on');
                if (l.first) { l.word.classList.add('on'); if (l.style === 'big' && !silent) onBig?.(); }
                if (pitch && l.speak && !silent) voice(pitch * (PITCH[l.style] || 1));
            }
        },
        finish() { line.update(Infinity, true); },
    };
    return line;
}
