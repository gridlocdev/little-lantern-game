// Sends each frame's input to whatever has it: an open dialog, an open card, the menu and journal keys, or the
// current activity. Runs before the mothling moves.
import { gamepadWasPressed, keyWasPressed } from '../platform/engine.js';
import { activity } from '../game/activity.js';
import { input } from '../platform/input.js';
import { updateDialog } from './dialog.js';
import { ui } from './dom.js';
import { openJournal } from './journal.js';
import { openMenu } from './menu.js';
import { updateModals } from './modal.js';

export const routerSystem = {
    update()
    {
        if (ui.dialog) updateDialog();
        else if (ui.modal) updateModals();
        else if (!activity.current && (keyWasPressed('Escape') || gamepadWasPressed(9))) openMenu();
        else if (activity.current && gamepadWasPressed(9)) openMenu();
        else if (!activity.current && input.journal()) openJournal();
        else if (activity.current) activity.current.update();
    },
};
