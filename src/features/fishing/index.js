import { buildAquarium, refreshAquarium } from './aquarium.js';
import { FISH } from './fish-list.js';
import { buildPier } from './pier.js';
import { RippleDrawer } from './ripples.js';
import { save } from './save.js';
import { buildFishingSpots } from './spots.js';
import { events } from '../../game/events.js';
import { addHudCounter } from '../../ui/hud.js';
import { addJournalSection, addTodo } from '../../ui/journal.js';
import { addReturnCheck } from '../../ui/title.js';

// Cosmic fishing: cast into the pond, the open sky off the Void Pier, or the moon pool, then keep the fish or let it go.
function journalRows()
{
    const got = FISH.filter((f)=> save.fish[f.id]).length;
    return [
        ['transparent', `${got} of ${FISH.length} species found`, `${save.aquarium.length} swimming in your aquarium, ${save.released} released to the sky.`, '', false, got === FISH.length],
        ...FISH.map((f)=>
        {
            const n = save.fish[f.id];
            return [n ? f.css : 'rgba(255,255,255,.08)', n ? f.name : 'Not yet caught', n ? f.desc : f.hint, n ? `×${n} · best ${save.best[f.id]} cm` : '★'.repeat(f.stars), !n];
        }),
    ];
}
export const fishingFeature = {
    build()
    {
        buildFishingSpots();
        buildPier();
        addHudCounter('fishCount', ()=> Object.values(save.fish).reduce((a, b)=> a + b, 0));
        addReturnCheck(()=> Object.keys(save.fish).length > 0);
        addJournalSection('fish', 10, journalRows);
        addTodo(10, 'Catch a fish in Starlight Pond', ()=> FISH.some((f)=> f.where === 'pond' && save.fish[f.id]));
        addTodo(20, 'Cast a line off the Void Pier into open space', ()=> FISH.some((f)=> f.where === 'void' && save.fish[f.id]));
        addTodo(80, 'Catch the Starwhale Calf', ()=> !!save.fish.calf);
        events.on('house-entered', refreshAquarium);
    },
    buildLate()
    {
        new RippleDrawer;
        buildAquarium();
    },
};
