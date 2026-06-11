function createManualDragController({ getWindow, onDragEnd, onDragMove, onDragStart }) {
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };

  function getBoundsForPoint(point) {
    const petWindow = getWindow();

    if (!petWindow || petWindow.isDestroyed()) {
      return undefined;
    }

    const bounds = petWindow.getBounds();

    return {
      ...bounds,
      x: Math.round(point.screenX - dragOffset.x),
      y: Math.round(point.screenY - dragOffset.y),
    };
  }

  function start(point) {
    const petWindow = getWindow();

    if (!petWindow || petWindow.isDestroyed()) {
      return;
    }

    dragging = true;
    dragOffset = {
      x: point.screenX - petWindow.getBounds().x,
      y: point.screenY - petWindow.getBounds().y,
    };
    onDragStart?.();
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
