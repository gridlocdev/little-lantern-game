// Going in and out of the house.
import { PI, rand, randInt, render3D, vec3 } from '../../platform/engine.js';
import { playSfx } from '../../audio/sfx.js';
import { CAT_SPOTS } from './cat.js';
import { HOUSE, hin } from './plan.js';
import { furniture } from './room-state.js';
import { events } from '../../game/events.js';
import { countVisit } from '../../game/progress.js';
import { player } from '../../player/player.js';
import { cam } from '../../render/camera.js';
import { fadeTransition } from '../../ui/fade.js';
import { showPlace } from '../../ui/toast.js';
import { heightAt } from '../../world/terrain.js';

export function enterHouse()
{
    playSfx('door', player.pos, .9);
    fadeTransition(()=>
    {
        moveInside();
        render3D.camera.pos = cam.look.add(vec3(0, 8, 8));
        showPlace('Home', 'the kettle is still warm');
        if (rand() < .5 && furniture.cat) furniture.cat.moveTo(randInt(CAT_SPOTS.length));
    });
}
// the mothling steps in through the front door; the room catches up with the time away
export function moveInside()
{
    player.zone = 'house';
    player.pos = hin(-3.5, 0, 3.2);
    player.vel = vec3();
    player.yaw = 0;
    cam.look = player.pos.add(vec3(0, .9, 0));
    countVisit();
    events.emit('house-entered');
    furniture.flower && furniture.flower.sync();
}
export function exitHouse()
{
    playSfx('door', player.pos, .9);
    fadeTransition(()=>
    {
        player.zone = 'island';
        const d = HOUSE.door;
        player.pos = vec3(d.x, heightAt(d.x, d.z), d.z + .4);
        player.vel = vec3();
        player.yaw = PI;
        cam.yaw = PI; cam.pitch = .3;
        cam.look = player.pos.add(vec3(0, 1.1, 0));
        if (player.hold === 'cup') player.hold = 'lantern';
    });
}
