const showPetButton = document.querySelector('#showPetButton');
const currentPetSelect = document.querySelector('#currentPetSelect');
const keeperPreview = document.querySelector('#keeperPreview');
const petStatus = document.querySelector('#petStatus');
const petName = document.querySelector('#petName');
const gravityStatus = document.querySelector('#gravityStatus');
const visibleStatus = document.querySelector('#visibleStatus');
const actionLog = document.querySelector('#actionLog');

showPetButton.addEventListener('click', () => {
  window.keeper?.showPet();
});

currentPetSelect.addEventListener('change', async () => {
  const snapshot = await window.keeper?.setCurrentPet(currentPetSelect.value);

  if (snapshot) {
    renderSnapshot(snapshot);
  }
});

function renderPetOptions(pets, currentPetId) {
  currentPetSelect.replaceChildren();

  for (const pet of pets) {
    const option = document.createElement('option');
    option.value = pet.id;
    option.textContent = pet.name;
    currentPetSelect.append(option);
  }

  currentPetSelect.value = currentPetId;
}

function renderLog(entries) {
  actionLog.replaceChildren();

  for (const entry of entries) {
    const item = document.createElement('li');
    item.textContent = `[${entry.time}] ${entry.message}`;
    actionLog.append(item);
  }
}

function renderSnapshot(snapshot) {
  renderPetOptions(snapshot.pets || [], snapshot.currentPetId);
  petStatus.textContent = snapshot.statusLabel;
  petName.textContent = snapshot.petName;
  gravityStatus.textContent = snapshot.gravityEnabled ? '开启' : '关闭';
  visibleStatus.textContent = snapshot.petVisible ? '显示' : '隐藏';
  keeperPreview.src = `../assets/pets/${snapshot.currentPetId}/idle/idle.apng`;
  keeperPreview.alt = `待机状态的${snapshot.petName}`;
  renderLog(snapshot.actionLog || []);
}

async function init() {
  if (!window.keeper) {
    return;
  }

  renderSnapshot(await window.keeper.getKeeperSnapshot());
  window.keeper.onKeeperSnapshotChanged(renderSnapshot);
}

init();
