// The activity that has taken over the mothling, if any: { name, update(), cancel(), cam(), hint(), mouseHold, lockCamera, ownsPhysics }.
// Activities start and end only through here; code reads activity.current.
const listeners = new Set();
let current = null;

export const activity = {
    get current() { return current; },
    start(a)
    {
        current = a;
        for (const fn of listeners) fn(current);
    },
    // ends the current activity, whether it finished or was interrupted
    end()
    {
        if (!current) return;
        const a = current;
        current = null;
        a.cleanup?.();
        for (const fn of listeners) fn(null);
    },
    onChange(fn) { listeners.add(fn); return ()=> listeners.delete(fn); },
};
