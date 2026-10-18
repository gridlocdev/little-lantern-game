// Raw keys, gamepad, mouse and touch turned into named actions.
import {
    MOBILE, gamepadIsDown, gamepadStick, gamepadWasPressed, keyDirection, keyIsDown, keyWasPressed, mouseIsDown,
} from './engine.js';

export const touchState = { jump: false, act: false, jumpHeld: false, actHeld: false, journal: false };
export let pointerOnCanvas = false;
document.addEventListener('pointerdown', (e)=> { pointerOnCanvas = e.target && /** @type {HTMLElement} */ (e.target).tagName === 'CANVAS'; });

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
    back: ()=> keyWasPressed('Escape') || keyWasPressed('KeyQ') || gamepadWasPressed(1),
    // Shift, or the right bumper or trigger; a pad's stick only walks (faster the further it tilts). The touch
    // joystick has no shoulder buttons, so there pushing it all the way out runs
    run: ()=> keyIsDown('ShiftLeft') || keyIsDown('ShiftRight') || gamepadIsDown(5) || gamepadIsDown(7) || (MOBILE && gamepadStick(0).length() > .95),
    journal: ()=> keyWasPressed('KeyJ') || keyWasPressed('Tab') || gamepadWasPressed(3) || touchState.journal,
    pause: ()=> keyWasPressed('Escape') || gamepadWasPressed(9),
};
export function clearTouchPresses() { touchState.jump = touchState.act = touchState.journal = false; }

export const inputSystem = { update: clearTouchPresses };
