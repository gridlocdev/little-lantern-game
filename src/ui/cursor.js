// The mouse while you play: the game captures it (pointer lock), so moving it turns the camera as if the button were
// held and the pointer never sits in front of the island. A dialog, a card or the title screen lets it go, so there are
// things to click; closing them captures it again. A browser only allows capturing right after a click or a key, so if
// that is refused, the next click on the island captures it. The browser always lets go on Escape; losing the capture
// mid-play is taken as a pause and opens the menu (unless the window lost focus). The capture waits for Escape to be
// let go, since closing a card with Escape and capturing while the key is still down lets the browser drop it straight
// away and the menu would open again. Touch screens and gamepads leave the mouse alone (a gamepad hides the pointer in
// style.css).
import { MOBILE, mainCanvas, pointerLockExit, pointerLockIsActive, pointerLockRequest, usingGamepadInput } from '../platform/engine.js';
import { state } from '../game/state.js';
import { uiOpen } from './dom.js';
import { openMenu } from './menu.js';

const SETTLE = 400;      // ms a capture must last before losing it counts as a pause
let wanted = false, letGo = false, pending = false, escDownAt = -Infinity, lockedAt = 0;
// Escape counts as held until its key-up, or for a moment at most, in case the browser keeps the key-up to itself
const escHeld = ()=> performance.now() - escDownAt < 600;
const want = ()=> !MOBILE && !usingGamepadInput() && state.mode === 'play' && !uiOpen() && document.hasFocus();
document.addEventListener('mousedown', (e)=> { if (e.target === mainCanvas && want() && !pointerLockIsActive()) pointerLockRequest(); });
document.addEventListener('keydown', (e)=> { if (e.key === 'Escape') escDownAt = performance.now(); }, true);
document.addEventListener('keyup', (e)=> { if (e.key === 'Escape') escDownAt = -Infinity; }, true);
document.addEventListener('pointerlockchange', ()=>
{
    if (pointerLockIsActive()) { lockedAt = performance.now(); return; }
    // Escape while playing: if the key reached the game too, the menu is already open; if the browser kept it, open it.
    // A capture lost the moment it was taken is the browser bouncing it, not a pause
    if (!letGo && want() && performance.now() - lockedAt > SETTLE) setTimeout(()=> { if (want()) openMenu(); }, 150);
    letGo = false;
});

function updateCursor()
{
    const w = want();
    if (w && !wanted) pending = true;                                          // just back to the island
    if (!w) pending = false;
    if (pending && !escHeld()) { pending = false; if (!pointerLockIsActive()) pointerLockRequest(); }
    if (!w && pointerLockIsActive() && !usingGamepadInput()) { letGo = true; pointerLockExit(); }
    wanted = w;
    // without the capture (refused, or a gamepad) the pointer still hides while you play
    document.body.classList.toggle('no-cursor', state.mode === 'play' && !uiOpen());
}
export const cursorSystem = { always: true, update: updateCursor };
