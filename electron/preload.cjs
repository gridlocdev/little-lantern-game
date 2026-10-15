// Gives the game a file-backed save through the hook src/platform/storage.js looks for. Nothing else is exposed.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('violetIsleStorage', {
    load: ()=> ipcRenderer.invoke('save:load'),
    write: (key, value, all)=> ipcRenderer.invoke('save:write', all),
    remove: (key, all)=> ipcRenderer.invoke('save:write', all),
});
