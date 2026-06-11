const { Menu } = require('electron');
const { PET_STATUS } = require('./constants');

function showPetContextMenu({ getStatus, mainWindow, onHide, onQuit, setStatus }) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  Menu.buildFromTemplate([
    {
      label: '状态',
      submenu: [
        {
          label: '勿扰',
          type: 'radio',
          checked: getStatus() === PET_STATUS.DO_NOT_DISTURB,
          click: () => setStatus(PET_STATUS.DO_NOT_DISTURB),
        },
        {
          label: '待机',
          type: 'radio',
          checked: getStatus() === PET_STATUS.STANDBY,
          click: () => setStatus(PET_STATUS.STANDBY),
        },
      ],
    },
    { type: 'separator' },
    {
      label: '隐藏',
      click: onHide,
    },
    {
      label: '关闭',
      click: onQuit,
    },
  ]).popup({ window: mainWindow });
}

module.exports = {
  showPetContextMenu,
};
