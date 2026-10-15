// Toasts and place titles.
import { $ } from './dom.js';

export function toast(text, ms = 3200)
{
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(()=> { el.classList.add('out'); setTimeout(()=> el.remove(), 700); }, ms);
}
let placeTimer = 0;
export function showPlace(name, sub)
{
    const el = $('place');
    el.innerHTML = '';
    el.append(name);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
    el.classList.add('on');
    clearTimeout(placeTimer);
    placeTimer = setTimeout(()=> el.classList.remove('on'), 3400);
}
