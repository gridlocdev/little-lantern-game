// Sleeping, and waking under a new sky.
import { PI } from '../../platform/engine.js';
import { DREAMS } from './dreams-data.js';
import { hin } from './plan.js';
import { furniture } from './room-state.js';
import { save } from './save.js';
import { core } from '../../game/progress.js';
import { writeSave } from '../../game/state.js';
import { player } from '../../player/player.js';
import { setPalette } from '../../sky/dome.js';
import { PALETTES } from '../../sky/palettes.js';
import { say } from '../../ui/dialog.js';
import { fadeTransition } from '../../ui/fade.js';

export function goToSleep()
{
    const dream = DREAMS[save.slept % DREAMS.length];
    fadeTransition(()=>
    {
        setPalette(core.palette + 1);
        save.slept++; writeSave();
        player.pos = hin(2.2, 0, -1.6);
        player.yaw = PI / 2;
        if (furniture.cat) furniture.cat.moveTo(2);
        say('', [dream, `You wake under a new sky: ${PALETTES[core.palette].name}.`]);
    }, 1400);
}
