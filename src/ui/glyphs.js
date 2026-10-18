// Key and button glyphs (Kenney's Input Prompts, CC0, in prompts/) for whatever was pressed last: the keyboard, or
// the buttons of an Xbox, PlayStation or Switch pad, told apart by the controller's name. On a touch screen the
// on-screen buttons are named in words.
//
// Text asks for a glyph by action in braces, "{use} to continue", and glyphText turns that into HTML. Static markup
// asks with <span data-glyph="use"></span>, and is redrawn whenever the device changes.
import { MOBILE, usingGamepadInput } from '../platform/engine.js';

// action → file in prompts/, per device; the pad buttons follow the standard mapping in platform/input.js. A list is
// drawn side by side (W A S D); files joined by | are alternatives, drawn with "or" between them
const SETS = {
    keys: {
        use: 'keyboard_e', jump: 'keyboard_space', back: 'keyboard_q', journal: 'keyboard_j', menu: 'keyboard_escape',
        run: 'keyboard_shift', move: ['keyboard_w', 'keyboard_a', 'keyboard_s', 'keyboard_d'], look: 'mouse_move', zoom: 'mouse_scroll',
        page: 'keyboard_a', keep: 'keyboard_k', release: 'keyboard_r', start: 'keyboard_enter',
        1: 'keyboard_1', 2: 'keyboard_2', 3: 'keyboard_3', 4: 'keyboard_4',
    },
    xbox: {
        use: 'xbox_button_x', jump: 'xbox_button_a', back: 'xbox_button_b', journal: 'xbox_button_y', menu: 'xbox_button_menu',
        run: 'xbox_rb|xbox_rt', zoom: 'xbox_lb|xbox_lt', move: 'xbox_stick_l', look: 'xbox_stick_r', page: 'xbox_dpad_left', keep: 'xbox_button_x', release: 'xbox_button_b', start: 'xbox_button_a',
    },
    ps: {
        use: 'playstation_button_square', jump: 'playstation_button_cross', back: 'playstation_button_circle', journal: 'playstation_button_triangle',
        menu: 'playstation5_button_options', run: 'playstation_trigger_r1|playstation_trigger_r2', zoom: 'playstation_trigger_l1|playstation_trigger_l2', move: 'playstation_stick_l', look: 'playstation_stick_r',
        page: 'playstation_dpad_left', keep: 'playstation_button_square', release: 'playstation_button_circle', start: 'playstation_button_cross',
    },
    switch: {
        use: 'switch_button_y', jump: 'switch_button_b', back: 'switch_button_a', journal: 'switch_button_x', menu: 'switch_button_plus',
        run: 'switch_button_r|switch_button_zr', zoom: 'switch_button_l|switch_button_zl', move: 'switch_stick_l', look: 'switch_stick_r', page: 'switch_dpad_left', keep: 'switch_button_y', release: 'switch_button_a', start: 'switch_button_b',
    },
};
// what each glyph says, for screen readers
const NAMES = { use: 'Use', jump: 'Jump', back: 'Back', journal: 'Journal', menu: 'Menu', run: 'Run', move: 'Move', look: 'Look', zoom: 'Zoom', page: 'Back a page', keep: 'Keep', release: 'Release', start: 'Start' };
// on a touch screen, the two on-screen buttons
const TOUCH = { use: 'Use', jump: 'Jump', back: 'Jump', keep: 'Keep', release: 'Release' };

// 'touch', 'keys', or a pad: 'xbox', 'ps' or 'switch'
export function inputDevice()
{
    if (!usingGamepadInput()) return MOBILE ? 'touch' : 'keys';
    const id = (navigator.getGamepads?.() ?? []).find((g)=> g)?.id ?? '';
    if (/playstation|dualshock|dualsense|054c/i.test(id)) return 'ps';
    if (/nintendo|switch|joy-con|pro controller|057e/i.test(id)) return 'switch';
    return 'xbox';
}
// wide keys sit small in their square images, so they are drawn zoomed to the key's width
const one = (file, name)=> `<i class="glyph${/space|shift/.test(file) ? ' wide' : ''}" role="img" aria-label="${name}" style="--glyph:url(prompts/${file}.svg)"></i>`;
/** the glyph for an action on the current device, as HTML ('' when it has none there) */
export function glyph(action, device = inputDevice())
{
    if (device === 'touch') return TOUCH[action] ? `<b class="glyph-word">${TOUCH[action]}</b>` : '';
    const f = SETS[device][action] ?? SETS.keys[action];
    if (!f || (device !== 'keys' && /^\d$/.test(action))) return '';
    if (Array.isArray(f)) return `<span class="glyphs">${f.map((x)=> one(x, NAMES[action])).join('')}</span>`;
    return f.split('|').map((x)=> one(x, NAMES[action] ?? action)).join(' or ');
}
const escape = (s)=> s.replace(/[&<>"]/g, (c)=> ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** text with {action} marks turned into glyphs */
export const glyphText = (text, device = inputDevice())=> escape(text).replace(/\{(\w+)\}/g, (m, a)=> glyph(a, device));

// redraws every [data-glyph] when the device changes; others (the prompt, the dialog) ask glyphsChanged()
let shown = '';
let changes = 0;
export const glyphsChanged = ()=> changes;
function updateGlyphs()
{
    const d = inputDevice();
    if (d === shown) return;
    shown = d;
    changes++;
    document.body.dataset.input = d === 'keys' || d === 'touch' ? d : 'pad';
    document.querySelectorAll('[data-glyph]').forEach((el)=> { el.innerHTML = glyph(/** @type {HTMLElement} */ (el).dataset.glyph, d); });
}
export const glyphSystem = { always: true, update: updateGlyphs };
