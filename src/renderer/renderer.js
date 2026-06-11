const petImage = document.querySelector('#petImage');

const animationSources = {
  idle: './assets/pets/fire-slime/idle/idle.apng',
  'walk-left': './assets/pets/fire-slime/walk-left/walk-left.apng',
  'walk-right': './assets/pets/fire-slime/walk-right/walk-right.apng',
};

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

window.keeper?.onPetAnimationChanged(setPetAnimation);
