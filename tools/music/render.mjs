// Renders the soundtrack in tools/music/songs.js to music/<id>.mp3 and writes src/audio/tracks-data.js.
//
//   electron tools/music/render.mjs <soundfont-player folder> [track id ...]     (just music)
//
// The songs are composed and played by soundfont-player's own code, unchanged: its composer, sampler, mixer and
// mastering chain, running in a hidden window on an OfflineAudioContext (render-page.js), so a track sounds the way
// it does in soundfont-player, only faster than real time. ffmpeg encodes the result. Then every mp3 is decoded the
// way the game will decode it, to check its length still matches, so the loop points land where they should.
import { app, BrowserWindow, ipcMain, net, protocol } from 'electron';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(ROOT, 'music');
const DATA = path.join(ROOT, 'src', 'audio', 'tracks-data.js');
const args = process.argv.slice(process.defaultApp ? 2 : 1);
const SFP = path.resolve(args[0] ?? path.join(ROOT, '..', 'soundfont-player'));
const only = args.slice(1);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const BITRATE = '160k';
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';     // the render page is local and trusted
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'violet-isle-music-'));

if (!fs.existsSync(path.join(SFP, 'src', 'features', 'composer', 'song-player.js')))
{
    console.error(`no soundfont-player at ${SFP}; pass its folder: just music <path>`);
    process.exit(1);
}

// one origin for everything, so the catalog's relative .sf2 urls resolve against the page:
//   /__render.html, /__render.js, /__songs.js   this folder
//   /__music/<file>                             violet-isle/music, to check the encoded files
//   anything else                               the soundfont-player folder
protocol.registerSchemesAsPrivileged([{ scheme: 'sfp', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const MAP = { '/__render.html': 'render.html', '/__render.js': 'render-page.js', '/__songs.js': 'songs.js' };
function resolve(urlPath)
{
    if (MAP[urlPath]) return path.join(HERE, MAP[urlPath]);
    if (urlPath.startsWith('/__music/')) return path.join(OUT, urlPath.slice(9));
    const file = path.join(SFP, urlPath);
    return file.startsWith(SFP + path.sep) ? file : null;
}

const log = (...a)=> console.log(...a);
ipcMain.handle('log', (e, text)=> log(text));

app.whenReady().then(async ()=>
{
    protocol.handle('sfp', (req)=>
    {
        const file = resolve(decodeURIComponent(new URL(req.url).pathname));
        if (!file || !fs.existsSync(file)) return new Response('not found', { status: 404 });
        return net.fetch(pathToFileURL(file).toString());
    });
    try { await main(); }
    catch (e) { console.error(e); process.exitCode = 1; }
    fs.rmSync(TMP, { recursive: true, force: true });
    app.quit();
});

async function main()
{
    const { TRACKS } = await import(pathToFileURL(path.join(HERE, 'songs.js')).toString());
    const todo = TRACKS.filter((t)=> !only.length || only.includes(t.id));
    if (!todo.length) throw new Error(`no tracks named ${only.join(', ')}`);
    fs.mkdirSync(OUT, { recursive: true });
    const win = new BrowserWindow({
        show: false,
        webPreferences: { preload: path.join(HERE, 'render-preload.cjs'), contextIsolation: false, sandbox: false, backgroundThrottling: false },
    });
    win.webContents.on('console-message', (e)=> { if (e.level === 'error' || e.level === 'warning') log(`  [page] ${e.message}`); });

    const results = {};
    for (const track of todo)
    {
        log(`${track.id}: rendering "${track.spec.title}"`);
        const started = Date.now();
        const done = new Promise((res, rej)=>
        {
            ipcMain.handleOnce('rendered', (e, info, wav)=> { res({ info, wav }); });
            ipcMain.handleOnce('failed', (e, msg)=> { rej(new Error(msg)); });
        });
        await win.loadURL(`sfp://app/__render.html?id=${encodeURIComponent(track.id)}`);
        const { info, wav } = await done;
        ipcMain.removeHandler('rendered'); ipcMain.removeHandler('failed');
        const wavFile = path.join(TMP, `${track.id}.wav`), mp3 = path.join(OUT, `${track.id}.mp3`);
        fs.writeFileSync(wavFile, Buffer.from(wav));
        info.onset = onsetOf(new Float32Array(wav, 44), 2);
        execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wavFile, '-c:a', 'libmp3lame', '-b:a', BITRATE, mp3]);
        log(`  ${info.seconds.toFixed(1)} s in ${((Date.now() - started) / 1000).toFixed(0)} s, gain ${info.gainDb.toFixed(1)} dB, ${(fs.statSync(mp3).size / 1e6).toFixed(2)} MB`);
        results[track.id] = info;
    }

    // decode each file as a browser would and compare its length with what was rendered
    await win.loadURL('sfp://app/__render.html?check=1');
    for (const id of Object.keys(results))
    {
        const got = await win.webContents.executeJavaScript(`checkLength(${JSON.stringify(`/__music/${id}.mp3`)}, ${results[id].sampleRate})`);
        const shift = got.onset - results[id].onset, longer = got.frames - results[id].frames;
        log(`${id}: decodes ${got.frames} frames (${longer >= 0 ? '+' : ''}${longer}), first sound ${shift >= 0 ? '+' : ''}${shift} frames from where it was rendered`);
        // a few frames either way is far below a millisecond; more means the decoder kept the encoder's delay
        if (Math.abs(shift) > 8 || Math.abs(longer) > 64) throw new Error(`${id}.mp3 doesn't decode in step with its render; its loop points would drift`);
    }
    writeData(TRACKS, results);
}

// the first frame of interleaved float samples whose left channel isn't silent
function onsetOf(samples, channels)
{
    for (let i = 0; i < samples.length; i += channels) if (Math.abs(samples[i]) >= 1e-3) return i / channels;
    return samples.length / channels;
}

// keeps entries for tracks not rendered this time
function writeData(TRACKS, fresh)
{
    let old = {};
    if (fs.existsSync(DATA))
    {
        const m = fs.readFileSync(DATA, 'utf8').match(/export const TRACKS = (\{[\s\S]*\});/);
        if (m) old = JSON.parse(m[1]);
    }
    const all = {};
    for (const t of TRACKS)
    {
        const info = fresh[t.id] ?? old[t.id];
        if (!info) continue;
        all[t.id] = {
            file: `music/${t.id}.mp3`, title: info.title, tempo: info.tempo, beatsPerBar: info.beatsPerBar,
            offset: info.offset, end: info.end, seconds: +info.seconds.toFixed(4), frames: info.frames, rate: info.sampleRate ?? info.rate, loop: info.loop,
            ...(t.layerOf && { layerOf: t.layerOf, place: t.place, level: t.level }),
        };
    }
    const body = JSON.stringify(all, null, 4);
    fs.writeFileSync(DATA, `// The soundtrack: one entry per file in music/. Written by tools/music/render.mjs (just music); don't edit by hand.
// Content only. Times are seconds into the file. offset is where the first beat falls, so beats sit at
// offset + n * 60 / tempo, and end is where the last bar ends (a one-shot's reverb rings on after it). loop is the
// part a looping track repeats, start and end on bar lines; null plays once. frames at rate is the file's exact
// length, for checking a decoder trimmed the mp3's encoder delay. A layer (layerOf) plays in step with that track,
// up to its level, the nearer the player is to its place.
export const TRACKS = ${body};
`);
    log(`wrote ${path.relative(ROOT, DATA)}`);
}
