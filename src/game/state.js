// The game mode and the save. Each feature owns one slice of the save; nothing else writes it.
import { SAVE_KEY, SETTING_KEYS, storage } from '../platform/storage.js';

export const state = {
    mode: 'title',          // title, play
    // a feature's live part of the save, with missing fields filled from defaults; every call returns the same object.
    // Slices are claimed when their modules load, before the save is read, and loading fills them in place.
    slice(name, defaults = {})
    {
        const s = slices[name] ??= {};
        for (const [k, v] of Object.entries(defaults)) if (!(k in s)) s[k] = structuredClone(v);
        defaultsOf[name] = { ...defaultsOf[name], ...defaults };
        return s;
    },
};
const slices = {};
const defaultsOf = {};
const VERSION = 2;

export function loadSave()
{
    let loaded;
    try { loaded = JSON.parse(storage.get(SAVE_KEY) || 'null'); }
    catch (e) { return; }
    if (!loaded || typeof loaded !== 'object') return;
    if (loaded.v !== VERSION) loaded = migrate(loaded);
    for (const [name, values] of Object.entries(loaded))
        if (values && typeof values === 'object' && !Array.isArray(values)) Object.assign(slices[name] ??= {}, values);
}
export const writeSave = ()=> storage.set(SAVE_KEY, JSON.stringify({ v: VERSION, ...slices }));
export const forgetSave = ()=> storage.remove(SAVE_KEY);

// The first save format was one flat object. Field names did not change when it was split into slices,
// so each slice takes the old top-level fields that match its defaults.
function migrate(old)
{
    const out = {};
    for (const [name, defaults] of Object.entries(defaultsOf))
        for (const k of Object.keys(defaults))
            if (k in old) (out[name] ??= {})[k] = old[k];
    return out;
}

// ---------------------------------------------------------------- settings (kept apart from progress, so a new dream keeps them)
export const loadSetting = (name)=> storage.get(SETTING_KEYS[name]);
export const writeSetting = (name, value)=> storage.set(SETTING_KEYS[name], value);
