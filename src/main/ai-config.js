const fs = require('node:fs/promises');
const path = require('node:path');
const { app } = require('electron');

const AI_CONFIG_FILE_NAME = 'ai-providers.json';

const AI_PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
  },
  {
    id: 'claude',
    label: 'Claude',
    kind: 'claude',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-latest',
  },
  {
    id: 'qwen',
    label: '通义千问',
    kind: 'openai-compatible',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'openai-compatible',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  {
    id: 'okinto',
    label: 'Okinto Third-Party',
    kind: 'openai-compatible',
    defaultBaseUrl: 'https://api.okinto.com/v1',
    defaultModel: 'gpt-5.5',
    defaultNote: 'Third-party',
  },
];

function getConfigFilePath() {
  return path.join(app.getPath('userData'), AI_CONFIG_FILE_NAME);
}

function createProviderConfig(provider) {
  return {
    label: provider.label,
    note: provider.defaultNote || '',
    kind: provider.kind,
    enabled: true,
    apiKey: '',
    baseUrl: provider.defaultBaseUrl,
    model: provider.defaultModel,
  };
}

function createDefaultConfig() {
  return {
    activeProvider: 'openai',
    providers: Object.fromEntries(AI_PROVIDERS.map((provider) => [provider.id, createProviderConfig(provider)])),
  };
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBaseUrl(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
  return candidate || fallback;
}

function normalizeProviderKind(value, fallback) {
  return value === 'claude' ? 'claude' : fallback === 'claude' ? 'claude' : 'openai-compatible';
}

function normalizeProviderConfig(value, descriptor) {
  const input = isRecord(value) ? value : {};
  return {
    label: typeof input.label === 'string' && input.label.trim() ? input.label.trim() : descriptor.label,
    note: typeof input.note === 'string' ? input.note.trim() : descriptor.defaultNote || '',
    kind: normalizeProviderKind(input.kind, descriptor.kind),
    enabled: input.enabled !== false,
    apiKey: typeof input.apiKey === 'string' ? input.apiKey.trim() : '',
    baseUrl: normalizeBaseUrl(input.baseUrl, descriptor.defaultBaseUrl),
    model: typeof input.model === 'string' && input.model.trim() ? input.model.trim() : descriptor.defaultModel,
  };
}

function getMissingProviderFields(config) {
  const missing = [];

  if (!config.enabled) {
    missing.push('enabled');
  }

  if (!config.apiKey) {
    missing.push('apiKey');
  }

  if (!config.baseUrl) {
    missing.push('baseUrl');
  }

  if (!config.model) {
    missing.push('model');
  }

  return missing;
}

function normalizeConfig(value) {
  const input = isRecord(value) ? value : {};
  const providerInput = isRecord(input.providers) ? input.providers : {};
  const providers = {};

  for (const descriptor of AI_PROVIDERS) {
    providers[descriptor.id] = normalizeProviderConfig(providerInput[descriptor.id], descriptor);
  }

  const configuredProviders = Object.entries(providers)
    .filter(([, provider]) => getMissingProviderFields(provider).length === 0)
    .map(([id]) => id);
  const requestedActiveProvider = typeof input.activeProvider === 'string' ? input.activeProvider : 'openai';

  return {
    activeProvider: configuredProviders.includes(requestedActiveProvider)
      ? requestedActiveProvider
      : providers[requestedActiveProvider]
        ? requestedActiveProvider
        : 'openai',
    providers,
  };
}

async function saveAiConfig(config) {
  const configFilePath = getConfigFilePath();
  const normalized = normalizeConfig(config);
  await fs.mkdir(path.dirname(configFilePath), { recursive: true });
  await fs.writeFile(configFilePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

async function loadAiConfig() {
  const configFilePath = getConfigFilePath();

  try {
    const raw = await fs.readFile(configFilePath, 'utf8');
    return normalizeConfig(JSON.parse(raw));
  } catch (_error) {
    const config = createDefaultConfig();
    await saveAiConfig(config);
    return config;
  }
}

function getAiConfigState(config) {
  const normalized = normalizeConfig(config);
  const providers = AI_PROVIDERS.map((descriptor) => {
    const providerConfig = normalized.providers[descriptor.id];
    const missing = getMissingProviderFields(providerConfig);

    return {
      id: descriptor.id,
      label: providerConfig.label,
      note: providerConfig.note,
      kind: providerConfig.kind,
      configured: missing.length === 0,
      missing,
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.model,
    };
  });
  const activeProvider = providers.find((provider) => provider.id === normalized.activeProvider) || providers[0];

  return {
    ready: providers.some((provider) => provider.configured),
    configFilePath: getConfigFilePath(),
    activeProvider: activeProvider?.id || '',
    activeProviderLabel: activeProvider?.label || '',
    activeModel: activeProvider?.model || '',
    missing: activeProvider?.missing || [],
    providers,
  };
}

async function getAiConfigSnapshot() {
  return getAiConfigState(await loadAiConfig());
}

async function updateAiProviderConfig(input) {
  const config = await loadAiConfig();
  const providerId = typeof input?.providerId === 'string' ? input.providerId : config.activeProvider;

  if (!config.providers[providerId]) {
    throw new Error(`Unsupported AI provider: ${providerId}`);
  }

  config.activeProvider = providerId;
  config.providers[providerId] = normalizeProviderConfig(
    {
      ...config.providers[providerId],
      apiKey: input?.apiKey,
      baseUrl: input?.baseUrl,
      model: input?.model,
    },
    AI_PROVIDERS.find((provider) => provider.id === providerId),
  );

  const saved = await saveAiConfig(config);
  return getAiConfigState(saved);
}

module.exports = {
  getAiConfigSnapshot,
  updateAiProviderConfig,
};
