// Plays the game as a phone would: a 390 × 844 touch screen, real touch events, no mouse or keys.
//
//   electron tools/phone.mjs <scenario.mjs> [out folder]     (just phone <scenario>)
//
// A scenario is a module whose default export is an async function given { tap, drag, hold, touch, shot, js, wait,
// el }, run against a fresh save. Screenshots go to the out folder (tmp by default). It exits non-zero on a page error.
import { app, BrowserWindow, net, protocol, session } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(process.defaultApp ? 2 : 1);
const scenario = path.resolve(args[0] ?? '');
const OUT = path.resolve(args[1] ?? fs.mkdtempSync(path.join(os.tmpdir(), 'phone-')));
const W = Number(process.env.PHONE_W || 390), H = Number(process.env.PHONE_H || 844);
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
// each step is printed as it starts, so a crash shows how far it got
const step = (s)=> console.log(`phone: ${s}`);
step(`electron ${process.versions.electron}, ${W} x ${H}`);

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.commandLine.appendSwitch('touch-events', 'enabled');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(async ()=>
{
    step('ready');
    // a fresh session per run (a clean save); a custom protocol is per session, so it is registered on this one
    const ses = session.fromPartition(`phone-${Date.now()}`);
    ses.protocol.handle('app', (req)=>
    {
        const file = path.join(ROOT, decodeURIComponent(new URL(req.url).pathname));
        if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) return new Response('not found', { status: 404 });
        return net.fetch(pathToFileURL(file).toString());
    });
    step('window');
    const win = new BrowserWindow({ width: W, height: H, useContentSize: true, show: false, webPreferences: { session: ses, backgroundThrottling: false } });
    win.showInactive();     // shown (without taking focus): a hidden window may not render or scroll like a real one
    const errors = [];
    const cdp = win.webContents.debugger;
    // every command has a time limit, so one the page never answers fails the run with its name instead of hanging it
    const limit = (what, promise, ms = 8000)=> Promise.race([promise, new Promise((_, no)=> setTimeout(()=> no(new Error(`${what}: no answer in ${ms / 1000} s`)), ms))]);
    const send = (m, p)=> limit(`${m} ${p?.type ?? ''}`.trim(), cdp.sendCommand(m, p));
    win.webContents.on('console-message', (e)=> { if (e.level === 'error') errors.push(e.message); if (e.level === 'warning' || e.level === 'error') console.log(`[page ${e.level}] ${e.message}`); });
    win.webContents.on('render-process-gone', (e, d)=> errors.push(`renderer gone: ${d.reason}`));
    const wait = (ms)=> new Promise((r)=> setTimeout(r, ms));
    const js = (code)=> limit(`page script: ${code.slice(0, 60)}`, win.webContents.executeJavaScript(code));
    const pts = (list)=> list.map(([x, y], id)=> ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 }));
    // touch(points) keeps those fingers down (moved to where they are given); touch([]) lifts them all
    let down = 0;
    async function touch(list)
    {
        for (const [x, y] of list) if (x < 0 || y < 0 || x >= W || y >= H) throw new Error(`touch at ${x.toFixed(0)}, ${y.toFixed(0)} is off the ${W} x ${H} screen`);
        const type = !list.length ? 'touchEnd' : down ? 'touchMove' : 'touchStart';
        await send('Input.dispatchTouchEvent', { type, touchPoints: pts(list) });
        down = list.length;
    }
    const tap = async (x, y, ms = 80)=> { await touch([[x, y]]); await wait(ms); await touch([]); await wait(120); };
    const hold = async (x, y, ms)=> tap(x, y, ms);
    async function drag(from, to, ms = 400, steps = 12, also = null)
    {
        for (let i = 0; i <= steps; i++)
        {
            const k = i / steps, p = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
            await touch(also ? [p, also] : [p]);
            await wait(ms / steps);
        }
        await touch([]);
        await wait(120);
    }
    // the centre of an element, by CSS selector, scrolled into view first, or null when it is hidden or absent
    const el = (sel)=> js(`(()=>{ const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return r.width && r.height ? [r.x + r.width / 2, r.y + r.height / 2] : null; })()`);
    let n = 0;
    async function shot(name)
    {
        const img = await limit('screenshot', win.webContents.capturePage());
        const file = path.join(OUT, `${String(++n).padStart(2, '0')}-${name}.png`);
        fs.writeFileSync(file, img.resize({ width: W }).toPNG());
        console.log(`shot ${path.basename(file)}`);
    }
    try
    {
        // the debugger and emulation need a page to attach to: commands sent to a window that has never loaded one
        // crash Electron (SIGSEGV), so a blank page comes first
        step('blank page');
        await win.loadURL('about:blank');
        step('debugger');
        cdp.attach('1.3');
        step('emulate the screen');
        await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
        step('emulate touch');
        await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        step('load');
        await win.loadURL('app://game/index.html');
        step('scenario');
        await wait(1500);
        const run = (await import(pathToFileURL(scenario).toString())).default;
        await run({ tap, drag, hold, touch, shot, js, wait, el, W, H, step });
        console.log(`screenshots: ${OUT}`);
    }
    catch (e) { console.error(e); process.exitCode = 1; }
    if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exitCode = 1; }
    app.quit();
});
