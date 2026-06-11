const { Menu } = require('electron');
const { PET_INTERACTIONS, PET_STATUS } = require('./constants');

function showPetContextMenu({
  getGravityEnabled,
  getStatus,
  mainWindow,
  onInteract,
  onHide,
  onOpenMainInterface,
  onOpen,
  onClose,
  onQuit,
  setGravityEnabled,
  setStatus,
}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  onOpen?.();

  Menu.buildFromTemplate([
    {
      label: '打开主界面',
      click: onOpenMainInterface,
    },
    { type: 'separator' },
    {
      label: '状态',
      submenu: [
        {
          label: '探索',
          type: 'radio',
          checked: getStatus() === PET_STATUS.EXPLORE,
          click: () => setStatus(PET_STATUS.EXPLORE),
        },
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
    {
      label: '交互',
      submenu: PET_INTERACTIONS.map((interaction) => ({
        label: interaction.label,
        click: () => onInteract(interaction.id),
      })),
    },
    {
      label: '重力',
      type: 'checkbox',
      checked: getGravityEnabled(),
      click: (menuItem) => setGravityEnabled(menuItem.checked),
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
  ]).popup({
    window: mainWindow,
    callback: () => onClose?.(),
  });
}

module.exports = {
  showPetContextMenu,
};
