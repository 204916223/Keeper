const { app, BrowserWindow, ipcMain } = require('electron');
const { getAiConfigSnapshot, updateAiProviderConfig } = require('./main/ai-config');
const {
  BUILT_IN_PETS,
  DEFAULT_PET_ID,
  PET_ANIMATION,
  PET_INTERACTIONS,
  PET_STATUS,
} = require('./main/constants');
const { createMainInterfaceWindow } = require('./main/app-window');
const { createGravityController } = require('./main/gravity');
const { createKeyboardInputController } = require('./main/keyboard-input');
const { createManualDragController } = require('./main/manual-drag');
const { createPetMotionController } = require('./main/pet-motion');
const { showPetContextMenu } = require('./main/pet-context-menu');
const { createPetWindow } = require('./main/pet-window');
const { createKeeperTray } = require('./main/tray');
const { getDefaultBounds } = require('./main/window-bounds');

let mainWindow;
let appWindow;
let trayController;
let motionController;
let gravityController;
let dragController;
let keyboardInputController;
let isQuitting = false;
let clickThrough = false;
let isDragging = false;
let isHovering = false;
let isMenuOpen = false;
let currentPetId = DEFAULT_PET_ID;
let actionLog = [];

const statusLabels = {
  [PET_STATUS.DO_NOT_DISTURB]: '勿扰',
  [PET_STATUS.EXPLORE]: '探索',
  [PET_STATUS.STANDBY]: '待机',
};

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

  mainWindow.webContents.send('pet:animation-changed', {
    animation,
    petId: currentPetId,
  });
}

function getCurrentPet() {
  return BUILT_IN_PETS.find((pet) => pet.id === currentPetId) || BUILT_IN_PETS[0];
}

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

function addActionLog(message, options = {}) {
  actionLog = [
    {
      level: options.level || 'INFO',
      source: options.source || 'keeper',
      time: timeLabel(),
      message,
    },
    ...actionLog,
  ].slice(0, 50);
  broadcastKeeperSnapshot();
}

function keeperSnapshot() {
  const currentPet = getCurrentPet();

  return {
    pets: BUILT_IN_PETS,
    currentPetId,
    petName: currentPet.name,
    petStats: currentPet.stats,
    status: motionController?.getStatus() || PET_STATUS.STANDBY,
    statusLabel: statusLabels[motionController?.getStatus()] || statusLabels[PET_STATUS.STANDBY],
    gravityEnabled: gravityController?.getEnabled() ?? true,
    petVisible: mainWindow?.isVisible() ?? false,
    actionLog,
  };
}

function broadcastKeeperSnapshot() {
  if (!appWindow || appWindow.isDestroyed()) {
    return;
  }

  appWindow.webContents.send('keeper:snapshot-changed', keeperSnapshot());
}

function hideWindow() {
  mainWindow?.hide();
  updateTrayMenu();
  broadcastKeeperSnapshot();
}

function showWindow() {
  mainWindow?.show();
  updateTrayMenu();
  broadcastKeeperSnapshot();
}

function showMainInterface() {
  if (!appWindow || appWindow.isDestroyed()) {
    appWindow = createMainInterfaceWindow({
      onClose: (event) => {
        if (isQuitting) {
          return;
        }

        event.preventDefault();
        appWindow.hide();
      },
    });
  }

  appWindow.show();
  appWindow.focus();
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
  motionController.setHomeFromCurrentPosition();

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
    !isHovering &&
    !isMenuOpen &&
    mainWindow?.isVisible() &&
    motionController.getStatus() !== PET_STATUS.DO_NOT_DISTURB
  ) {
    motionController.startWalking();
  }
}

function pauseStandbyForInteraction() {
  motionController.stopWalking();

  if (motionController.isActive()) {
    motionController.cancelMovement();
  }
}

function setPetStatus(status) {
  const petName = getCurrentPet().name;

  motionController.setStatus(status);
  syncInputListeningForStatus();

  if (status !== PET_STATUS.DO_NOT_DISTURB && (isDragging || isHovering || isMenuOpen)) {
    motionController.stopWalking();
  }

  if (status === PET_STATUS.EXPLORE) {
    addActionLog(`${petName}开始探索周围`, { source: 'status' });
  } else if (status === PET_STATUS.STANDBY) {
    addActionLog(`${petName}正在巡视领地`, { source: 'status' });
  } else if (status === PET_STATUS.DO_NOT_DISTURB) {
    addActionLog(`${petName}进入勿扰状态`, { source: 'status' });
  } else {
    broadcastKeeperSnapshot();
  }
}

function syncInputListeningForStatus() {
  if (motionController.getStatus() === PET_STATUS.DO_NOT_DISTURB) {
    keyboardInputController?.stop();
  } else {
    keyboardInputController?.start();
  }
}

function handleGlobalMouseClick(point) {
  if (!clickThrough || motionController.getStatus() !== PET_STATUS.EXPLORE) {
    return;
  }

  motionController.moveTowardScreenX(point.screenX);
}

function performPetInteraction(interactionId) {
  const interaction = PET_INTERACTIONS.find((item) => item.id === interactionId);

  if (!interaction) {
    addActionLog(`未知交互：${interactionId}`, { level: 'WARN', source: 'interaction' });
    return;
  }

  addActionLog(`${getCurrentPet().name}${interaction.message}`, { source: 'interaction' });
}

function setCurrentPet(petId) {
  const nextPet = BUILT_IN_PETS.find((pet) => pet.id === petId);

  if (!nextPet || currentPetId === nextPet.id) {
    return keeperSnapshot();
  }

  currentPetId = nextPet.id;
  motionController.stopWalking();
  motionController.cancelMovement();
  sendPetAnimation(PET_ANIMATION.IDLE);
  addActionLog(`当前角色切换为${nextPet.name}`);
  resumeStandbyAfterInteraction();
  return keeperSnapshot();
}

function setGravityEnabled(enabled) {
  const isFalling = gravityController.setEnabled(enabled);

  if (!isFalling) {
    resumeStandbyAfterInteraction();
  }

  updateTrayMenu();
  broadcastKeeperSnapshot();
}

function createWindow() {
  mainWindow = createPetWindow({
    onContextMenu: () => showPetContextMenu({
      getGravityEnabled: gravityController.getEnabled,
      getStatus: motionController.getStatus,
      mainWindow,
      onInteract: performPetInteraction,
      onHide: hideWindow,
      onOpenMainInterface: showMainInterface,
      onOpen: () => {
        isMenuOpen = true;
        pauseStandbyForInteraction();
      },
      onClose: () => {
        isMenuOpen = false;
        resumeStandbyAfterInteraction();
      },
      onQuit: quitApp,
      setGravityEnabled,
      setStatus: setPetStatus,
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
      } else if (motionController.getStatus() !== PET_STATUS.DO_NOT_DISTURB) {
        resumeStandbyAfterInteraction();
      }
    },
    onHide: () => {
      updateTrayMenu();
      isDragging = false;
      isHovering = false;
      isMenuOpen = false;
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
    onOpenMainInterface: showMainInterface,
    onResetPosition: resetWindowPosition,
    onToggleGravity: () => setGravityEnabled(!gravityController.getEnabled()),
    onToggleClickThrough: () => setClickThrough(!clickThrough),
    onToggleVisibility: toggleWindowVisibility,
  });
}

function registerIpcHandlers() {
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('ai:get-config', () => getAiConfigSnapshot());
  ipcMain.handle('ai:update-provider', (_event, payload) => updateAiProviderConfig(payload));
  ipcMain.handle('keeper:get-snapshot', () => keeperSnapshot());
  ipcMain.handle('keeper:set-current-pet', (_event, petId) => setCurrentPet(petId));
  ipcMain.handle('window:hide', hideWindow);
  ipcMain.handle('window:show-pet', showWindow);
  ipcMain.handle('window:reset-position', resetWindowPosition);
  ipcMain.handle('window:set-click-through', (_event, enabled) => setClickThrough(Boolean(enabled)));
  ipcMain.on('pet:drag-start', (_event, point) => dragController.start(point));
  ipcMain.on('pet:drag-move', (_event, point) => dragController.move(point));
  ipcMain.on('pet:drag-end', () => dragController.end());
  ipcMain.on('pet:hover-start', () => {
    isHovering = true;
    pauseStandbyForInteraction();
  });
  ipcMain.on('pet:hover-end', () => {
    isHovering = false;
    resumeStandbyAfterInteraction();
  });
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
      pauseStandbyForInteraction();
    },
    onDragEnd: () => {
      isDragging = false;
      motionController.setHomeFromCurrentPosition();

      if (!gravityController.dropToGround()) {
        resumeStandbyAfterInteraction();
      }
    },
  });
  keyboardInputController = createKeyboardInputController({
    getWindow: () => mainWindow,
    onMouseClick: handleGlobalMouseClick,
  });

  createWindow();
  motionController.setHomeFromCurrentPosition();
  createTray();
  registerIpcHandlers();
  motionController.setStatus(PET_STATUS.STANDBY);
  syncInputListeningForStatus();
  sendPetAnimation(PET_ANIMATION.IDLE);
  addActionLog(`${getCurrentPet().name}正在巡视领地`, { source: 'status' });

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
  keyboardInputController?.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
