const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('keeper', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  hide: () => ipcRenderer.invoke('window:hide'),
  resetPosition: () => ipcRenderer.invoke('window:reset-position'),
  setClickThrough: (enabled) => ipcRenderer.invoke('window:set-click-through', enabled),
  dragStart: (point) => ipcRenderer.send('pet:drag-start', point),
  dragMove: (point) => ipcRenderer.send('pet:drag-move', point),
  dragEnd: () => ipcRenderer.send('pet:drag-end'),
  onPetAnimationChanged: (callback) => {
    ipcRenderer.on('pet:animation-changed', (_event, animation) => callback(animation));
  },
  onClickThroughChanged: (callback) => {
    ipcRenderer.on('click-through-changed', (_event, enabled) => callback(enabled));
  },
});
