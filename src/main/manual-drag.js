const { PET_CANVAS_SIZE } = require('./constants');

function createManualDragController({ getWindow, onDragEnd, onDragMove, onDragStart }) {
  let dragging = false;

  function getBoundsForPoint(point) {
    const petWindow = getWindow();

    if (!petWindow || petWindow.isDestroyed()) {
      return undefined;
    }

    const bounds = petWindow.getBounds();

    return {
      ...bounds,
      x: Math.round(point.screenX - bounds.width / 2),
      y: Math.round(point.screenY - (bounds.height - PET_CANVAS_SIZE) / 2),
    };
  }

  function start(point) {
    const petWindow = getWindow();

    if (!petWindow || petWindow.isDestroyed()) {
      return;
    }

    dragging = true;
    onDragStart?.();
    petWindow.setBounds(getBoundsForPoint(point));
  }

  function move(point) {
    const petWindow = getWindow();

    if (!dragging || !petWindow || petWindow.isDestroyed()) {
      return;
    }

    petWindow.setBounds(getBoundsForPoint(point));
    onDragMove?.();
  }

  function end() {
    if (!dragging) {
      return;
    }

    dragging = false;
    onDragEnd?.();
  }

  return {
    end,
    move,
    start,
  };
}

module.exports = {
  createManualDragController,
};
