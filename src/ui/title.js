// The title screen, stepping from it into the dream, and back to it.
import { audioContext, gamepadWasPressed, inputClear, keyWasPressed, timeReal, vec3 } from '../platform/engine.js';
import { musicStart } from '../audio/music.js';
import { activity } from '../game/activity.js';
import { events } from '../game/events.js';
import { core } from '../game/progress.js';
import { state, writeSave } from '../game/state.js';
import { player } from '../player/player.js';
import { cam } from '../render/camera.js';
import { $ } from './dom.js';
import { typeLine } from './kinetic.js';
import { closeModal } from './modal.js';
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
    try { audioContext && audioContext.resume(); } catch (e) {}
    musicStart();
    cam.look = player.pos.add(vec3(0, 1.1, 0));
    inputClear();
    const first = !returning();
    if (first) { core.visits = 0; writeSave(); }
    else setTimeout(()=> showPlace('Violet Isle', 'welcome back'), 1800);
    // the intro feature answers a first start with its cutscene
    events.emit('dream-started', { first });
}
$('startBtn').onclick = startGame;

// back to the title screen, the island still turning behind it (the browser's "save and exit")
export function returnToTitle(note = '')
{
    closeModal();
    activity.current?.cancel?.();
    state.mode = 'title';
    $('hud').hidden = true;
    $('title').hidden = false;
    $('startLabel').textContent = 'Return to the dream';
    if (note) $('titleNote').textContent = note;
    nameLine = typeLine($('titleName'), '~Little~ ~Lantern~', { start: timeReal + .4, cps: 9 });
}

let nameLine = null;
export const titleSystem = {
    always: true,
    buildLate()
    {
        $('startLabel').textContent = returning() ? 'Return to the dream' : 'Enter the dream';
        nameLine = typeLine($('titleName'), '~Little~ ~Lantern~', { start: timeReal + .6, cps: 9 });
    },
    update()
    {
        nameLine?.update(timeReal);
        if (state.mode === 'title' && (keyWasPressed('Enter') || gamepadWasPressed(0) || gamepadWasPressed(9))) startGame();
    },
};
