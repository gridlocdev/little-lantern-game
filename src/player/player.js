// The player's state: where the mothling is and what it is doing.
import { vec3 } from '../platform/engine.js';

export const player = {
    pos: vec3(), vel: vec3(), yaw: 0, onGround: true, zone: 'island',
    glide: false, groundY: 0, lastSafe: vec3(), standing: undefined, airTime: 0, bounceChain: 0,
    hold: 'lantern', pose: 'free', poseT: 0, lockMove: false, speed: 0, fallTimer: 0,
    swing: null,     // the swing's state while swinging
    hidden: false,   // not drawn, while the camera is where the mothling stands
};
