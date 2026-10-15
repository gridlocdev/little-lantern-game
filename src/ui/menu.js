// The menu: volume, music, graphics, starting over.
import { setSoundVolume, soundVolume } from '../platform/engine.js';
import { music, setMusic } from '../audio/music.js';
import { forgetSave, writeSetting } from '../game/state.js';
import { gfx, setGraphics } from '../render/quality.js';
import { $ } from './dom.js';
import { closeModal, openModal } from './modal.js';

// menu
export function openMenu()
{
    $('volSlider').value = soundVolume;
    $('musicToggle').textContent = music.on ? 'On' : 'Off';
    $('gfxToggle').textContent = gfx.low ? 'Light' : 'Full';
    $('resetBtn').textContent = 'Start a new dream';
    $('resetBtn').dataset.armed = '';
    openModal('menu');
}
$('mClose').onclick = closeModal;
$('volSlider').oninput = (e)=> { setSoundVolume(+e.target.value); writeSetting('volume', soundVolume); };
$('musicToggle').onclick = ()=> setMusic(!music.on);
$('gfxToggle').onclick = ()=> setGraphics(!gfx.low);
$('resetBtn').onclick = (e)=>
{
    const b = e.currentTarget;
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to forget everything'; return; }
    Promise.resolve(forgetSave()).finally(()=> location.reload());
};
