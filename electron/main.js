// The desktop app: one window running the game, with the save kept in a file in the user's app data folder.
// The game is served over app://game/ instead of file://, so ES modules and the import map load as they do on the web.
import { app, BrowserWindow, ipcMain, net, protocol, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAVE_FILE = ()=> path.join(app.getPath('userData'), 'save.json');
const ICON = path.join(ROOT, 'build', 'icon.png');      // packaged builds use the .icns/.ico made from it

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

// ---------------------------------------------------------------- saving
// The game hands over its whole table of saved values on every change; write it to a temporary file and swap it in,
// so a crash mid-write never leaves half a save.
let writing = Promise.resolve();
function writeSave(all)
{
    const file = SAVE_FILE(), temp = file + '.tmp';
    writing = writing.then(async ()=>
    {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(temp, JSON.stringify(all));
        await fs.rename(temp, file);
    }).catch((e)=> console.error('could not save', e));
    return writing;
}
// the game was called Violet Isle, and the save folder is named after the app: the first time, a save made under the
// old name is copied over (and left where it was)
async function adoptOldSave()
{
    const old = path.join(app.getPath('appData'), 'Violet Isle', 'save.json');
    try { await fs.access(SAVE_FILE()); return; } catch (e) {}
    try { await fs.mkdir(path.dirname(SAVE_FILE()), { recursive: true }); await fs.copyFile(old, SAVE_FILE()); } catch (e) {}
}
ipcMain.handle('save:load', async ()=>
{
    await adoptOldSave();
    try { return JSON.parse(await fs.readFile(SAVE_FILE(), 'utf8')); }
    catch (e) { return {}; }    // a first run, or a save that could not be read
});
ipcMain.handle('save:write', (event, all)=> writeSave(all));
// "Save and exit": the save just sent is already queued, so wait for the queue, then exit (on macOS too).
// The save is on disk by then, so exit at once instead of a graceful quit: a graceful quit tears the window down step
// by step and can start a sandboxed helper process mid-shutdown, which macOS refuses with
// "sandbox_extension_issue_file failed ... Operation not permitted".
ipcMain.handle('app:quit', async ()=> { await writing; app.exit(0); });

// ---------------------------------------------------------------- window
function createWindow()
{
    const win = new BrowserWindow({
        width: 1280, height: 800, minWidth: 800, minHeight: 500,
        title: 'Little Lantern',
        backgroundColor: '#07051a',
        icon: ICON,
        autoHideMenuBar: true,
        show: false,
        webPreferences: { preload: path.join(ROOT, 'electron', 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    win.once('ready-to-show', ()=> win.show());
    // links open in the browser, never in the game window
    win.webContents.setWindowOpenHandler(({ url })=> { shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('will-navigate', (e, url)=> { if (!url.startsWith('app://game/')) e.preventDefault(); });
    // F11 (and Ctrl+Cmd+F on macOS) toggles fullscreen
    win.webContents.on('before-input-event', (e, input)=>
    {
        if (input.type === 'keyDown' && (input.key === 'F11' || (input.key === 'f' && input.control && input.meta)))
        {
            win.setFullScreen(!win.isFullScreen());
            e.preventDefault();
        }
    });
    win.loadURL('app://game/index.html');
}

app.whenReady().then(()=>
{
    // serve files from the app folder only
    protocol.handle('app', (request)=>
    {
        const { pathname } = new URL(request.url);
        const file = path.join(ROOT, decodeURIComponent(pathname));
        if (!file.startsWith(ROOT + path.sep)) return new Response('not found', { status: 404 });
        return net.fetch(pathToFileURL(file).toString());
    });
    app.dock?.setIcon(ICON);    // macOS while running unpackaged (just app)
    createWindow();
    app.on('activate', ()=> { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
// finish any save in progress before quitting
app.on('window-all-closed', ()=> { writing.finally(()=> { if (process.platform !== 'darwin') app.quit(); }); });
