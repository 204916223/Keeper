const { app, BrowserWindow, ipcMain } = require('electron');
const { PET_STATUS } = require('./main/constants');
const { createGravityController } = require('./main/gravity');
const { createManualDragController } = require('./main/manual-drag');
const { createPetMotionController } = require('./main/pet-motion');
const { showPetContextMenu } = require('./main/pet-context-menu');
const { createPetWindow } = require('./main/pet-window');
const { createKeeperTray } = require('./main/tray');
const { getDefaultBounds } = require('./main/window-bounds');

let mainWindow;
let trayController;
let motionController;
let gravityController;
let dragController;
let isQuitting = false;
let clickThrough = false;
let isDragging = false;

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

  if (gravityController.getEnabled()) {
    const isFalling = gravityController.dropToGround();

    if (!isFalling) {
      resumeStandbyAfterInteraction();
    }
  } else {
    resumeStandbyAfterInteraction();
  }
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

function resumeStandbyAfterInteraction() {
  if (
    !isDragging &&
    mainWindow?.isVisible() &&
    motionController.getStatus() === PET_STATUS.STANDBY
  ) {
    motionController.startWalking();
  }
}

function setGravityEnabled(enabled) {
  const isFalling = gravityController.setEnabled(enabled);

  if (!isFalling) {
    resumeStandbyAfterInteraction();
  }

  updateTrayMenu();
}

function createWindow() {
  mainWindow = createPetWindow({
    onContextMenu: () => showPetContextMenu({
      getGravityEnabled: gravityController.getEnabled,
      getStatus: motionController.getStatus,
      mainWindow,
      onHide: hideWindow,
      onQuit: quitApp,
      setGravityEnabled,
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

      if (gravityController.getEnabled()) {
        const isFalling = gravityController.dropToGround();

        if (!isFalling) {
          resumeStandbyAfterInteraction();
        }
      } else if (motionController.getStatus() === PET_STATUS.STANDBY) {
        resumeStandbyAfterInteraction();
      }
    },
    onHide: () => {
      updateTrayMenu();
      motionController.stopWalking();
      motionController.cancelMovement();
      gravityController.cancelFall();
    },
  });
}

function createTray() {
  trayController = createKeeperTray({
    getGravityEnabled: gravityController.getEnabled,
    getClickThrough: () => clickThrough,
    getWindow: () => mainWindow,
    onQuit: quitApp,
    onResetPosition: resetWindowPosition,
    onToggleGravity: () => setGravityEnabled(!gravityController.getEnabled()),
    onToggleClickThrough: () => setClickThrough(!clickThrough),
    onToggleVisibility: toggleWindowVisibility,
  });
}

function registerIpcHandlers() {
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('window:hide', hideWindow);
  ipcMain.handle('window:reset-position', resetWindowPosition);
  ipcMain.handle('window:set-click-through', (_event, enabled) => setClickThrough(Boolean(enabled)));
  ipcMain.on('pet:drag-start', (_event, point) => dragController.start(point));
  ipcMain.on('pet:drag-move', (_event, point) => dragController.move(point));
  ipcMain.on('pet:drag-end', () => dragController.end());
}

app.whenReady().then(() => {
  motionController = createPetMotionController({
    getWindow: () => mainWindow,
    sendAnimation: sendPetAnimation,
  });
  gravityController = createGravityController({
    getWindow: () => mainWindow,
    onFallEnd: resumeStandbyAfterInteraction,
    onFallStart: () => {
      motionController.stopWalking();
      motionController.cancelMovement();
    },
  });
  dragController = createManualDragController({
    getWindow: () => mainWindow,
    onDragStart: () => {
      isDragging = true;
      gravityController.cancelFall();
      motionController.stopWalking();
      motionController.cancelMovement();
    },
    onDragEnd: () => {
      isDragging = false;

      if (!gravityController.dropToGround()) {
        resumeStandbyAfterInteraction();
      }
    },
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
