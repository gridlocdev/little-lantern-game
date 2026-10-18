// The menu: volume, music, graphics, saving and leaving, starting over.
import { setSoundVolume, soundVolume } from '../platform/engine.js';
import { music, setMusic } from '../audio/music.js';
import { forgetSave, writeSave, writeSetting } from '../game/state.js';
import { input } from '../platform/input.js';
import { gfx, setGraphics } from '../render/quality.js';
import { $ } from './dom.js';
import { closeModal, openModal, registerModal } from './modal.js';
import { returnToTitle } from './title.js';

// the desktop app gives a way to quit (electron/preload.cjs); a browser tab cannot close itself, so it goes to the title
const desktop = /** @type {any} */ (window).littleLanternApp;

export function openMenu()
{
    /** @type {HTMLInputElement} */ ($('volSlider')).value = String(soundVolume);
    $('musicToggle').textContent = music.on ? 'On' : 'Off';
    $('gfxToggle').textContent = gfx.low ? 'Light' : 'Full';
    $('resetBtn').textContent = 'Start a new dream';
    $('resetBtn').dataset.armed = '';
    $('mSaveExit').textContent = 'Save and exit';
    openModal('menu');
}
$('mClose').onclick = closeModal;
registerModal('menu', { update() { if (input.back()) closeModal(); } });
$('volSlider').oninput = (e)=> { setSoundVolume(+/** @type {HTMLInputElement} */ (e.target).value); writeSetting('volume', soundVolume); };
$('musicToggle').onclick = ()=> setMusic(!music.on);
$('gfxToggle').onclick = ()=> setGraphics(!gfx.low);
$('resetBtn').onclick = (e)=>
{
    const b = /** @type {HTMLElement} */ (e.currentTarget);
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to forget everything'; return; }
    Promise.resolve(forgetSave()).finally(()=> location.reload());
};

$('mSaveExit').onclick = async ()=>
{
    writeSave();
    if (desktop?.quit)
    {
        $('mSaveExit').textContent = 'Saving...';
        await desktop.quit();    // waits for the save file to be written, then closes the app
        return;
    }
    returnToTitle('Saved. The island will wait for you.');
};
