// The night under the music: crickets all around (muffled indoors), water lapping near the pond and the moon pool, a
// frog now and then by the water, and the faint crackle of an old record that comes and goes with the music. The
// sounds are built from night-sounds.js once the dream starts, one a frame, and each sits at a set loudness.
import { audioContext, audioMasterGain } from '../platform/engine.js';
import { state } from '../game/state.js';
import { player } from '../player/player.js';
import { music } from './music.js';
import { crackle, crickets, frog, rms, water } from './night-sounds.js';
import { nearness } from './places.js';

// loudness in dB RMS (frogs: peak), against the music's -26
const DB = { crickets: -38, cricketsIndoors: -50, water: -34, crackle: -48, frog: -24 };
const EASE = 1.2;           // seconds (time constant) for a bed to follow where you are
const FROG_GAP = [5, 16];   // seconds between frogs, when you are by the water

const fromDb = (db)=> 10 ** (db / 20);
const make = { crickets, water, crackle, frogs: ()=> [0, 1, 2].map((v)=> [frog(v)]) };
const beds = {};            // name → { gain, scale } once built
let frogs = null, nextFrog = 0, muffle = null, built = 0;
const todo = Object.keys(make);

function toBuffer(chans)
{
    const buf = audioContext.createBuffer(chans.length, chans[0].length, 44100);
    chans.forEach((c, i)=> buf.copyToChannel(c, i));
    return buf;
}
// builds the next sound, and starts it if it is a loop
function buildNext()
{
    const name = todo[built++];
    const chans = make[name]();
    if (name === 'frogs') { frogs = chans.map((c)=> ({ buf: toBuffer(c), scale: 1 })); return; }
    const src = audioContext.createBufferSource();
    src.buffer = toBuffer(chans);
    src.loop = true;
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    let out = src.connect(gain);
    // the crickets go through a low-pass that closes when you go indoors
    if (name === 'crickets') { muffle = audioContext.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000; out = out.connect(muffle); }
    out.connect(audioMasterGain);
    src.start();
    beds[name] = { gain, scale: 1 / rms(chans) };
}
function playFrog(level)
{
    const f = frogs[Math.floor(Math.random() * frogs.length)];
    const src = audioContext.createBufferSource();
    src.buffer = f.buf;
    src.playbackRate.value = .9 + Math.random() * .2;
    const gain = audioContext.createGain(), pan = audioContext.createStereoPanner();
    gain.gain.value = fromDb(DB.frog) * level * (.5 + Math.random() * .5);
    pan.pan.value = Math.random() * 1.6 - .8;
    src.connect(gain).connect(pan).connect(audioMasterGain);
    src.onended = ()=> pan.disconnect();
    src.start();
}

function updateNight()
{
    if (!audioContext || !music.started) return;
    if (built < todo.length) { try { buildNext(); } catch (e) { built = todo.length; } return; }
    const now = audioContext.currentTime, playing = state.mode === 'play';
    const indoors = player.zone === 'house', wet = nearness('water');
    const set = (name, db)=> { const b = beds[name]; if (b) b.gain.gain.setTargetAtTime(playing && db > -99 ? fromDb(db) * b.scale : 0, now, EASE); };
    set('crickets', indoors ? DB.cricketsIndoors : DB.crickets);
    set('water', wet > 0 ? DB.water + 20 * Math.log10(wet) : -100);
    set('crackle', music.on ? DB.crackle : -100);
    muffle?.frequency.setTargetAtTime(indoors ? 900 : 20000, now, EASE);
    if (frogs && playing && wet > .3 && now > nextFrog)
    {
        if (nextFrog) playFrog(wet);
        nextFrog = now + FROG_GAP[0] + Math.random() * (FROG_GAP[1] - FROG_GAP[0]);
    }
}

export const nightSystem = { always: true, update: updateNight };
