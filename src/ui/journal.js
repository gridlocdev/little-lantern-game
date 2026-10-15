// The dream journal.
import { CONSTELLATIONS } from '../activities.js';
import { FISH } from '../fishing.js';
import { save } from '../game/state.js';
import { BOOKS } from '../house.js';
import { OUTFITS } from '../player/outfits-data.js';
import { PALETTES } from '../sky/palettes.js';
import { $ } from './dom.js';
import { closeModal, openModal } from './modal.js';

// journal
let journalTab = 'fish';
export function openJournal(tab)
{
    if (tab) journalTab = tab;
    renderJournal();
    openModal('journal');
}
document.querySelectorAll('#journal [data-tab]').forEach((b)=> b.onclick = ()=> { journalTab = b.dataset.tab; renderJournal(); });
$('jClose').onclick = closeModal;
const TODO = [
    ['Catch a fish in Starlight Pond', ()=> FISH.some((f)=> f.where === 'pond' && save.fish[f.id])],
    ['Cast a line off the Void Pier into open space', ()=> FISH.some((f)=> f.where === 'void' && save.fish[f.id])],
    ['Swing high enough to touch the moon', ()=> save.swingHigh],
    ['Let go of the swing at the very top and glide', ()=> save.swingFlight],
    ['Play the song carved on Amethyst Hill', ()=> save.bridge],
    ['Cross the light bridge to the Moonlet', ()=> save.moonlet],
    ['Rest in the Moonlet hammock', ()=> save.hammock],
    ['Catch the Starwhale Calf', ()=> !!save.fish.calf],
    ['Bounce five times in a row on the mushrooms', ()=> save.bounceBest >= 5],
    ['Send a wish lantern into the sky', ()=> save.lanterns > 0],
    ['Collect a fallen star', ()=> save.stardust > 0],
    ['Pet a cloud sheep', ()=> save.sheep > 0],
    ['Spot the star whale through the telescope', ()=> save.whale],
    ['Find all four constellations', ()=> Object.keys(save.sky).length >= 4],
    ['Brew a pot of tea at home', ()=> save.tea > 0],
    ['Pet the star cat', ()=> save.cat > 0],
    ['Read every book on the shelf', ()=> Object.keys(save.books).length >= BOOKS.length],
    ['Grow the moonflower to full bloom', ()=> save.flower >= 4],
    ['Sleep and wake under a different sky', ()=> save.slept > 0],
    ['Try on every outfit in the wardrobe', ()=> (save.outfitsTried || []).length >= OUTFITS.length],
];
function renderJournal()
{
    document.querySelectorAll('#journal [data-tab]').forEach((b)=> b.setAttribute('aria-selected', b.dataset.tab === journalTab));
    const body = $('jBody');
    body.innerHTML = '';
    const row = (dotStyle, name, desc, count, missing, check)=>
    {
        const el = document.createElement('div');
        el.className = 'item' + (missing ? ' missing' : '');
        const dot = document.createElement('div');
        if (check !== undefined) { dot.className = 'check' + (check ? ' done' : ''); dot.textContent = check ? '✓' : ''; }
        else { dot.className = 'dot'; dot.style.background = dotStyle; }
        const mid = document.createElement('div');
        mid.style.minWidth = '0';
        const n = document.createElement('div'); n.className = 'nm'; n.textContent = name;
        const d = document.createElement('div'); d.className = 'ds'; d.textContent = desc;
        mid.append(n, d);
        const c = document.createElement('div'); c.className = 'ct'; c.textContent = count || '';
        el.append(dot, mid, c);
        body.appendChild(el);
    };
    if (journalTab === 'fish')
    {
        const got = FISH.filter((f)=> save.fish[f.id]).length;
        row('transparent', `${got} of ${FISH.length} species found`, `${save.aquarium.length} swimming in your aquarium, ${save.released} released to the sky.`, '', false, got === FISH.length);
        for (const f of FISH)
        {
            const n = save.fish[f.id];
            row(n ? f.css : 'rgba(255,255,255,.08)', n ? f.name : 'Not yet caught', n ? f.desc : f.hint, n ? `×${n} · best ${save.best[f.id]} cm` : '★'.repeat(f.stars), !n);
        }
    }
    else if (journalTab === 'island')
    {
        const done = TODO.filter((t)=> t[1]()).length;
        row('transparent', `${done} of ${TODO.length} done`, 'Little things to try while you are here.', '', false, done === TODO.length);
        for (const [name, test] of TODO) row('', name, '', '', false, !!test());
    }
    else
    {
        row('transparent', `Sky: ${PALETTES[save.palette].name}`, 'Sleeping in the house changes which sky you wake under.', '', false, undefined);
        for (const c of CONSTELLATIONS)
        {
            const f = save.sky[c.id];
            row('', f ? c.name : 'An unnamed shape', f ? c.desc : 'Look through the telescope on Observatory Hill.', '', !f, !!f);
        }
        row('', save.whale ? 'The star whale' : 'Something large', save.whale ? 'It circles the island slowly and sings every minute or so.' : 'Something sings out in the dark beyond the island.', '', !save.whale, save.whale);
        row('', `${save.lanterns} wish lanterns`, 'Sent up from the North Overlook.', '', false, save.lanterns > 0);
    }
}
