function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

module.exports = {
  clamp,
  easeInOutSine,
};
