// On-screen touch buttons: Use and Jump while you play, and Back while an activity has you (fishing, a swing, a book,
// the telescope, a seat). They hide when a card or the dialog is open, since those are tapped directly. Walking is
// the engine's touch stick on the left; dragging the world looks around and pinching zooms (platform/input.js).
import { MOBILE, setTouchGamepadEnable, setTouchGamepadSize } from '../platform/engine.js';
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

// the engine's stick zones get classes too (style.css narrows the left one to the bottom-left quarter and hides the
// unused right one), for a browser where the stylesheet's own :has() selector doesn't find them; found once the
// engine has made them
let zoneTagged = false;
function tagStickZone()
{
    const overlay = Array.from(document.body.children).find((el)=> !el.classList.contains('ui') && el.querySelector(':scope > div > svg'));
    const [zone, right] = Array.from(overlay?.firstElementChild?.querySelectorAll(':scope > div') ?? []);
    if (zone) { zone.classList.add('stick-zone'); right?.classList.add('stick-zone-unused'); zoneTagged = true; }
}

// the stick's size is style.css's --stick (fluid, clamped), measured here because the engine takes a number; again
// whenever the screen resizes or turns
const stickProbe = document.createElement('div');
stickProbe.style.cssText = 'position:fixed;left:0;top:0;width:var(--stick);height:0;visibility:hidden;pointer-events:none';
function fitStick()
{
    if (!stickProbe.isConnected) document.body.append(stickProbe);
    const size = Math.round(stickProbe.getBoundingClientRect().width);
    if (size) setTouchGamepadSize(size);
}
if (MOBILE)
{
    fitStick();
    addEventListener('resize', fitStick);
    visualViewport?.addEventListener('resize', fitStick);
}

let shown = '';
function updateTouch()
{
    if (MOBILE && !zoneTagged) tagStickZone();
    const play = MOBILE && state.mode === 'play' && !uiOpen();
    // Back, for an activity that says how to leave it (petting the cat is over in a moment, and has no hint)
    const back = play && !!activity.current?.hint;
    // the engine's stick catches every tap in a 3 x size square bottom left, above the cards, the dialog and a cutscene's
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
