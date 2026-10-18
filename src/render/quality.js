// Graphics quality: the full/light setting and the frame-rate watchdog.
import { MOBILE, lerp, max, render3D, setCanvasPixelRatio, timeDelta, timeReal } from '../platform/engine.js';
import { loadSetting, state, writeSetting } from '../game/state.js';
import { $ } from '../ui/dom.js';
import { toast } from '../ui/toast.js';

// low: the Light setting; scale: how much further the watchdog has lowered the pixel ratio below that setting's
export const gfx = { low: false, scale: 1, slowT: 0, lastDrop: 0 };
export function setGraphics(low, quiet)
{
    gfx.low = low;
    writeSetting('graphics', low ? 'low' : 'full');
    if (render3D) render3D.shadows = !low;
    gfx.scale = 1;
    applyPixelRatio();
    $('gfxToggle').textContent = low ? 'Light' : 'Full';
    if (!quiet) toast(low ? 'Lighter graphics: fewer shadows and less grass.' : 'Full graphics.');
}
const applyPixelRatio = ()=> setCanvasPixelRatio((gfx.low ? 1 : Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.5)) * gfx.scale);
// the engine keeps its average frame rate private to the module, so track it here the same way, once per drawn frame
let averageFPS = 0, lastFrameMS = 0;
function trackFrameRate()
{
    const now = performance.now();
    if (lastFrameMS) averageFPS = lerp(averageFPS, 1e3 / ((now - lastFrameMS) || 1), .05);
    lastFrameMS = now;
}
// while the frame rate stays low, step down: Full to Light, then a smaller canvas, a step at a time, at most every
// ten seconds and no lower than SCALES' last. A phone starts in Light, so it can still get smoother
const SLOW_FPS = 40, SCALES = [1, .85, .7];
function watchFrameRate()
{
    if (state.mode !== 'play' || timeReal < 8 || timeReal - gfx.lastDrop < 10) return;
    if (averageFPS > 0 && averageFPS < SLOW_FPS) gfx.slowT += timeDelta; else gfx.slowT = max(0, gfx.slowT - timeDelta);
    if (gfx.slowT < 4) return;
    gfx.slowT = 0;
    gfx.lastDrop = timeReal;
    if (!gfx.low) { setGraphics(true, true); toast('Switched to lighter graphics to keep things smooth. You can change this in the menu.', 5000); return; }
    const i = SCALES.indexOf(gfx.scale);
    if (i >= 0 && i < SCALES.length - 1) { gfx.scale = SCALES[i + 1]; applyPixelRatio(); }
}

export const qualitySystem = {
    buildLate() { const g = loadSetting('graphics'); setGraphics(g ? g === 'low' : MOBILE, true); },
    update: watchFrameRate,
    render: trackFrameRate,
};
