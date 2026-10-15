// The books on the shelf, read as little storybooks. Content only.
// Pages are kinetic markup (src/ui/kinetic.js): *glow* warm, ~drift~ floating, _hush_ small, !big! lands large.
// A marker wraps a single word, with its punctuation inside: *stars.* not *stars*.
// cover is the binding's hue (0..1), motif the little mark printed at the foot of each page.

export const BOOKS = [
    { title: 'A Field Guide to Falling Stars', cover: .13, motif: '✦', pages: [
        'Chapter One, in which we learn that stars do not ~fall~ so much as ~wander~ off.',
        'A star gets distracted by something shiny below it, a pond or a lantern or a moth, and simply _forgets_ to stay up.',
        'When it lands, it glows for a while out of !embarrassment.! This is the best time to collect it. Be polite. Do not point.',
        'Stardust keeps *forever* in a jar. It does, however, prefer a jar with a ~view.~',
        'And if you find one still warm, hold it for a moment before you put it away. It has come a _very_ long way to be *here.*'] },
    { title: 'The Moth Who Wanted the Moon', cover: .72, motif: '☾', pages: [
        'There was once a moth who flew toward the *moon* every single night.',
        'She flew until her wings ached, and the moon stayed exactly as ~far~ ~away~ as it had always been.',
        'One night she was too tired to fly. So she sat on a swing instead, and went back and forth, back and forth, _higher_ and _higher._',
        'At the very top of the very last swing, she reached out a hand...',
        '...and the moon, which had been watching her !all! !along,! reached *back.*',
        'She never did get any closer. But after that, the moon always waited up for her. _The_ _end._'] },
    { title: 'Tea for One, Tea for Two', cover: .05, motif: '❦', pages: [
        'A recipe for night tea. You will need: one kettle, one fire, and a pinch of ~patience.~',
        'Hang the kettle over the fire. Do not watch it. A watched kettle gets _shy._',
        'Wait for the !whistle.! Pour slowly. Steam is only the tea saying *hello.*',
        'Hold the cup in both hands, even if it is not cold out. _Especially_ if it is not cold out.',
        'If someone else is in the room, make it tea for *two.* If no one is, make it for two anyway. Someone may be ~on~ ~the~ ~way.~'] },
    { title: 'Navigation by Snail', cover: .32, motif: '∿', pages: [
        'Step one: decide where you are going.',
        'Step two: !forget.!',
        'Step three: arrive somewhere ~better.~',
        'The snail does not hurry, and the snail is never _late._ Everywhere a snail goes, it was always going to get there *eventually.*',
        'This book was written over a period of eleven years. The author would like to thank the moss, the rain, and one very _patient_ leaf.'] },
    { title: 'Letters from the Star Whale', cover: .55, motif: '✺', pages: [
        'Dear small island. I have been circling you for a long, ~long~ time.',
        'Out here it is very cold and very dark, and you are the *warmest* thing I have ever seen.',
        'If you ever hear me singing, I am only saying hello. If you sing back, I will hear you. Even if you only _hum._',
        'I have lost one of my little ones somewhere near you. It is small and blue and it hums when it is held.',
        'If you find it, I hope you will be !kind.! I think you will. You have that sort of *light.*',
        '_With_ _love,_ the Whale. P.S. I am the large shape in the sky. You cannot miss me. ~Wave~ if you like.'] },
];
