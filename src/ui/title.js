// The title screen, and stepping from it into the dream.
import { MOBILE, audioContext, gamepadWasPressed, inputClear, keyWasPressed, vec3 } from '../platform/engine.js';
import { musicStart } from '../audio/music.js';
import { core } from '../game/progress.js';
import { state, writeSave } from '../game/state.js';
import { player } from '../player/player.js';
import { cam } from '../render/camera.js';
import { say } from './dialog.js';
import { $ } from './dom.js';
import { showPlace } from './toast.js';

// a feature can tell the title screen that the player has been here before
const returnChecks = [];
export const addReturnCheck = (fn)=> returnChecks.push(fn);
const returning = ()=> core.visits || returnChecks.some((fn)=> fn());

function startGame()
{
    if (state.mode !== 'title') return;
    state.mode = 'play';
    $('title').hidden = true;
    $('hud').hidden = false;
    $('touch').hidden = !MOBILE;
    try { audioContext && audioContext.resume(); } catch (e) {}
    musicStart();
    cam.look = player.pos.add(vec3(0, 1.1, 0));
    inputClear();
    if (!returning())
    {
        core.visits = 0; writeSave();
        setTimeout(()=> say('', [
            'You wake up on a little island floating through the night, with a lantern in your hand.',
            'The pond nearby is full of stars. Your house is right there, with the door open. There is no hurry for anything.',
        ]), 900);
    }
    else setTimeout(()=> showPlace('Violet Isle', 'welcome back'), 600);
}
$('startBtn').onclick = startGame;

export const titleSystem = {
    always: true,
    buildLate() { $('startBtn').textContent = returning() ? 'Return to the dream' : 'Enter the dream'; },
    update()
    {
        if (state.mode === 'title' && (keyWasPressed('Enter') || gamepadWasPressed(0) || gamepadWasPressed(9))) startGame();
    },
};
