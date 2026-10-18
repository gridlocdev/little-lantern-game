// Plays the game as a phone would: a 390 × 844 touch screen, real touch events, no mouse or keys.
//
//   electron tools/phone.mjs <scenario.mjs> [out folder]     (just phone <scenario>)
//
// A scenario is a module whose default export is an async function given { tap, drag, hold, touch, shot, js, wait,
// el }, run against a fresh save. Screenshots go to the out folder (tmp by default). It exits non-zero on a page error.
import { app, BrowserWindow, net, protocol } from 'electron';
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

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.commandLine.appendSwitch('touch-events', 'enabled');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(async ()=>
{
    protocol.handle('app', (req)=>
    {
        const file = path.join(ROOT, decodeURIComponent(new URL(req.url).pathname));
        if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) return new Response('not found', { status: 404 });
        return net.fetch(pathToFileURL(file).toString());
    });
    const win = new BrowserWindow({ width: W, height: H, useContentSize: true, show: false, webPreferences: { partition: `phone-${Date.now()}`, backgroundThrottling: false } });
    const errors = [];
    const cdp = win.webContents.debugger;
    const send = (m, p)=> cdp.sendCommand(m, p);
    win.webContents.on('console-message', (e)=> { if (e.level === 'error') errors.push(e.message); if (e.level === 'warning' || e.level === 'error') console.log(`[page ${e.level}] ${e.message}`); });
    win.webContents.on('render-process-gone', (e, d)=> errors.push(`renderer gone: ${d.reason}`));
    const wait = (ms)=> new Promise((r)=> setTimeout(r, ms));
    const js = (code)=> win.webContents.executeJavaScript(code);
    const pts = (list)=> list.map(([x, y], id)=> ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 }));
    // touch(points) keeps those fingers down (moved to where they are given); touch([]) lifts them all
    let down = 0;
    async function touch(list)
    {
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
    // the centre of an element, by CSS selector, or null when it is hidden or absent
    const el = (sel)=> js(`(()=>{ const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? [r.x + r.width / 2, r.y + r.height / 2] : null; })()`);
    let n = 0;
    async function shot(name)
    {
        const img = await win.webContents.capturePage();
        const file = path.join(OUT, `${String(++n).padStart(2, '0')}-${name}.png`);
        fs.writeFileSync(file, img.resize({ width: W }).toPNG());
        console.log(`shot ${file}`);
    }
    try
    {
        cdp.attach('1.3');
        await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
        await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        await send('Emulation.setEmitTouchEventsForMouse', { enabled: false });
        await win.loadURL('app://game/index.html');
        await wait(1500);
        const run = (await import(pathToFileURL(scenario).toString())).default;
        await run({ tap, drag, hold, touch, shot, js, wait, el, W, H });
    }
    catch (e) { console.error(e); process.exitCode = 1; }
    if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exitCode = 1; }
    app.quit();
});
