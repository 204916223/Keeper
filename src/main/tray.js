const { Menu, Tray } = require('electron');
const { createTrayIcon } = require('./tray-icon');

function createKeeperTray({
  getClickThrough,
  getWindow,
  onQuit,
  onResetPosition,
  onToggleClickThrough,
  onToggleVisibility,
}) {
  const tray = new Tray(createTrayIcon());

  tray.setToolTip('Keeper');

  if (process.platform === 'darwin') {
    tray.setTitle('K');
  }

  function updateMenu() {
    const mainWindow = getWindow();

    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: mainWindow?.isVisible() ? '隐藏 Keeper' : '显示 Keeper',
        click: onToggleVisibility,
      },
      {
        label: '重置位置',
        click: onResetPosition,
      },
      {
        label: getClickThrough() ? '关闭点击穿透' : '开启点击穿透',
        click: onToggleClickThrough,
      },
      { type: 'separator' },
      {
        label: '关闭',
        click: onQuit,
      },
    ]));
  }

  updateMenu();

  return {
    tray,
    updateMenu,
  };
}

module.exports = {
  createKeeperTray,
};
