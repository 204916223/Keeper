const WINDOW_WIDTH = 160;
const WINDOW_HEIGHT = 160;

const BUILT_IN_PETS = [
  {
    id: 'ice-slime',
    name: '冰史莱姆',
  },
  {
    id: 'fire-slime',
    name: '火史莱姆',
  },
];

const DEFAULT_PET_ID = 'ice-slime';

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

const DEFAULT_GRAVITY_PROFILE = {
  enabled: true,
  fallDurationMs: 900,
  frameMs: 12,
};

module.exports = {
  BUILT_IN_PETS,
  DEFAULT_PET_ID,
  DEFAULT_GRAVITY_PROFILE,
  DEFAULT_MOTION_PROFILE,
  PET_ANIMATION,
  PET_STATUS,
  WALK_FRAME_MS,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
};
