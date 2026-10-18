// The race against Oswin: up the road past him to a light, and back. Numbers only.
//
// It teaches running: the mothling walks at 4.3 m/s and runs at 7.2 (player/movement.js), and Oswin slides at a pace
// in between, so walking the whole way loses and running wins.
export const RACE = {
    road: 1,                        // which of ROAD_DEFS the course follows
    from: { x: 7.6, z: 34.5 },      // the start and finish line, beside Oswin's spot
    to: { x: 13, z: 64 },           // the light to touch
    lane: 1.3,                      // how far each racer starts to either side of the road's middle
    speed: 5.6,                     // Oswin's top speed, m/s
    accel: 3.5,                     // how quickly he gets up to it
    turnPause: .5,                  // seconds he spends turning round at the light
    touch: 2.6,                     // how close counts as touching the light
    finish: 3.2,                    // how close to the line counts as home
    giveUp: 40,                     // wander this far from the road and the race is off
    prize: 3,                       // stardust for the first win
};
