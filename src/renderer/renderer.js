const petImage = document.querySelector('#petImage');
const petStage = document.querySelector('#petStage');
const keyboardBubbles = document.querySelector('#keyboardBubbles');

const defaultPetId = 'ice-slime';
const maxKeyboardTextLength = 18;
const maxKeyboardBubbles = 3;

let dragging = false;
let activePointerId;
let shockTimer;
let keyboardBubbleLines = [];
let keyboardBubbleTimer;

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
  const animation = typeof payload === 'string' ? payload : payload?.animation || 'idle';
  const petId = typeof payload === 'string' ? defaultPetId : payload?.petId || defaultPetId;
  const source = `./assets/pets/${petId}/${animation}/${animation}.apng`;

  if (petImage.dataset.animation === animation && petImage.dataset.petId === petId) {
    return;
  }

  petImage.dataset.animation = animation;
  petImage.dataset.petId = petId;
  petImage.src = source;
}

function updateKeyboardBubble() {
  keyboardBubbles.replaceChildren();

  const visibleLines = keyboardBubbleLines.map((line) => line || ' ');
  keyboardBubbles.classList.toggle('is-visible', visibleLines.length > 0);

  visibleLines.forEach((line, index) => {
    const bubble = document.createElement('div');
    const age = visibleLines.length - index - 1;
    bubble.className = 'keyboard-bubble';
    bubble.dataset.age = String(age);
    bubble.textContent = line;
    keyboardBubbles.append(bubble);
  });
}

function hideKeyboardBubbleAfter(delayMs) {
  window.clearTimeout(keyboardBubbleTimer);
  keyboardBubbleTimer = window.setTimeout(() => {
    keyboardBubbleLines = [];
    updateKeyboardBubble();
  }, delayMs);
}

function appendKeyboardBubbleLine() {
  if (keyboardBubbleLines.length === 0) {
    keyboardBubbleLines.push('');
  }

  keyboardBubbleLines.push('');

  if (keyboardBubbleLines.length > maxKeyboardBubbles) {
    keyboardBubbleLines = keyboardBubbleLines.slice(-maxKeyboardBubbles);
  }
}

function appendKeyboardText(value) {
  if (keyboardBubbleLines.length === 0) {
    keyboardBubbleLines.push('');
  }

  const currentIndex = keyboardBubbleLines.length - 1;
  keyboardBubbleLines[currentIndex] = `${keyboardBubbleLines[currentIndex]}${value}`.slice(
    -maxKeyboardTextLength,
  );
}

function renderKeyboardInput(payload) {
  if (!payload) {
    return;
  }

  if (payload.type === 'backspace') {
    if (keyboardBubbleLines.length > 0) {
      const currentIndex = keyboardBubbleLines.length - 1;
      keyboardBubbleLines[currentIndex] = keyboardBubbleLines[currentIndex].slice(0, -1);
    }
  } else if (payload.type === 'text') {
    if (payload.value === '\n') {
      appendKeyboardBubbleLine();
    } else {
      appendKeyboardText(payload.value === ' ' ? '␣' : payload.value);
    }
  }

  updateKeyboardBubble();
  hideKeyboardBubbleAfter(payload.hideDelayMs || 1400);
}

petStage.addEventListener('mouseenter', () => {
  window.keeper?.hoverStart();

  if (!dragging) {
    playShock();
  }
});

petStage.addEventListener('mouseleave', () => {
  window.keeper?.hoverEnd();
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
window.keeper?.onKeyboardTextInput(renderKeyboardInput);
