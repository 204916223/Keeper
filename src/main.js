const { app, BrowserWindow, ipcMain } = require('electron');
const { PET_STATUS } = require('./main/constants');
const { createPetMotionController } = require('./main/pet-motion');
const { showPetContextMenu } = require('./main/pet-context-menu');
const { createPetWindow } = require('./main/pet-window');
const { createKeeperTray } = require('./main/tray');
const { getDefaultBounds } = require('./main/window-bounds');

let mainWindow;
let trayController;
let motionController;
let isQuitting = false;
let clickThrough = false;

function updateTrayMenu() {
  trayController?.updateMenu();
}

function quitApp() {
  isQuitting = true;
  app.quit();
}

function sendPetAnimation(animation) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('pet:animation-changed', animation);
}

function hideWindow() {
  mainWindow?.hide();
  updateTrayMenu();
}

function showWindow() {
  mainWindow?.show();
  updateTrayMenu();
}

function toggleWindowVisibility() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isVisible()) {
    hideWindow();
  } else {
    showWindow();
  }
}

function resetWindowPosition() {
  motionController.cancelMovement();
  mainWindow?.setBounds(getDefaultBounds());
}

function setClickThrough(enabled) {
  clickThrough = enabled;

  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.setIgnoreMouseEvents(clickThrough, { forward: true });
  mainWindow.webContents.send('click-through-changed', clickThrough);
  updateTrayMenu();
}

function createWindow() {
  mainWindow = createPetWindow({
    onContextMenu: () => showPetContextMenu({
      getStatus: motionController.getStatus,
      mainWindow,
      onHide: hideWindow,
      onQuit: quitApp,
      setStatus: motionController.setStatus,
    }),
    onClose: (event) => {
      if (isQuitting) {
        return;
      }

      event.preventDefault();
      hideWindow();
    },
    onShow: () => {
      updateTrayMenu();

      if (motionController.getStatus() === PET_STATUS.STANDBY) {
        motionController.startWalking();
      }
    },
    onHide: () => {
      updateTrayMenu();
      motionController.stopWalking();
      motionController.cancelMovement();
    },
  });
}

function createTray() {
  trayController = createKeeperTray({
    getClickThrough: () => clickThrough,
    getWindow: () => mainWindow,
    onQuit: quitApp,
    onResetPosition: resetWindowPosition,
    onToggleClickThrough: () => setClickThrough(!clickThrough),
    onToggleVisibility: toggleWindowVisibility,
  });
}

function registerIpcHandlers() {
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('window:hide', hideWindow);
  ipcMain.handle('window:reset-position', resetWindowPosition);
  ipcMain.handle('window:set-click-through', (_event, enabled) => setClickThrough(Boolean(enabled)));
}

app.whenReady().then(() => {
  motionController = createPetMotionController({
    getWindow: () => mainWindow,
    sendAnimation: sendPetAnimation,
  });

  createWindow();
  createTray();
  registerIpcHandlers();
  motionController.setStatus(PET_STATUS.STANDBY);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
