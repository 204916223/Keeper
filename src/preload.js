const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('keeper', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getKeeperSnapshot: () => ipcRenderer.invoke('keeper:get-snapshot'),
  setCurrentPet: (petId) => ipcRenderer.invoke('keeper:set-current-pet', petId),
  hide: () => ipcRenderer.invoke('window:hide'),
  showPet: () => ipcRenderer.invoke('window:show-pet'),
  resetPosition: () => ipcRenderer.invoke('window:reset-position'),
  setClickThrough: (enabled) => ipcRenderer.invoke('window:set-click-through', enabled),
  dragStart: (point) => ipcRenderer.send('pet:drag-start', point),
  dragMove: (point) => ipcRenderer.send('pet:drag-move', point),
  dragEnd: () => ipcRenderer.send('pet:drag-end'),
  hoverStart: () => ipcRenderer.send('pet:hover-start'),
  hoverEnd: () => ipcRenderer.send('pet:hover-end'),
  onPetAnimationChanged: (callback) => {
    ipcRenderer.on('pet:animation-changed', (_event, animation) => callback(animation));
  },
  onClickThroughChanged: (callback) => {
    ipcRenderer.on('click-through-changed', (_event, enabled) => callback(enabled));
  },
  onKeeperSnapshotChanged: (callback) => {
    ipcRenderer.on('keeper:snapshot-changed', (_event, snapshot) => callback(snapshot));
  },
  onKeyboardTextInput: (callback) => {
    ipcRenderer.on('keyboard:text-input', (_event, payload) => callback(payload));
  },
});
