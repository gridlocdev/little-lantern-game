'use strict';

// ================================================================ SAVING
// Everything the game remembers goes through this file. The game reads and writes a small in-memory table of
// string values; a storage backend fills that table once before the engine starts and is told about every change.
//
// The default backend uses the browser's localStorage. To save somewhere else (a file, through Electron or Tauri),
// define window.violetIsleStorage before this script loads, with this shape:
//
//     window.violetIsleStorage = {
//         load: async ()=> ({ ...key: string value }),   // everything saved so far, or {} on a first run
//         write: (key, value, all)=> {},                // one key changed; `all` is the whole table, ready to write out
//         remove: (key, all)=> {},                      // one key was deleted (may return a promise)
//     };
//
// A file backend can ignore `key` and write `JSON.stringify(all)` to one file. Writes are fire and forget, and a
// failing backend never stops the game.

const SAVE_KEY = 'violet-isle-dream-v1';
const SETTING_KEYS = { volume: SAVE_KEY + '-vol', graphics: SAVE_KEY + '-gfx' };

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

const storage = {
    backend: window.violetIsleStorage || localStorageBackend,
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

// ---------------------------------------------------------------- game progress
const save = {
    fish: {},            // species id -> count caught
    best: {},            // species id -> biggest size cm
    aquarium: [],        // species ids kept
    released: 0,
    stardust: 0,
    lanterns: 0,
    sky: {},             // constellations found
    outfit: 0,
    bridge: false,
    flower: 0,           // moonflower growth stage 0-4
    flowerWatered: -1,   // visit count when last watered
    visits: 0,
    palette: 0,
    swingHigh: false,
    swingFlight: false,
    bounceBest: 0,
    sheep: 0,
    cat: 0,
    tea: 0,
    books: {},
    slept: 0,
    moonlet: false,
    whale: false,
    hammock: false,
    music: true,
};
function loadSave()
{
    try
    {
        const s = JSON.parse(storage.get(SAVE_KEY) || 'null');
        if (s && typeof s === 'object') Object.assign(save, s);
    }
    catch (e) {}
}
const writeSave = ()=> storage.set(SAVE_KEY, JSON.stringify(save));
const forgetSave = ()=> storage.remove(SAVE_KEY);

// ---------------------------------------------------------------- settings (kept apart from progress, so a new dream keeps them)
const loadSetting = (name)=> storage.get(SETTING_KEYS[name]);
const writeSetting = (name, value)=> storage.set(SETTING_KEYS[name], value);
