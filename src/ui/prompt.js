// The interaction prompt.
import { MOBILE, usingGamepadInput } from '../platform/engine.js';
import { activity } from '../game/activity.js';
import { focusItem } from '../game/interact.js';
import { state } from '../game/state.js';
import { $, uiOpen } from './dom.js';

let lastPrompt = '';
export function updatePrompt()
{
    let text = '';
    if (state.mode === 'play' && !uiOpen())
    {
        if (activity.current && activity.current.hint) text = activity.current.hint();
        else if (focusItem) text = typeof focusItem.label === 'function' ? focusItem.label() : focusItem.label;
    }
    if (text === lastPrompt) return;
    lastPrompt = text;
    $('prompt').hidden = !text;
    if (!text) return;
    const parts = text.split('|');
    $('promptKey').textContent = parts.length > 1 ? parts[0] : (usingGamepadInput() ? 'X' : MOBILE ? 'Use' : 'E');
    $('promptText').textContent = parts.length > 1 ? parts[1] : text;
    $('promptKey').hidden = MOBILE && parts.length < 2;
}
