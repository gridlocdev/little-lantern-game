// Sitting on things, as an activity.
import { MOBILE, max, vec3 } from '../platform/engine.js';
import { activity } from '../game/activity.js';
import { clearTouchPresses, input } from '../platform/input.js';
import { player } from './player.js';
import { groundInfo } from '../world/ground.js';

export function startSit(seat, faceYaw, opts = {})
{
    player.yaw = faceYaw;
    player.pos = vec3(seat.x, seat.y + (opts.height ?? .45), seat.z);
    player.vel = vec3();
    player.pose = opts.pose || 'sit';
    const fromPos = player.pos.copy();
    activity.start({
        name: 'sit', ownsPhysics: true,
        update()
        {
            player.pos = fromPos.copy(); player.vel = vec3();
            if (opts.update) opts.update();
            if (input.move().length() > .4 || input.act() || input.jump() || input.back())
            {
                clearTouchPresses();
                activity.end();
                player.pose = 'free';
                const fwd = vec3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
                const out = seat.add(fwd.scale(opts.out ?? .9));
                const g = groundInfo(out.x, out.z, out.y + 1);
                player.pos = vec3(out.x, max(g.y, out.y), out.z);
                if (opts.onStand) opts.onStand();
            }
        },
        cancel() { activity.end(); player.pose = 'free'; },
        hint: ()=> opts.hint || `${MOBILE ? 'Use' : 'E'}|Get up`,
        cam: opts.cam,
    });
    if (opts.onSit) opts.onSit();
}
