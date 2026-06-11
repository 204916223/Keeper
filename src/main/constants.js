const WINDOW_WIDTH = 160;
const WINDOW_HEIGHT = 224;

const BUILT_IN_PETS = [
  {
    id: 'ice-slime',
    name: '冰史莱姆',
    stats: {
      level: { current: 1, max: 99 },
      life: { current: 1, max: 99 },
      attack: { current: 1, max: 99 },
      defense: { current: 1, max: 99 },
    },
  },
  {
    id: 'fire-slime',
    name: '火史莱姆',
    stats: {
      level: { current: 1, max: 99 },
      life: { current: 1, max: 99 },
      attack: { current: 1, max: 99 },
      defense: { current: 1, max: 99 },
    },
  },
];

const DEFAULT_PET_ID = 'ice-slime';

const PET_STATUS = {
  DO_NOT_DISTURB: 'do-not-disturb',
  EXPLORE: 'explore',
  STANDBY: 'standby',
};

const PET_ANIMATION = {
  IDLE: 'idle',
  WALK_LEFT: 'walk-left',
  WALK_RIGHT: 'walk-right',
};

const PET_INTERACTIONS = [
  {
    id: 'pet',
    label: '摸摸',
    message: '被摸了摸，看起来很开心',
  },
  {
    id: 'feed',
    label: '喂食',
    message: '吃到了投喂的食物',
  },
  {
    id: 'bath',
    label: '洗澡',
    message: '洗了个澡，变得清爽了',
  },
  {
    id: 'sleep',
    label: '睡觉',
    message: '准备睡觉',
  },
];

const MOTION_PROFILES = {
  [PET_STATUS.EXPLORE]: {
    walkIntervalMs: 10000,
    walkStepDurationMs: 560,
    walkStepPx: 16,
    minWalkStepUnits: 1,
    maxWalkStepUnits: 10,
  },
  [PET_STATUS.STANDBY]: {
    walkIntervalMs: 60000,
    walkStepDurationMs: 560,
    walkStepPx: 16,
    minWalkStepUnits: 1,
    maxWalkStepUnits: 4,
    homeRangePx: 160,
  },
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
  MOTION_PROFILES,
  PET_ANIMATION,
  PET_INTERACTIONS,
  PET_STATUS,
  WALK_FRAME_MS,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
};
