// Reading the books on the shelf, as a little scene: the mothling takes the book down, walks to the armchair and
// sits, the camera comes round to face it, and the book opens beside it as a storybook. Afterwards it gets up,
// walks back and puts the book away.
import { MOBILE, keyWasPressed, timeDelta, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { BOOKS } from './books-data.js';
import { CHAIR, SHELF, hin } from './plan.js';
import { save } from './save.js';
import { activity } from '../../game/activity.js';
import { writeSave } from '../../game/state.js';
import { wrapAngle } from '../../lib/math.js';
import { clearTouchPresses, input } from '../../platform/input.js';
import { moth } from '../../player/mothling.js';
import { player } from '../../player/player.js';
import { say } from '../../ui/dialog.js';
import { openStorybook, storybook } from '../../ui/storybook.js';

export function chooseBook()
{
    say('The bookshelf', 'Which one?', BOOKS.map((b, i)=> ({
        label: (save.books[i] ? '' : '★ ') + b.title,
        fn: ()=> readBook(i),
    })).concat([/** @type {any} */ ({ label: 'Never mind', cancel: true })]));
}

const WALK = 2.2;                                            // asked of the walk; it eases to about 1.7 m/s
const SHELF_SPOT = ()=> hin(SHELF.x + 1, 0, SHELF.z);        // standing at the shelf
const CHAIR_SPOT = ()=> hin(CHAIR.x, 0, CHAIR.z - 1.05);     // standing in front of the chair, by the fire
const SEAT = ()=> hin(CHAIR.x, .6, CHAIR.z + .1);
const ROUTE = ()=> [hin(SHELF.x + 1.7, 0, CHAIR.z - 1.05), CHAIR_SPOT()];     // round the side of the chair
const FACE_SHELF = Math.PI / 2, FACE_FIRE = 0;

function readBook(i)
{
    const book = BOOKS[i];
    save.books[i] = true; writeSave();
    const floorY = player.pos.y;
    const at = (p)=> vec3(p.x, floorY, p.z);
    // the scene is a list of steps, each run until it says it is done
    let steps, step = 0, t = 0, seated = false, path = [];
    const turnTo = (yaw, rate = 5)=> { const d = wrapAngle(yaw - player.yaw); player.yaw += d * Math.min(1, timeDelta * rate); return Math.abs(d) < .05; };
    const walk = ()=>
    {
        const to = path[0];
        if (!to) { player.vel = vec3(); return true; }
        const d = vec3(to.x - player.pos.x, 0, to.z - player.pos.z);
        if (d.length() < .12) { path.shift(); return false; }
        turnTo(Math.atan2(-d.x, -d.z), 8);
        player.vel = d.normalize(WALK);
        return false;
    };
    const sitDown = (from, to)=> { const k = Math.min(1, t / .6); player.pos = from.lerp(to, k * k * (3 - 2 * k)); player.vel = vec3(); return k >= 1; };
    steps = [
        // to the shelf, if not already there, then take the book down
        ()=> { if (t === 0) path = [at(SHELF_SPOT())]; return walk(); },
        ()=> { if (t === 0) moth.reach = 1; if (t > .45 && player.hold !== 'book') { player.hold = 'book'; playSfx('tok', undefined, .5); } return turnTo(FACE_SHELF) && t > .9; },
        // across the room to the chair, turn round and sit
        ()=> { if (t === 0) path = ROUTE().map(at); player.pose = 'book'; return walk(); },
        ()=> turnTo(FACE_FIRE, 6),
        ()=> { player.pose = 'read'; return sitDown(at(CHAIR_SPOT()), SEAT()); },
        ()=> { seated = true; player.pos = SEAT(); return t > 1.6; },     // the camera comes round first
        // reading, until the last page is closed or you stop
        ()=>
        {
            if (t === 0) openStorybook(book);
            player.pos = SEAT();
            storybook.update();
            const next = input.act() || input.jump() || keyWasPressed('ArrowRight') || keyWasPressed('KeyD');
            if (keyWasPressed('ArrowLeft') || keyWasPressed('KeyA')) storybook.back();
            if (input.back() || (next && !storybook.next())) { storybook.close(); clearTouchPresses(); return true; }
            return false;
        },
        ()=> { player.pos = SEAT(); return t > .5; },
        // up, back across the room, and the book goes back on the shelf
        ()=> { if (t === 0) { seated = false; player.pose = 'book'; } return sitDown(SEAT(), at(CHAIR_SPOT())); },
        ()=> { if (t === 0) path = [...ROUTE().map(at).reverse().slice(1), at(SHELF_SPOT())]; return walk(); },
        ()=> { if (t === 0) { player.pose = 'free'; moth.reach = 1; } if (t > .45 && player.hold === 'book') { player.hold = 'lantern'; playSfx('tok', undefined, .45, .9); } return turnTo(FACE_SHELF) && t > .9; },
    ];
    const end = ()=>
    {
        storybook.close();
        player.pose = 'free'; player.hold = 'lantern'; player.vel = vec3();
        if (seated || step < steps.length) player.pos = at(SHELF_SPOT());
        seated = false;
        activity.end();
    };
    // the reading camera: off to the side of the hearth, turned back to the mothling in the chair, which sits left of
    // middle so the open book beside it does not cover it
    const readCam = ()=>
    {
        const pos = hin(CHAIR.x + 1.5, 1.7, CHAIR.z - 1.75), at = SEAT().add(vec3(0, .35, 0));
        const right = at.subtract(pos).cross(vec3(0, 1, 0)).normalize();
        return { pos, look: at.add(right.scale(.6)), fov: .78, snap: 3 };
    };
    activity.start({
        get name() { return seated ? 'reading-seat' : 'reading'; },
        ownsPhysics: true, lockCamera: true, camBlend: 2.4, camBlendOut: 2.2,
        get pinned() { return step >= 4 && step <= 8; },     // sitting down, reading, getting up
        get cam() { return seated ? readCam : undefined; },
        update()
        {
            if (this.pinned) player.speed = 0;      // sitting still while it places the mothling
            // Q while walking about skips the rest; while reading it closes the book (the step above handles that)
            if (step !== 6 && input.back()) { clearTouchPresses(); return end(); }
            if (steps[step]()) { step++; t = 0; if (step >= steps.length) return end(); }
            else t += timeDelta;
        },
        cancel: end,
        hint: ()=> step === 6 ? '' : `${MOBILE ? 'Jump' : 'Q'}|Skip`,
    });
}
