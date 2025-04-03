const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    getDbPath: () => ipcRenderer.invoke('get-db-path'),
    onError: (callback) => ipcRenderer.on('error-message', (event, message) => callback(message))
});

console.log('Preload script loaded');