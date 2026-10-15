// The crooked house: outside, inside, and everything in it.
import { time, vec3 } from '../../platform/engine.js';
import { music } from '../../audio/music.js';
import { BOOKS } from './books-data.js';
import { buildHouseExterior } from './exterior.js';
import { buildHouseInterior } from './interior.js';
import { drinkTea } from './kettle.js';
import { furniture, houseState } from './room-state.js';
import { save } from './save.js';
import { activity } from '../../game/activity.js';
import { focusItem } from '../../game/interact.js';
import { input } from '../../platform/input.js';
import { OUTFITS } from '../../player/outfits.js';
import { player } from '../../player/player.js';
import { uiOpen } from '../../ui/dom.js';
import { addTodo } from '../../ui/journal.js';

function updateHouse()
{
    if (player.zone !== 'house') return;
    if (furniture.record) furniture.record.rotation3D = vec3(0, music.on ? time * 3 : furniture.record.rotation3D.y, 0);
    if (player.hold === 'cup' && houseState.cupFull && !activity.current && !uiOpen() && !focusItem && input.act()) drinkTea();
}

export const houseFeature = {
    build()
    {
        buildHouseExterior();
        addTodo(150, 'Brew a pot of tea at home', ()=> save.tea > 0);
        addTodo(160, 'Pet the star cat', ()=> save.cat > 0);
        addTodo(170, 'Read every book on the shelf', ()=> Object.keys(save.books).length >= BOOKS.length);
        addTodo(180, 'Grow the moonflower to full bloom', ()=> save.flower >= 4);
        addTodo(190, 'Sleep and wake under a different sky', ()=> save.slept > 0);
        addTodo(200, 'Try on every outfit in the wardrobe', ()=> (save.outfitsTried || []).length >= OUTFITS.length);
    },
    buildLate: buildHouseInterior,
    update: updateHouse,
};
