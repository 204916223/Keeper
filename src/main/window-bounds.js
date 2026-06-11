const { screen } = require('electron');
const { WINDOW_HEIGHT, WINDOW_WIDTH } = require('./constants');

function getDefaultBounds() {
  const { workArea } = screen.getPrimaryDisplay();

  return {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: Math.round(workArea.x + workArea.width - WINDOW_WIDTH - 28),
    y: Math.round(workArea.y + workArea.height - WINDOW_HEIGHT - 22),
  };
}

module.exports = {
  getDefaultBounds,
};
