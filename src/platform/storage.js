// Everything the game remembers goes through this file. The game reads and writes a small in-memory table of
// string values; a storage backend fills that table once before the engine starts and is told about every change.
//
// The default backend uses the browser's localStorage. To save somewhere else (a file, through Electron or Tauri),
// define window.littleLanternStorage before this script loads, with this shape:
//
//     window.littleLanternStorage = {
//         load: async ()=> ({ ...key: string value }),   // everything saved so far, or {} on a first run
//         write: (key, value, all)=> {},                // one key changed; `all` is the whole table, ready to write out
//         remove: (key, all)=> {},                      // one key was deleted (may return a promise)
//     };
//
// A file backend can ignore `key` and write `JSON.stringify(all)` to one file. Writes are fire and forget, and a
// failing backend never stops the game.

export const SAVE_KEY = 'violet-isle-dream-v1';     // from when the game was called Violet Isle; kept so saves carry over
export const SETTING_KEYS = { volume: SAVE_KEY + '-vol', graphics: SAVE_KEY + '-gfx', mouse: SAVE_KEY + '-mouse' };

const localStorageBackend = {
    load()
    {
        const all = {};
        for (const key of [SAVE_KEY, ...Object.values(SETTING_KEYS)])
        {
            const v = localStorage.getItem(key);
            if (v !== null) all[key] = v;
        }
        return all;
    },
    write: (key, value)=> localStorage.setItem(key, value),
    remove: (key)=> localStorage.removeItem(key),
};

export const storage = {
    backend: /** @type {any} */ (window).littleLanternStorage || localStorageBackend,
    table: {},
    async init()
    {
        try { this.table = { ...await this.backend.load() }; }
        catch (e) { console.warn('could not load save', e); }
    },
    get(key) { return this.table[key] ?? null; },
    set(key, value)
    {
        this.table[key] = String(value);
        try { this.backend.write(key, this.table[key], this.table); }
        catch (e) { console.warn('could not save', e); }
    },
    remove(key)
    {
        delete this.table[key];
        try { return this.backend.remove(key, this.table); } // may be a promise, so a reset can wait for it
        catch (e) { console.warn('could not save', e); }
    },
};
