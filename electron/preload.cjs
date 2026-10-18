// Gives the game a file-backed save through the hook src/platform/storage.js looks for, and a way to quit after saving
// (the menu's "Save and exit"). Nothing else is exposed.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('littleLanternStorage', {
    load: ()=> ipcRenderer.invoke('save:load'),
    write: (key, value, all)=> ipcRenderer.invoke('save:write', all),
    remove: (key, all)=> ipcRenderer.invoke('save:write', all),
});

contextBridge.exposeInMainWorld('littleLanternApp', {
    quit: ()=> ipcRenderer.invoke('app:quit'),
});
