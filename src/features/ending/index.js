// The ending: once every thing to do in the journal is done, the next quiet moment outside plays a closing scene and
// then the end card, with the choice to stay and wander or go back to the title.
import { timeDelta, timeReal } from '../../platform/engine.js';
import { END_CARD, ENDING_LINES } from './lines-data.js';
import { playEnding } from './scene.js';
import { activity } from '../../game/activity.js';
import { events } from '../../game/events.js';
import { core } from '../../game/progress.js';
import { state, writeSave } from '../../game/state.js';
import { player } from '../../player/player.js';
import { inCutscene } from '../../ui/cutscene.js';
import { $, uiOpen } from '../../ui/dom.js';
import { todoProgress } from '../../ui/journal.js';
import { closeModal, openModal, registerModal } from '../../ui/modal.js';
import { returnToTitle } from '../../ui/title.js';
import { toast } from '../../ui/toast.js';
import { typeLine } from '../../ui/kinetic.js';

const save = state.slice('ending', { seen: false });
let calm = 0, hinted = false, titleLine = null;

function showEndCard()
{
    $('endThanks').textContent = END_CARD.thanks;
    $('endStay').textContent = END_CARD.stay;
    const { total } = todoProgress();
    $('endStats').innerHTML = '';
    for (const [n, label] of [[total, 'things done'], [core.stardust, 'stardust gathered'], [core.visits + 1, core.visits ? 'nights dreamed' : 'night dreamed']])
    {
        const el = document.createElement('div');
        el.innerHTML = '<b></b><span></span>';
        el.firstElementChild.textContent = String(n); el.lastElementChild.textContent = label;
        $('endStats').append(el);
    }
    openModal('endcard');
    titleLine = typeLine($('endTitle'), `~${END_CARD.title.split(' ').join('~ ~')}~`, { start: timeReal + .5, cps: 6 });
}
$('endKeep').onclick = closeModal;
$('endToTitle').onclick = ()=> { closeModal(); returnToTitle('The island will wait for you.'); };
registerModal('endcard', { update() { titleLine?.update(timeReal); } });

// the house walks the mothling home and puts it to bed, then the end card; without a house, straight to the card
function goHome()
{
    const ending = { lines: { home: ENDING_LINES.home, sleep: ENDING_LINES.sleep }, done: showEndCard, taken: false };
    events.emit('ending-go-home', ending);
    if (!ending.taken) showEndCard();
}
function updateEnding()
{
    if (save.seen || state.mode !== 'play') return;
    const { done, total } = todoProgress();
    if (!total || done < total) { calm = 0; return; }
    // wait for a quiet moment outside: nothing open, nothing going on, standing on the island
    const quiet = !activity.current && !uiOpen() && !inCutscene() && player.onGround;
    if (quiet && player.zone !== 'island' && !hinted) { hinted = true; toast('Everything is done. Step outside, into the night air.', 4200); }
    calm = quiet && player.zone === 'island' ? calm + timeDelta : 0;
    if (calm > 5)
    {
        calm = 0;
        save.seen = true; writeSave();
        playEnding(goHome);
    }
}

export const endingFeature = { update: updateEnding };
