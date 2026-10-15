// The game mode and the save.
import { SAVE_KEY, SETTING_KEYS, storage } from '../platform/storage.js';

export const state = { mode: 'title' };    // title, play

// ---------------------------------------------------------------- game progress
export const save = {
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
export function loadSave()
{
    try
    {
        const s = JSON.parse(storage.get(SAVE_KEY) || 'null');
        if (s && typeof s === 'object') Object.assign(save, s);
    }
    catch (e) {}
}
export const writeSave = ()=> storage.set(SAVE_KEY, JSON.stringify(save));
export const forgetSave = ()=> storage.remove(SAVE_KEY);

// ---------------------------------------------------------------- settings (kept apart from progress, so a new dream keeps them)
export const loadSetting = (name)=> storage.get(SETTING_KEYS[name]);
export const writeSetting = (name, value)=> storage.set(SETTING_KEYS[name], value);
