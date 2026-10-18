// The interaction prompt.
import { MOBILE } from '../platform/engine.js';
import { activity } from '../game/activity.js';
import { focusItem } from '../game/interact.js';
import { state } from '../game/state.js';
import { $, uiOpen } from './dom.js';
import { glyphText, glyphsChanged } from './glyphs.js';

let lastPrompt = '';
function updatePrompt()
{
    let text = '';
    if (state.mode === 'play' && !uiOpen())
    {
        if (activity.current && activity.current.hint) text = activity.current.hint();
        else if (focusItem) text = typeof focusItem.label === 'function' ? focusItem.label() : focusItem.label;
    }
    const key = text + glyphsChanged();
    if (key === lastPrompt) return;
    lastPrompt = key;
    $('prompt').hidden = !text;
    if (!text) return;
    // 'key|text', or just text for something to use; either may hold {action} glyphs
    const parts = text.split('|');
    $('promptKey').innerHTML = glyphText(parts.length > 1 ? parts[0] : '{use}');
    $('promptText').innerHTML = glyphText(parts.length > 1 ? parts[1] : text);
    $('promptKey').hidden = MOBILE && parts.length < 2;
}

export const promptSystem = { update: updatePrompt };
