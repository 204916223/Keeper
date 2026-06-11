const currentPetSelect = document.querySelector('#currentPetSelect');
const aiProviderSelect = document.querySelector('#aiProviderSelect');
const aiModelInput = document.querySelector('#aiModelInput');
const aiBaseUrlInput = document.querySelector('#aiBaseUrlInput');
const aiApiKeyInput = document.querySelector('#aiApiKeyInput');
const aiConfigStatus = document.querySelector('#aiConfigStatus');
const saveAiConfigButton = document.querySelector('#saveAiConfigButton');
const keeperPreview = document.querySelector('#keeperPreview');
const levelStat = document.querySelector('#levelStat');
const lifeStat = document.querySelector('#lifeStat');
const attackStat = document.querySelector('#attackStat');
const defenseStat = document.querySelector('#defenseStat');
const actionLog = document.querySelector('#actionLog');

let aiConfigState;

currentPetSelect.addEventListener('change', async () => {
  const snapshot = await window.keeper?.setCurrentPet(currentPetSelect.value);

  if (snapshot) {
    renderSnapshot(snapshot);
  }
});

aiProviderSelect.addEventListener('change', () => {
  renderAiProviderFields(aiProviderSelect.value);
});

saveAiConfigButton.addEventListener('click', async () => {
  saveAiConfigButton.disabled = true;
  aiConfigStatus.textContent = '保存中';

  try {
    aiConfigState = await window.keeper?.updateAiProvider({
      providerId: aiProviderSelect.value,
      model: aiModelInput.value,
      baseUrl: aiBaseUrlInput.value,
      apiKey: aiApiKeyInput.value,
    });
    renderAiConfig(aiConfigState);
  } catch (error) {
    aiConfigStatus.textContent = '保存失败';
  } finally {
    saveAiConfigButton.disabled = false;
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

function getAiProvider(providerId) {
  return aiConfigState?.providers?.find((provider) => provider.id === providerId);
}

function renderAiProviderOptions(state) {
  aiProviderSelect.replaceChildren();

  for (const provider of state.providers || []) {
    const option = document.createElement('option');
    option.value = provider.id;
    option.textContent = provider.label;
    aiProviderSelect.append(option);
  }

  aiProviderSelect.value = state.activeProvider;
}

function renderAiProviderFields(providerId) {
  const provider = getAiProvider(providerId);

  if (!provider) {
    aiModelInput.value = '';
    aiBaseUrlInput.value = '';
    aiApiKeyInput.value = '';
    aiConfigStatus.textContent = '未配置';
    return;
  }

  aiModelInput.value = provider.model || '';
  aiBaseUrlInput.value = provider.baseUrl || '';
  aiApiKeyInput.value = provider.apiKey || '';
  aiConfigStatus.textContent = provider.configured ? '已配置' : '未配置';
}

function renderAiConfig(state) {
  if (!state) {
    return;
  }

  aiConfigState = state;
  renderAiProviderOptions(state);
  renderAiProviderFields(state.activeProvider);
}

function renderLog(entries) {
  actionLog.replaceChildren();

  for (const entry of entries) {
    const item = document.createElement('li');
    item.className = 'action-log-row';

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = entry.time || '--:--:--';

    const message = document.createElement('span');
    message.className = 'log-message';
    message.textContent = entry.message || '';

    item.append(time, message);
    actionLog.append(item);
  }
}

function formatStat(stat) {
  const current = Number.isFinite(stat?.current) ? stat.current : 1;
  const max = Number.isFinite(stat?.max) ? stat.max : 99;

  return `${String(current).padStart(2, '0')}/${String(max).padStart(2, '0')}`;
}

function renderStats(stats = {}) {
  levelStat.textContent = formatStat(stats.level);
  lifeStat.textContent = formatStat(stats.life);
  attackStat.textContent = formatStat(stats.attack);
  defenseStat.textContent = formatStat(stats.defense);
}

function renderSnapshot(snapshot) {
  renderPetOptions(snapshot.pets || [], snapshot.currentPetId);
  renderStats(snapshot.petStats);
  keeperPreview.src = `../assets/pets/${snapshot.currentPetId}/idle/idle.apng`;
  keeperPreview.alt = `待机状态的${snapshot.petName}`;
  renderLog(snapshot.actionLog || []);
}

async function init() {
  if (!window.keeper) {
    return;
  }

  const [snapshot, nextAiConfigState] = await Promise.all([
    window.keeper.getKeeperSnapshot(),
    window.keeper.getAiConfig(),
  ]);

  renderSnapshot(snapshot);
  renderAiConfig(nextAiConfigState);
  window.keeper.onKeeperSnapshotChanged(renderSnapshot);
}

init();
