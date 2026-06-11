const petImage = document.querySelector('#petImage');
const petStage = document.querySelector('#petStage');

const animationSources = {
  idle: './assets/pets/fire-slime/idle/idle.apng',
  'walk-left': './assets/pets/fire-slime/walk-left/walk-left.apng',
  'walk-right': './assets/pets/fire-slime/walk-right/walk-right.apng',
};

let dragging = false;
let activePointerId;
let shockTimer;

function eventPoint(event) {
  return {
    screenX: event.screenX,
    screenY: event.screenY,
  };
}

function playShock() {
  window.clearTimeout(shockTimer);
  petStage.classList.remove('is-shocked');
  petStage.offsetHeight;
  petStage.classList.add('is-shocked');

  shockTimer = window.setTimeout(() => {
    petStage.classList.remove('is-shocked');
  }, 560);
}

function setPetAnimation(payload) {
  const name = typeof payload === 'string' ? payload : payload?.name;
  const animation = animationSources[name] ? name : 'idle';
  const source = animationSources[animation] || animationSources.idle;

  if (petImage.dataset.animation === animation) {
    return;
  }

  petImage.dataset.animation = animation;
  petImage.src = source;
}

petStage.addEventListener('mouseenter', () => {
  if (!dragging) {
    playShock();
  }
});

function stopDragging(event) {
  if (!dragging) {
    return;
  }

  if (activePointerId !== undefined && petStage.hasPointerCapture(activePointerId)) {
    petStage.releasePointerCapture(activePointerId);
  }

  activePointerId = undefined;
  dragging = false;
  petStage.classList.remove('is-dragging');
  window.keeper?.dragEnd();
}

function stopDraggingIfButtonReleased(event) {
  if (dragging && event.buttons !== 1) {
    stopDragging(event);
  }
}

petStage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  petStage.setPointerCapture(event.pointerId);
  activePointerId = event.pointerId;
  dragging = true;
  petStage.classList.add('is-dragging');
  window.keeper?.dragStart(eventPoint(event));
});

petStage.addEventListener('pointermove', (event) => {
  stopDraggingIfButtonReleased(event);

  if (!dragging) {
    return;
  }

  window.keeper?.dragMove(eventPoint(event));
});

petStage.addEventListener('pointerup', stopDragging);
petStage.addEventListener('pointercancel', stopDragging);
petStage.addEventListener('mouseenter', stopDraggingIfButtonReleased);
window.addEventListener('mousemove', stopDraggingIfButtonReleased);
window.addEventListener('blur', stopDragging);

window.keeper?.onPetAnimationChanged(setPetAnimation);
