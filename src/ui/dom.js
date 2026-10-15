// The HTML layer over the canvas, and what is open in it.
import { MOBILE } from '../platform/engine.js';

export const $ = (id)=> document.getElementById(id);
export const ui = { modal: null, dialog: null };
export const uiOpen = ()=> !!(ui.modal || ui.dialog);
if (MOBILE) document.body.classList.add('touch');
