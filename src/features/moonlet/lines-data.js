// What the narrator says when the moon answers the song, in kinetic markup (ui/kinetic.js). Content only.

export const BRIDGE_LINES = {
    hum: 'The moon hums the song *back* to you.',
    west: 'Far to the west, past Cloudsheep Meadow...',
    bridge: '...a bridge of *light* unfolds from the edge of the island.',
    title: '~The~ ~Moonlet~',
    go: 'Somewhere new to explore! Off you go to ^see!^',
};

// Ardea, the night heron who fishes the moon pool. She speaks rarely and in short sentences, gives better fishing tips
// than anyone, and has been waiting a very long time for one fish: the great whale's calf. Each entry is one talk.
export const HERON_NAME = 'Ardea';
export const HERON_STRANGER = 'The night heron';
export const HERON_MEET = [
    '...',
    'Shh. You will scare them.',
    'Ardea. I fish here. Have done for a long time.',
    'I am waiting for one fish. The great whale\'s *calf.*',
    'It comes up when it likes. Not often. Not yet.',
];
// after that, one talk each time, in order; they are all true of the fishing
export const HERON_TIPS = [
    ['Hold to cast. Let go to throw.', 'Hold longer, it flies farther. Then it comes back. Like most things.'],
    ['The little ticks are nibbles. Leave them.', 'Wait for the big dip. Then strike. Quick.'],
    ['On the line, hold to lift. Let go to sink.', 'Keep the fish in your light. Do not chase it. Follow it.'],
    ['The big ones dart, and your light is smaller for them.', 'Stay calm. Small moves.'],
    ['One that slips away is still in the water.', 'Cast again. Patience costs nothing.'],
    ['The pond has small, bright fish. The pier has strange ones.', 'This pool has two. One I am still waiting for.'],
    ['Now and then, a fish is bigger than it should be.', 'Measure everything.'],
    ['...', 'Nothing. I just like the company.'],
];
// the first talk after the player has caught the calf
export const HERON_CALF = [
    'You caught it. The *calf.*',
    '...',
    'All these years. I only wanted to know it was real.',
    'Thank you. Now I can fish for ~fun.~',
];
