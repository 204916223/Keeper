const path = require('node:path');
const { BrowserWindow } = require('electron');
const { getDefaultBounds } = require('./window-bounds');

function createPetWindow({ onContextMenu, onClose, onShow, onHide }) {
  const petWindow = new BrowserWindow({
    ...getDefaultBounds(),
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    title: 'Keeper',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  petWindow.setAlwaysOnTop(true, 'floating');
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  petWindow.webContents.on('context-menu', onContextMenu);
  petWindow.on('close', onClose);
  petWindow.on('show', onShow);
  petWindow.on('hide', onHide);

  return petWindow;
}

module.exports = {
  createPetWindow,
};
