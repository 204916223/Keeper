const { screen } = require('electron');
const {
  MOTION_PROFILES,
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
  let walkTimer;
  let moveTimer;
  let isMoving = false;
  let homeX;

  function getMotionProfile() {
    return MOTION_PROFILES[petStatus] || MOTION_PROFILES[PET_STATUS.STANDBY];
  }

  function getStatus() {
    return petStatus;
  }

  function cancelMovement() {
    clearInterval(moveTimer);
    moveTimer = undefined;
    isMoving = false;
    sendAnimation(PET_ANIMATION.IDLE);
  }

  function isActive() {
    return isMoving;
  }

  function canScheduleWalk() {
    const petWindow = getWindow();

    return (
      petStatus !== PET_STATUS.DO_NOT_DISTURB &&
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
    }, getMotionProfile().walkIntervalMs);
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
    const durationMs = stepUnits * getMotionProfile().walkStepDurationMs;
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

      if (petStatus === PET_STATUS.DO_NOT_DISTURB || !currentWindow.isVisible()) {
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
    const motionProfile = getMotionProfile();
    const availablePx = direction < 0
      ? bounds.x - workArea.x
      : workArea.x + workArea.width - (bounds.x + bounds.width);

    return Math.floor(Math.max(0, availablePx) / motionProfile.walkStepPx);
  }

  function clampTargetXForStatus(targetX, bounds, workArea) {
    const left = workArea.x;
    const right = workArea.x + workArea.width - bounds.width;

    if (petStatus !== PET_STATUS.STANDBY || homeX === undefined) {
      return clamp(targetX, left, right);
    }

    const motionProfile = getMotionProfile();
    return clamp(
      targetX,
      Math.max(left, homeX - motionProfile.homeRangePx),
      Math.min(right, homeX + motionProfile.homeRangePx),
    );
  }

  function pickMovePlan(bounds, workArea, preferredDirection) {
    const resolvedDirection = preferredDirection || (Math.random() < 0.5 ? -1 : 1);
    const motionProfile = getMotionProfile();
    const directions = [resolvedDirection, -resolvedDirection];

    for (const direction of directions) {
      const availableUnits = getAvailableStepUnits(bounds, direction, workArea);

      if (availableUnits < motionProfile.minWalkStepUnits) {
        continue;
      }

      const maxUnits = Math.min(motionProfile.maxWalkStepUnits, availableUnits);
      const stepUnits = randomInteger(motionProfile.minWalkStepUnits, maxUnits);
      const targetX = clampTargetXForStatus(
        bounds.x + direction * stepUnits * motionProfile.walkStepPx,
        bounds,
        workArea,
      );

      if (targetX === bounds.x) {
        continue;
      }

      const resolvedStepUnits = Math.max(
        1,
        Math.round(Math.abs(targetX - bounds.x) / motionProfile.walkStepPx),
      );

      return {
        stepUnits: resolvedStepUnits,
        targetX,
      };
    }

    return undefined;
  }

  function moveRandomly(preferredDirection) {
    const petWindow = getWindow();

    if (
      petStatus === PET_STATUS.DO_NOT_DISTURB ||
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
    const movePlan = pickMovePlan(bounds, workArea, preferredDirection);

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

  function moveTowardScreenX(screenX) {
    const petWindow = getWindow();

    if (
      petStatus !== PET_STATUS.EXPLORE ||
      !petWindow ||
      petWindow.isDestroyed() ||
      !petWindow.isVisible() ||
      isMoving
    ) {
      return;
    }

    const bounds = petWindow.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    const preferredDirection = screenX < centerX ? -1 : 1;

    clearTimeout(walkTimer);
    walkTimer = undefined;
    moveRandomly(preferredDirection);
  }

  function setHomeFromCurrentPosition() {
    const petWindow = getWindow();

    if (!petWindow || petWindow.isDestroyed()) {
      return;
    }

    homeX = petWindow.getBounds().x;
  }

  function setStatus(status) {
    const previousStatus = petStatus;
    petStatus = status;

    stopWalking();

    if (previousStatus !== petStatus || petStatus === PET_STATUS.DO_NOT_DISTURB) {
      cancelMovement();
    }

    if (petStatus !== PET_STATUS.DO_NOT_DISTURB) {
      startWalking();
    } else {
      sendAnimation(PET_ANIMATION.IDLE);
    }
  }

  return {
    cancelMovement,
    getStatus,
    isActive,
    moveTowardScreenX,
    setHomeFromCurrentPosition,
    setStatus,
    startWalking,
    stopWalking,
  };
}

module.exports = {
  createPetMotionController,
};
