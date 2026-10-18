// What Oswin the snail says. Content only. Lines may use the kinetic markup in ui/kinetic.js.
//
// Oswin is old, grand and very pleased with himself: a poet, an explorer and (he will tell you) the fastest snail on
// the island, which is true, because he is the only one. He talks like he is on a stage, wanders off into his own
// stories, adores fish, and is kinder than he lets on.

// the first time you talk to him, one line per shot of the meeting cutscene
export const SNAIL_MEETING = {
    hello: 'Oh! A *lantern,* out walking! At this hour! How _marvellous._',
    name: 'I am ~Oswin.~ Poet. Explorer. The *fastest* snail on the island.',
    house: 'I carry my house on my *back,* you see...',
    home: '...so wherever I stop is _home._ I have been home here since Tuesday.',
    pond: 'Now. The pond by the crooked house is full of fish that *fell* out of the sky. Fell! Imagine!',
    fish: 'Stand at the edge, and you can ^fish!^ for them. Oh, I do love a fish.',
};

// after that, one of these each time he chats, in order
export const SNAIL_LINES = [
    ['Back again, little lantern? Splendid. The pond, remember. Stand at the edge and the fish practically ^leap^ at you.',
        'Well. They practically consider it.'],
    ['The crystals on Amethyst Hill each hum one note. Someone carved a song on the stone up there.',
        'Play it in order and the moon may answer. I tried once. I was three notes in when the sun came up.'],
    ['The swing on the willow hill goes higher if you lean in at the very top.',
        'Let go at the top and your wings will do the rest. I have no wings. I simply believe very hard.'],
    ['Stars fall here sometimes. Look for a pillar of light and run to it before it fades.',
        'Run! You see why I leave the falling stars to you.'],
    ['The pier on the south edge goes nowhere at all, which is exactly why the strangest fish live at the end of it.',
        'I wrote a poem about it. It goes: _"Pier."_ It is a work in progress.'],
    ['The telescope on Observatory Hill sees shapes in the stars. Hold it still on one and the shape will show itself.',
        'There is also something very large out there that sings. Do not be frightened. It only wants company. Like me!'],
    ['If you are tired, your bed will take you to a different sky.', 'I have been asleep for most of this conversation. Very restful.'],
];

// talking to him once you have met: what he asks, and the answers on offer
export const SNAIL_ASK = {
    first: 'You know, little lantern... you have the look of a *racer.*',
    again: 'Ah, my rival returns! Shall we see whose shell is *shinier* today?',
    race: 'Race!',
    chat: 'Just chat',
    bye: 'Goodbye',
};

// the first race: he lays down the challenge, then the countdown. Keyed by beat.
export const RACE_CHALLENGE = {
    dare: 'A *race!* You and me. Lantern against shell.',
    route: 'Up the road to that little *light* I have set out...',
    back: '...touch it, and back to me. First one home ^wins!^',
    boast: 'I should warn you. I have never lost a race. I have also never _had_ one.',
};
// how to run, by what the player is holding; the race is a lesson in running
export const RUN_TIP = {
    keys: 'A tip, from one athlete to another: hold *Shift,* and those little legs will really _go._',
    pad: 'A tip, from one athlete to another: hold the right *bumper,* and those little legs will really _go._',
    touch: 'A tip, from one athlete to another: push your thumb all the way *out,* and those little legs will really _go._',
};
export const RACE_COUNT = { ready: 'On your marks...', go: '^Go!^' };

// while racing, on the bar at the bottom of the screen
export const RACE_HUD = { out: 'Touch the light', back: 'Back to Oswin!', ahead: 'You are ahead', behind: 'Oswin is ahead' };

// at the finish, one line per beat
export const RACE_WIN = {
    gasp: '_Well._ Well, well, well.',
    praise: 'You are a *marvel,* little lantern. A ~blur~ with a lantern on it!',
    pride: 'I let you win, of course. ...I did not let you win. Again sometime?',
};
export const RACE_LOSE = {
    cheer: 'The shell ^triumphs!^ Ha! Ha ha!',
    tip: 'Do not be glum. Try running this time. Your legs have a second gear!',
    again: 'Talk to me when you want a rematch. I will be here. I am always here.',
};
// what toasts say about the result; {s} is the time in seconds
export const RACE_TOASTS = {
    time: 'Your time: {s} seconds',
    best: 'A new best: {s} seconds!',
    prize: 'Oswin gives you 3 specks of stardust he was saving for a special occasion.',
    lost: 'Oswin waits at the start line, a little puzzled.',
};
