// Reading the books on the shelf.
import { BOOKS } from './books-data.js';
import { save } from './save.js';
import { writeSave } from '../../game/state.js';
import { player } from '../../player/player.js';
import { say } from '../../ui/dialog.js';

export function chooseBook()
{
    say('The bookshelf', 'Which one?', BOOKS.map((b, i)=> ({
        label: (save.books[i] ? '' : '★ ') + b.title,
        fn: ()=>
        {
            player.pose = 'book'; player.hold = 'book';
            save.books[i] = true; writeSave();
            say(b.title, b.pages).then(()=> { player.pose = 'free'; player.hold = 'lantern'; });
        },
    })).concat([/** @type {any} */ ({ label: 'Never mind', cancel: true })]));
}
