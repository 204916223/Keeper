const WINDOW_WIDTH = 160;
const WINDOW_HEIGHT = 160;

const PET_STATUS = {
  DO_NOT_DISTURB: 'do-not-disturb',
  STANDBY: 'standby',
};

const PET_ANIMATION = {
  IDLE: 'idle',
  WALK_LEFT: 'walk-left',
  WALK_RIGHT: 'walk-right',
};

const DEFAULT_MOTION_PROFILE = {
  walkIntervalMs: 5000,
  walkStepDurationMs: 560,
  walkStepPx: 16,
  minWalkStepUnits: 1,
  maxWalkStepUnits: 8,
};

const WALK_FRAME_MS = 12;

module.exports = {
  DEFAULT_MOTION_PROFILE,
  PET_ANIMATION,
  PET_STATUS,
  WALK_FRAME_MS,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
};
