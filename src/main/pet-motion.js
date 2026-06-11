const { screen } = require('electron');
const {
  DEFAULT_MOTION_PROFILE,
  PET_ANIMATION,
  PET_STATUS,
  WALK_FRAME_MS,
} = require('./constants');
const { clamp, easeInOutSine } = require('./math');

function randomInteger(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function createPetMotionController({ getWindow, sendAnimation }) {
  let petStatus = PET_STATUS.STANDBY;
  let motionProfile = { ...DEFAULT_MOTION_PROFILE };
  let walkTimer;
  let moveTimer;
  let isMoving = false;

  function getStatus() {
    return petStatus;
  }

  function cancelMovement() {
    clearInterval(moveTimer);
    moveTimer = undefined;
    isMoving = false;
    sendAnimation(PET_ANIMATION.IDLE);
  }

  function canScheduleWalk() {
    const petWindow = getWindow();

    return (
      petStatus === PET_STATUS.STANDBY &&
      petWindow &&
      !petWindow.isDestroyed() &&
      petWindow.isVisible() &&
      !isMoving
    );
  }

  function scheduleNextWalk() {
    clearTimeout(walkTimer);
    walkTimer = undefined;

    if (!canScheduleWalk()) {
      return;
    }

    walkTimer = setTimeout(() => {
      walkTimer = undefined;
      moveRandomly();
    }, motionProfile.walkIntervalMs);
  }

  function animateToX(targetX, stepUnits) {
    const petWindow = getWindow();

    if (!petWindow || petWindow.isDestroyed()) {
      return;
    }

    clearInterval(moveTimer);
    isMoving = true;

    const startBounds = petWindow.getBounds();
    const startX = startBounds.x;
    const direction = targetX < startX ? PET_ANIMATION.WALK_LEFT : PET_ANIMATION.WALK_RIGHT;
    const startTime = Date.now();
    const durationMs = stepUnits * motionProfile.walkStepDurationMs;
    let lastX = startX;

    // APNG walk animations loop while this whole multi-step move is active.
    // We only return to idle after all 16px logical steps are complete.
    sendAnimation(direction);

    moveTimer = setInterval(() => {
      const currentWindow = getWindow();

      if (!currentWindow || currentWindow.isDestroyed()) {
        cancelMovement();
        return;
      }

      if (petStatus !== PET_STATUS.STANDBY || !currentWindow.isVisible()) {
        cancelMovement();
        return;
      }

      const progress = clamp((Date.now() - startTime) / durationMs, 0, 1);
      const eased = easeInOutSine(progress);
      const nextX = Math.round(startX + (targetX - startX) * eased);

      if (nextX !== lastX) {
        currentWindow.setBounds({ ...startBounds, x: nextX });
        lastX = nextX;
      }

      if (progress >= 1) {
        clearInterval(moveTimer);
        moveTimer = undefined;
        isMoving = false;
        currentWindow.setBounds({ ...startBounds, x: targetX });
        sendAnimation(PET_ANIMATION.IDLE);
        scheduleNextWalk();
      }
    }, WALK_FRAME_MS);
  }

  function getAvailableStepUnits(bounds, direction, workArea) {
    const availablePx = direction < 0
      ? bounds.x - workArea.x
      : workArea.x + workArea.width - (bounds.x + bounds.width);

    return Math.floor(Math.max(0, availablePx) / motionProfile.walkStepPx);
  }

  function pickMovePlan(bounds, workArea) {
    const preferredDirection = Math.random() < 0.5 ? -1 : 1;
    const directions = [preferredDirection, -preferredDirection];

    for (const direction of directions) {
      const availableUnits = getAvailableStepUnits(bounds, direction, workArea);

      if (availableUnits < motionProfile.minWalkStepUnits) {
        continue;
      }

      const maxUnits = Math.min(motionProfile.maxWalkStepUnits, availableUnits);
      const stepUnits = randomInteger(motionProfile.minWalkStepUnits, maxUnits);
      const targetX = bounds.x + direction * stepUnits * motionProfile.walkStepPx;

      return {
        stepUnits,
        targetX,
      };
    }

    return undefined;
  }

  function moveRandomly() {
    const petWindow = getWindow();

    if (
      petStatus !== PET_STATUS.STANDBY ||
      !petWindow ||
      petWindow.isDestroyed() ||
      !petWindow.isVisible() ||
      isMoving
    ) {
      return;
    }

    const bounds = petWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const { workArea } = display;
    const movePlan = pickMovePlan(bounds, workArea);

    if (!movePlan) {
      scheduleNextWalk();
      return;
    }

    animateToX(movePlan.targetX, movePlan.stepUnits);
  }

  function stopWalking() {
    clearTimeout(walkTimer);
    walkTimer = undefined;
  }

  function startWalking() {
    scheduleNextWalk();
  }

  function setStatus(status) {
    petStatus = status;

    if (petStatus === PET_STATUS.STANDBY) {
      startWalking();
    } else {
      stopWalking();
      cancelMovement();
    }
  }

  return {
    cancelMovement,
    getStatus,
    setStatus,
    startWalking,
    stopWalking,
  };
}

module.exports = {
  createPetMotionController,
};
