// On-screen touch buttons: Use and Jump while you play, and Back while an activity has you (fishing, a swing, a book,
// the telescope, a seat). They hide when a card or the dialog is open, since those are tapped directly. Walking is
// the engine's touch stick on the left; dragging the world looks around and pinching zooms (platform/input.js).
import { MOBILE, setTouchGamepadEnable } from '../platform/engine.js';
import { activity } from '../game/activity.js';
import { state } from '../game/state.js';
import { touchState } from '../platform/input.js';
import { $, uiOpen } from './dom.js';
import { storybook } from './storybook.js';

function bindTap(id, down, up)
{
    const el = $(id);
    el.addEventListener('pointerdown', (e)=> { e.preventDefault(); down(); });
    el.addEventListener('pointerup', (e)=> { e.preventDefault(); up && up(); });
    el.addEventListener('pointercancel', ()=> up && up());
    el.addEventListener('pointerleave', ()=> up && up());
}
bindTap('tJump', ()=> { touchState.jump = true; touchState.jumpHeld = true; }, ()=> touchState.jumpHeld = false);
bindTap('tAct', ()=> { touchState.act = true; touchState.actHeld = true; }, ()=> touchState.actHeld = false);
bindTap('tBack', ()=> { touchState.back = true; });

let shown = '';
function updateTouch()
{
    const play = MOBILE && state.mode === 'play' && !uiOpen();
    // Back, for an activity that says how to leave it (petting the cat is over in a moment, and has no hint)
    const back = play && !!activity.current?.hint;
    // the engine's stick catches every tap in a 360 px square bottom left, above the cards, the dialog and a cutscene's
    // Skip, so it is only on while there is walking (or looking) to do
    const stick = play && !storybook.open && !document.body.classList.contains('cine');
    const key = `${play}${back}${stick}`;
    if (key === shown) return;
    shown = key;
    if (MOBILE) setTouchGamepadEnable(stick);
    $('touch').hidden = !play;
    $('tBack').hidden = !back;
    // a button that hides under a finger never sees it lift
    if (!play) touchState.jumpHeld = touchState.actHeld = false;
}
export const touchSystem = { always: true, update: updateTouch };
