// Raw keys, gamepad, mouse and touch turned into named actions.
import {
    MOBILE, gamepadIsDown, gamepadStick, gamepadWasPressed, keyDirection, keyIsDown, keyWasPressed, mouseIsDown, mouseWheel,
} from './engine.js';

// the on-screen buttons (ui/touch.js): a press lasts one frame, a hold until the finger lifts
export const touchState = { jump: false, act: false, back: false, jumpHeld: false, actHeld: false };

// whether a pointer that went down on the world (the canvas) is still down, so dragging there turns the camera even
// while another finger is on the stick or a button
const onCanvas = new Set();
export let pointerOnCanvas = false;
document.addEventListener('pointerdown', (e)=>
{
    // a pointer going down anywhere else is not on the world, even if its last release was missed (let go outside the window)
    if (/** @type {HTMLElement} */ (e.target)?.tagName === 'CANVAS') onCanvas.add(e.pointerId); else onCanvas.delete(e.pointerId);
    pointerOnCanvas = onCanvas.size > 0;
});
addEventListener('blur', ()=> { onCanvas.clear(); pointerOnCanvas = false; });
for (const type of ['pointerup', 'pointercancel'])
    document.addEventListener(type, (/** @type {PointerEvent} */ e)=> { onCanvas.delete(e.pointerId); pointerOnCanvas = onCanvas.size > 0; });

// two fingers on the world pinch to zoom, in mouse wheel steps (fingers apart zooms in, like the wheel rolled forward)
let pinchFrom = 0, pinch = 0, pinchFingers = 0;
function onTouch(e)
{
    const t = [...e.touches].filter((x)=> /** @type {HTMLElement} */ (x.target)?.tagName === 'CANVAS');
    pinchFingers = t.length;
    if (t.length < 2) { pinchFrom = 0; return; }
    const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    if (pinchFrom && d > 0) pinch -= Math.log(d / pinchFrom) * 4;
    pinchFrom = d;
}
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) document.addEventListener(type, onTouch, { passive: true });

export const input = {
    move()
    {
        let v = keyDirection();
        const g = gamepadStick(0);
        if (g.length() > .1) v = g;
        return v.length() > 1 ? v.normalize() : v;
    },
    jump: ()=> keyWasPressed('Space') || gamepadWasPressed(0) || touchState.jump,
    jumpHeld: ()=> keyIsDown('Space') || gamepadIsDown(0) || touchState.jumpHeld,
    act: ()=> keyWasPressed('KeyE') || keyWasPressed('KeyF') || keyWasPressed('Enter') || gamepadWasPressed(2) || touchState.act,
    actHeld: (mouseHold = false)=> keyIsDown('KeyE') || keyIsDown('KeyF') || keyIsDown('Space') || gamepadIsDown(2) || gamepadIsDown(0) || touchState.actHeld || touchState.jumpHeld || (mouseIsDown(0) && pointerOnCanvas && mouseHold),
    back: ()=> keyWasPressed('Escape') || keyWasPressed('KeyQ') || gamepadWasPressed(1) || touchState.back,
    // Shift, or the right bumper or trigger; a pad's stick only walks (faster the further it tilts). The touch
    // joystick has no shoulder buttons, so there pushing it all the way out runs
    run: ()=> keyIsDown('ShiftLeft') || keyIsDown('ShiftRight') || gamepadIsDown(5) || gamepadIsDown(7) || (MOBILE && gamepadStick(0).length() > .95),
    journal: ()=> keyWasPressed('KeyJ') || keyWasPressed('Tab') || gamepadWasPressed(3),
    pause: ()=> keyWasPressed('Escape') || gamepadWasPressed(9),
    /** this frame's zoom in mouse wheel steps, from the wheel or a pinch; positive zooms out */
    zoom: ()=> mouseWheel + pinch,
    /** two fingers are on the world, so a drag is a pinch and should not also turn the camera */
    pinching: ()=> pinchFingers >= 2,
};
export function clearTouchPresses() { touchState.jump = touchState.act = touchState.back = false; pinch = 0; }

// last in the loop: a tap counts for one frame. The pinch is kept to the end of updatePost, where the camera reads it
export const inputSystem = {
    update() { touchState.jump = touchState.act = touchState.back = false; },
    updatePost() { pinch = 0; },
};
