// The render page's only way out: progress lines, and the finished WAV. Nothing else is exposed.
const { ipcRenderer } = require('electron');

window.renderHost = {
    log: (text)=> ipcRenderer.invoke('log', text),
    rendered: (info, wav)=> ipcRenderer.invoke('rendered', info, wav),
    failed: (message)=> ipcRenderer.invoke('failed', message),
};
