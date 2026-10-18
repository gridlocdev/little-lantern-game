// The soundtrack: one entry per file in music/. Written by tools/music/render.mjs (just music); don't edit by hand.
// Content only. Times are seconds into the file. offset is where the first beat falls, so beats sit at
// offset + n * 60 / tempo, and end is where the last bar ends (a one-shot's reverb rings on after it). loop is the
// part a looping track repeats, start and end on bar lines; null plays once. frames at rate is the file's exact
// length, for checking a decoder trimmed the mp3's encoder delay. A layer (layerOf) plays in step with that track,
// up to its level, the nearer the player is to its place.
export const TRACKS = {
    "intro": {
        "file": "music/intro.mp3",
        "title": "Out of the Sky",
        "tempo": 66,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": 36.41364,
        "seconds": 40.4137,
        "frames": 1782242,
        "rate": 44100,
        "loop": null
    },
    "house": {
        "file": "music/house.mp3",
        "title": "The Kettle Is Still Warm",
        "tempo": 70,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 151.1571,
        "frames": 6666030,
        "rate": 44100,
        "loop": {
            "start": 13.76429,
            "end": 150.90714
        }
    },
    "outside": {
        "file": "music/outside.mp3",
        "title": "Lanterns in the Grass",
        "tempo": 68,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 169.7118,
        "frames": 7484289,
        "rate": 44100,
        "loop": {
            "start": 0.05,
            "end": 169.46176
        }
    },
    "outside-pond": {
        "file": "music/outside-pond.mp3",
        "title": "The Water Hums",
        "tempo": 68,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 56.7706,
        "frames": 2503583,
        "rate": 44100,
        "loop": {
            "start": 0.05,
            "end": 56.52059
        },
        "layerOf": "outside",
        "place": "pond",
        "level": 0.75
    },
    "outside-crystal": {
        "file": "music/outside-crystal.mp3",
        "title": "Glass on the Hill",
        "tempo": 68,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 56.7706,
        "frames": 2503583,
        "rate": 44100,
        "loop": {
            "start": 0.05,
            "end": 56.52059
        },
        "layerOf": "outside",
        "place": "crystal",
        "level": 0.7
    },
    "outside-cabin": {
        "file": "music/outside-cabin.mp3",
        "title": "Someone Is Home",
        "tempo": 68,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 56.7706,
        "frames": 2503583,
        "rate": 44100,
        "loop": {
            "start": 0.05,
            "end": 56.52059
        },
        "layerOf": "outside",
        "place": "cabin",
        "level": 0.7
    },
    "outside-beam": {
        "file": "music/outside-beam.mp3",
        "title": "Something Fell Here",
        "tempo": 68,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 56.7706,
        "frames": 2503583,
        "rate": 44100,
        "loop": {
            "start": 0.05,
            "end": 56.52059
        },
        "layerOf": "outside",
        "place": "beam",
        "level": 0.8
    },
    "race": {
        "file": "music/race.mp3",
        "title": "Oswin Is Faster Than He Looks",
        "tempo": 132,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 62.1182,
        "frames": 2739412,
        "rate": 44100,
        "loop": {
            "start": 3.68636,
            "end": 61.86818
        }
    },
    "ending": {
        "file": "music/ending.mp3",
        "title": "The Whole Sky Turns",
        "tempo": 72,
        "beatsPerBar": 3,
        "offset": 0.05,
        "end": null,
        "seconds": 90.3,
        "frames": 3982230,
        "rate": 44100,
        "loop": {
            "start": 10.05,
            "end": 90.05
        }
    }
};
