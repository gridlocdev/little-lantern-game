// The wardrobe and its outfits.
import { playSfx } from '../../audio/sfx.js';
import { save } from './save.js';
import { core, setOutfit } from '../../game/progress.js';
import { writeSave } from '../../game/state.js';
import { OUTFITS } from '../../player/outfits.js';
import { player } from '../../player/player.js';
import { sparkleColumn } from '../../render/particles.js';
import { say } from '../../ui/dialog.js';

export function openWardrobe()
{
    playSfx('door', player.pos, .5, 1.5);
    say('The wardrobe', 'Scarves and wing dust in every color. Which look tonight?', OUTFITS.map((o, i)=> ({
        label: (i === core.outfit ? '✓ ' : '') + o.name,
        fn: ()=>
        {
            setOutfit(i);
            save.outfitsTried = [...new Set([...(save.outfitsTried || [0]), i])];
            writeSave();
            sparkleColumn(player.pos, o.spot, 30, 1.2);
            playSfx('collect', player.pos, .5, 1.3);
        },
    })).slice(0, 6));
}
