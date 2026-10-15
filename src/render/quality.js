// Graphics quality: the full/light setting and the frame-rate watchdog.
import { MOBILE, lerp, max, render3D, setCanvasPixelRatio, timeDelta, timeReal } from '../platform/engine.js';
import { loadSetting, state, writeSetting } from '../game/state.js';
import { $ } from '../ui/dom.js';
import { toast } from '../ui/toast.js';

export const gfx = { low: false, checked: false, slowT: 0 };
export function setGraphics(low, quiet)
{
    gfx.low = low;
    writeSetting('graphics', low ? 'low' : 'full');
    if (render3D) render3D.shadows = !low;
    setCanvasPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.5));
    $('gfxToggle').textContent = low ? 'Light' : 'Full';
    if (!quiet) toast(low ? 'Lighter graphics: fewer shadows and less grass.' : 'Full graphics.');
}
// the engine keeps its average frame rate private to the module, so track it here the same way, once per drawn frame
let averageFPS = 0, lastFrameMS = 0;
function trackFrameRate()
{
    const now = performance.now();
    if (lastFrameMS) averageFPS = lerp(averageFPS, 1e3 / ((now - lastFrameMS) || 1), .05);
    lastFrameMS = now;
}
// drop to lighter graphics once if the frame rate stays low for a while
function watchFrameRate()
{
    if (gfx.low || gfx.checked || state.mode !== 'play' || timeReal < 8) return;
    if (averageFPS > 0 && averageFPS < 28) gfx.slowT += timeDelta; else gfx.slowT = max(0, gfx.slowT - timeDelta);
    if (gfx.slowT > 4) { gfx.checked = true; setGraphics(true, true); toast('Switched to lighter graphics to keep things smooth. You can change this in the menu.', 5000); }
}

export const qualitySystem = {
    buildLate() { const g = loadSetting('graphics'); setGraphics(g ? g === 'low' : MOBILE, true); },
    update: watchFrameRate,
    render: trackFrameRate,
};
