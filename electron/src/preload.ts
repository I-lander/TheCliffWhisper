require('./rt/electron-rt');
const { contextBridge, ipcRenderer } = require('electron');

// Exposer uniquement les API nécessaires au renderer process
contextBridge.exposeInMainWorld('electron', {
  quitApp: () => ipcRenderer.send('quit-app')
});