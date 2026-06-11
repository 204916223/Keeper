const path = require('node:path');
const { BrowserWindow } = require('electron');

function createMainInterfaceWindow({ onClose }) {
  const appWindow = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 820,
    minHeight: 560,
    show: false,
    title: 'Keeper',
    backgroundColor: '#111314',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  appWindow.loadFile(path.join(__dirname, '..', 'renderer', 'app', 'index.html'));
  appWindow.on('close', onClose);

  return appWindow;
}

module.exports = {
  createMainInterfaceWindow,
};
