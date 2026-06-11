const { screen } = require('electron');
const { DEFAULT_GRAVITY_PROFILE } = require('./constants');
const { clamp } = require('./math');

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function createGravityController({ getWindow, onFallEnd, onFallStart }) {
  let enabled = DEFAULT_GRAVITY_PROFILE.enabled;
  let fallTimer;
  let isFalling = false;

  function getEnabled() {
    return enabled;
  }

  function getGroundY(bounds) {
    const display = screen.getDisplayMatching(bounds);
    const { workArea } = display;

    return workArea.y + workArea.height - bounds.height;
  }

  function cancelFall() {
    clearInterval(fallTimer);
    fallTimer = undefined;
    isFalling = false;
  }

  function dropToGround() {
    const petWindow = getWindow();

    if (!enabled || !petWindow || petWindow.isDestroyed() || !petWindow.isVisible()) {
      return false;
    }

    const startBounds = petWindow.getBounds();
    const targetY = getGroundY(startBounds);

    if (startBounds.y >= targetY) {
      petWindow.setBounds({ ...startBounds, y: targetY });
      return false;
    }

    cancelFall();
    isFalling = true;
    onFallStart?.();

    const startTime = Date.now();
    let lastY = startBounds.y;

    fallTimer = setInterval(() => {
      const currentWindow = getWindow();

      if (!currentWindow || currentWindow.isDestroyed()) {
        cancelFall();
        return;
      }

      const progress = clamp(
        (Date.now() - startTime) / DEFAULT_GRAVITY_PROFILE.fallDurationMs,
        0,
        1,
      );
      const nextY = Math.round(startBounds.y + (targetY - startBounds.y) * easeOutCubic(progress));

      if (nextY !== lastY) {
        currentWindow.setBounds({ ...currentWindow.getBounds(), y: nextY });
        lastY = nextY;
      }

      if (progress >= 1) {
        clearInterval(fallTimer);
        fallTimer = undefined;
        isFalling = false;
        currentWindow.setBounds({ ...currentWindow.getBounds(), y: targetY });
        onFallEnd?.();
      }
    }, DEFAULT_GRAVITY_PROFILE.frameMs);

    return true;
  }

  function setEnabled(nextEnabled) {
    enabled = nextEnabled;

    if (enabled) {
      return dropToGround();
    }

    cancelFall();
    onFallEnd?.();
    return false;
  }

  return {
    cancelFall,
    dropToGround,
    getEnabled,
    setEnabled,
  };
}

module.exports = {
  createGravityController,
};
