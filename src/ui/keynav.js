// Keyboard, wheel and gamepad handling for the HTML cards (menu, journal, catch card, end card) and the dialog's choices.
// The engine listens on the document and swallows Tab, the arrow keys, Space and the mouse wheel so the page never
// scrolls under the game. Inside a card those are needed: Tab and the arrows move between controls, Enter and Space
// press the focused one, the wheel and Page Up/Down scroll a card too long for the window. Handling them on the card
// and stopping them there keeps them from the engine; every other key (E, J, Escape, Q, K, R...) still reaches it.

import { gamepadStick, gamepadWasPressed, usingGamepadInput } from '../platform/engine.js';

const FOCUSABLE = 'button, input, [tabindex="0"]';
const visible = (el)=> !el.disabled && el.getClientRects().length > 0;
export const focusables = (root)=> /** @type {HTMLElement[]} */ ([...root.querySelectorAll(FOCUSABLE)]).filter(visible);

// focus what Enter should press when a card opens: its main button, else the selected tab, else the first control
export function focusDefault(root)
{
    const all = focusables(root);
    const pick = all.find((el)=> el.classList.contains('primary')) || all.find((el)=> el.getAttribute('aria-selected') === 'true') || all[0];
    pick?.focus();
}

function move(root, step)
{
    const all = focusables(root);
    if (!all.length) return;
    const i = all.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    const next = all[i < 0 ? (step > 0 ? 0 : all.length - 1) : (i + step + all.length) % all.length];
    next.focus();
    next.scrollIntoView({ block: 'nearest' });
}

export function keyNav(root)
{
    const scroller = /** @type {HTMLElement} */ (root.querySelector('.card')) || root;
    const pressed = new Set();
    root.addEventListener('keydown', (e)=>
    {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const el = /** @type {HTMLElement} */ (e.target);
        const slider = el instanceof HTMLInputElement && el.type === 'range';
        switch (e.key)
        {
            case 'Tab': move(root, e.shiftKey ? -1 : 1); break;
            case 'ArrowDown': move(root, 1); break;
            case 'ArrowUp': move(root, -1); break;
            case 'ArrowRight': case 'ArrowLeft':
                if (slider) { e.stopPropagation(); return; }     // the slider moves itself
                move(root, e.key === 'ArrowRight' ? 1 : -1); break;
            case 'Enter': case ' ':
                if (slider || el === root) return;
                pressed.add(e.code);
                if (!e.repeat) el.click();
                break;
            case 'PageDown': case 'PageUp':
                scroller.scrollBy({ top: (e.key === 'PageDown' ? 1 : -1) * scroller.clientHeight * .85, behavior: 'smooth' }); break;
            case 'Home': case 'End':
                scroller.scrollTo({ top: e.key === 'Home' ? 0 : scroller.scrollHeight, behavior: 'smooth' }); break;
            default: return;
        }
        e.preventDefault();
        e.stopPropagation();
    });
    // the release of a Space or Enter that pressed a button here stays here too; one pressed before the card opened
    // still reaches the game, so it is never left held down
    root.addEventListener('keyup', (e)=> { if (pressed.delete(e.code)) e.stopPropagation(); });
    // the wheel scrolls the card wherever the pointer is over it or the dimmed backdrop, and the camera does not zoom
    root.addEventListener('wheel', (e)=>
    {
        e.stopPropagation();
        if (!scroller.contains(/** @type {Node} */ (e.target))) scroller.scrollBy({ top: e.deltaY });
    }, { passive: true });
}

// ---------------------------------------------------------------- the gamepad
// While a card or the dialog's choices are open (ui/router.js calls this each frame), the d-pad or left stick moves
// between controls and nudges a slider sideways, A presses the focused control, the bumpers change tabs and the right
// stick scrolls. B is each card's own way out (input.back). A held direction repeats, slowly at first.
const REPEAT = [400, 130];      // ms before a held direction repeats, and between repeats
let heldDir = '', nextAt = 0;
export function padNav(root, { press = true } = {})
{
    if (!usingGamepadInput()) { heldDir = ''; return; }
    const el = /** @type {HTMLElement} */ (document.activeElement);
    const inside = root.contains(el) && el !== root;
    const s = gamepadStick(0), now = performance.now();
    const dir = Math.abs(s.y) > .5 ? (s.y > 0 ? 'up' : 'down') : Math.abs(s.x) > .5 ? (s.x > 0 ? 'right' : 'left') : '';
    if (dir && (dir !== heldDir || now >= nextAt))
    {
        nextAt = now + REPEAT[dir === heldDir ? 1 : 0];
        if (!inside) focusDefault(root);
        else if (el instanceof HTMLInputElement && el.type === 'range' && (dir === 'left' || dir === 'right'))
        {
            const step = +el.step || .05;
            el.value = String(Math.min(+el.max, Math.max(+el.min, +el.value + (dir === 'right' ? step : -step))));
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        else move(root, dir === 'down' || dir === 'right' ? 1 : -1);
    }
    heldDir = dir;
    if (press && gamepadWasPressed(0)) { if (inside) el.click(); else focusDefault(root); }
    // the bumpers step through tabs
    const tabs = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('[role="tab"]')]);
    const bump = gamepadWasPressed(4) ? -1 : gamepadWasPressed(5) ? 1 : 0;
    if (tabs.length && bump)
    {
        const i = tabs.findIndex((t)=> t.getAttribute('aria-selected') === 'true');
        const t = tabs[(i + bump + tabs.length) % tabs.length];
        t.click(); t.focus();
    }
    // the right stick scrolls a card too long for the window
    const r = gamepadStick(1).y, scroller = /** @type {HTMLElement} */ (root.querySelector('.card')) || root;
    if (Math.abs(r) > .2) scroller.scrollBy({ top: -r * 18 });
}
