const axios = require('axios');

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_MAX_RETRIES = 2;
const PING_TIMEOUT = 3000;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 60000;

const API_PROVIDERS = [
  {
    name: 'Groq',
    type: 'openai-compat',
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    envKey: 'GROQ_API_KEY',
    rpm: 30,
    tpm: 6000,
    dailyLimit: '~1000 req/day (70B models)',
    creditCard: false,
    pingEndpoint: '/models',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error('GROQ_API_KEY not set');
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: options.model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
  {
    name: 'Google Gemini',
    type: 'native',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
    envKey: 'GEMINI_API_KEY',
    rpm: 10,
    tpm: 250000,
    dailyLimit: '1500 req/day (Flash)',
    creditCard: false,
    pingEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    pingMethod: 'get',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY not set');
      const modelName = options.model || 'gemini-2.5-flash';
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1024,
            temperature: options.temperature ?? 0.7,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          params: { key: apiKey },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.candidates[0].content.parts[0].text;
    },
  },
  {
    name: 'OpenRouter',
    type: 'openai-compat',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    envKey: 'OPENROUTER_API_KEY',
    rpm: 20,
    dailyLimit: '50 req/day (1000 with $10+ credits)',
    creditCard: false,
    pingEndpoint: '/models',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: options.model || 'openrouter/free',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
  {
    name: 'Together AI',
    type: 'openai-compat',
    baseURL: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    envKey: 'TOGETHER_API_KEY',
    rpm: 60,
    dailyLimit: '$1 trial credits',
    creditCard: false,
    pingEndpoint: '/models',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.TOGETHER_API_KEY;
      if (!apiKey) throw new Error('TOGETHER_API_KEY not set');
      const res = await axios.post(
        'https://api.together.xyz/v1/chat/completions',
        {
          model: options.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
  {
    name: 'Cerebras',
    type: 'openai-compat',
    baseURL: 'https://api.cerebras.ai/v1',
    model: 'llama3.1-8b',
    envKey: 'CEREBRAS_API_KEY',
    rpm: 30,
    tpm: 60000,
    dailyLimit: '1M tokens/day',
    creditCard: false,
    pingEndpoint: '/models',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.CEREBRAS_API_KEY;
      if (!apiKey) throw new Error('CEREBRAS_API_KEY not set');
      const res = await axios.post(
        'https://api.cerebras.ai/v1/chat/completions',
        {
          model: options.model || 'llama3.1-8b',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
  {
    name: 'Cohere',
    type: 'native',
    baseURL: 'https://api.cohere.ai/v2',
    model: 'command-r-plus-08-2024',
    envKey: 'COHERE_API_KEY',
    rpm: 20,
    monthlyLimit: '1000 req/month (trial key)',
    creditCard: false,
    pingEndpoint: 'https://api.cohere.ai/v2/models',
    pingMethod: 'get',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.COHERE_API_KEY;
      if (!apiKey) throw new Error('COHERE_API_KEY not set');
      const res = await axios.post(
        'https://api.cohere.ai/v2/chat',
        {
          model: options.model || 'command-r-plus-08-2024',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.message.content[0].text;
    },
  },
  {
    name: 'HuggingFace',
    type: 'openai-compat',
    baseURL: 'https://router.huggingface.co/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    envKey: 'HF_TOKEN',
    rpm: '~200/hr (varies by model)',
    creditCard: false,
    pingEndpoint: 'https://huggingface.co/api/healthcheck',
    pingMethod: 'get',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.HF_TOKEN;
      if (!apiKey) throw new Error('HF_TOKEN not set');
      const res = await axios.post(
        'https://router.huggingface.co/v1/chat/completions',
        {
          model: options.model || 'meta-llama/Llama-3.3-70B-Instruct',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
  {
    name: 'SambaNova',
    type: 'openai-compat',
    baseURL: 'https://api.sambanova.ai/v1',
    model: 'Meta-Llama-3.3-70B-Instruct',
    envKey: 'SAMBANOVA_API_KEY',
    rpm: 30,
    dailyLimit: 'Depends on credits ($5 free trial, 3 months)',
    creditCard: false,
    pingEndpoint: '/models',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.SAMBANOVA_API_KEY;
      if (!apiKey) throw new Error('SAMBANOVA_API_KEY not set');
      const res = await axios.post(
        'https://api.sambanova.ai/v1/chat/completions',
        {
          model: options.model || 'Meta-Llama-3.3-70B-Instruct',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
  {
    name: 'Mistral AI',
    type: 'openai-compat',
    baseURL: 'https://api.mistral.ai/v1',
    model: 'open-mistral-nemo',
    envKey: 'MISTRAL_API_KEY',
    rpm: 60,
    monthlyLimit: '1B tokens/month free',
    creditCard: false,
    pingEndpoint: '/models',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.MISTRAL_API_KEY;
      if (!apiKey) throw new Error('MISTRAL_API_KEY not set');
      const res = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: options.model || 'open-mistral-nemo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
  {
    name: 'DeepSeek',
    type: 'openai-compat',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
    dailyLimit: '5M free tokens + very cheap paid',
    creditCard: true,
    pingEndpoint: '/models',
    makeRequest: async (prompt, options = {}) => {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');
      const res = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: options.model || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || DEFAULT_TIMEOUT,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
];

const providerStats = {};
const circuitBreakers = {};

function initProviderStats(providers) {
  providers.forEach((p) => {
    if (!providerStats[p.name]) {
      providerStats[p.name] = {
        totalRequests: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        totalResponseTime: 0,
        consecutiveFailures: 0,
        lastSuccessAt: null,
        avgResponseTime: 0,
      };
    }
    if (!circuitBreakers[p.name]) {
      circuitBreakers[p.name] = {
        state: 'closed',
        failureCount: 0,
        lastFailureAt: null,
      };
    }
  });
}

function isCircuitOpen(providerName) {
  const cb = circuitBreakers[providerName];
  if (!cb || cb.state !== 'open') return false;
  const now = Date.now();
  if (cb.lastFailureAt && now - cb.lastFailureAt > CIRCUIT_BREAKER_RESET_MS) {
    cb.state = 'half-open';
    cb.failureCount = 0;
    return false;
  }
  return true;
}

function recordSuccess(providerName, responseTime) {
  const stats = providerStats[providerName];
  if (!stats) return;
  stats.totalRequests++;
  stats.totalSuccesses++;
  stats.consecutiveFailures = 0;
  stats.totalResponseTime += responseTime;
  stats.lastSuccessAt = Date.now();
  stats.avgResponseTime = stats.totalResponseTime / stats.totalSuccesses;
  const cb = circuitBreakers[providerName];
  if (cb) {
    cb.state = 'closed';
    cb.failureCount = 0;
  }
}

function recordFailure(providerName) {
  const stats = providerStats[providerName];
  if (!stats) return;
  stats.totalRequests++;
  stats.totalFailures++;
  stats.consecutiveFailures++;
  const cb = circuitBreakers[providerName];
  if (cb) {
    cb.failureCount++;
    cb.lastFailureAt = Date.now();
    if (cb.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      cb.state = 'open';
    }
  }
}

function getProviderConfig(name) {
  return API_PROVIDERS.find((p) => p.name === name);
}

function getAllProviderConfigs() {
  return API_PROVIDERS.map((p) => ({
    name: p.name,
    type: p.type,
    baseURL: p.baseURL,
    model: p.model,
    envKey: p.envKey,
    rpm: p.rpm,
    tpm: p.tpm,
    dailyLimit: p.dailyLimit,
    monthlyLimit: p.monthlyLimit,
    creditCard: p.creditCard,
  }));
}

function getAvailableProviders() {
  return API_PROVIDERS.filter((p) => process.env[p.envKey]);
}

async function pingProvider(provider) {
  try {
    const apiKey = process.env[provider.envKey];
    if (!apiKey) return false;
    const pingEndpoint = provider.pingEndpoint
      ? provider.pingEndpoint.startsWith('http')
        ? provider.pingEndpoint
        : provider.baseURL + provider.pingEndpoint
      : provider.baseURL + '/models';
    const pingMethod = (provider.pingMethod || 'get').toLowerCase();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (provider.type === 'native' && provider.name === 'Google Gemini') {
      headers['Content-Type'] = 'application/json';
      const res = await axios({
        method: pingMethod,
        url: pingEndpoint,
        headers,
        params: { key: apiKey },
        timeout: PING_TIMEOUT,
        validateStatus: (status) => status >= 200 && status < 400,
      });
      return res.status >= 200 && res.status < 400;
    }
    headers.Authorization = `Bearer ${apiKey}`;
    const res = await axios({
      method: pingMethod,
      url: pingEndpoint,
      headers,
      timeout: PING_TIMEOUT,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

function scoreProvider(provider) {
  const stats = providerStats[provider.name];
  if (!stats) return 0;
  if (stats.totalRequests === 0) return 1;
  const successRate = stats.totalSuccesses / stats.totalRequests;
  const responseTimeScore = stats.avgResponseTime > 0
    ? Math.max(0, 1 - stats.avgResponseTime / 10000)
    : 0.5;
  const recencyBonus = stats.lastSuccessAt
    ? Math.max(0, 1 - (Date.now() - stats.lastSuccessAt) / 300000)
    : 0;
  return successRate * 0.5 + responseTimeScore * 0.3 + recencyBonus * 0.2;
}

function getSortedProviders(providers) {
  initProviderStats(providers);
  const activeProviders = providers.filter((p) => !isCircuitOpen(p.name));
  return [...activeProviders].sort((a, b) => {
    const scoreB = scoreProvider(b);
    const scoreA = scoreProvider(a);
    return scoreB - scoreA;
  });
}

async function makeInference(prompt, options = {}) {
  const availableProviders = getAvailableProviders();
  if (availableProviders.length === 0) {
    throw new Error(
      'No LLM API providers configured. Set at least one *_API_KEY environment variable.'
    );
  }
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const sortedProviders = getSortedProviders(availableProviders);
  const errors = [];

  for (const provider of sortedProviders) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await provider.makeRequest(prompt, options);
        const responseTime = Date.now() - startTime;
        recordSuccess(provider.name, responseTime);
        return { response, provider: provider.name, responseTime };
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 200 * (attempt + 1))
          );
        }
      }
    }
    recordFailure(provider.name);
    errors.push({
      provider: provider.name,
      error: lastError ? lastError.message : 'Unknown error',
    });
  }

  const errorSummary = errors
    .map((e) => `${e.provider}: ${e.error}`)
    .join('; ');
  throw new Error(`All providers failed. Errors: ${errorSummary}`);
}

async function getProviderHealthStatus() {
  const availableProviders = getAvailableProviders();
  const results = [];
  for (const provider of availableProviders) {
    const isHealthy = await pingProvider(provider);
    const stats = providerStats[provider.name] || {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      avgResponseTime: 0,
    };
    const cb = circuitBreakers[provider.name] || { state: 'closed' };
    results.push({
      name: provider.name,
      healthy: isHealthy,
      circuitBreakerState: cb.state,
      successRate:
        stats.totalRequests > 0
          ? (stats.totalSuccesses / stats.totalRequests) * 100
          : null,
      avgResponseTime: stats.avgResponseTime || null,
      score: scoreProvider(provider),
    });
  }
  return results;
}

function getProviderStats() {
  const result = {};
  for (const [name, stats] of Object.entries(providerStats)) {
    result[name] = {
      ...stats,
      circuitBreakerState: circuitBreakers[name]?.state || 'unknown',
    };
  }
  return result;
}

function resetProviderStats() {
  for (const key of Object.keys(providerStats)) {
    delete providerStats[key];
  }
  for (const key of Object.keys(circuitBreakers)) {
    delete circuitBreakers[key];
  }
}

module.exports = {
  API_PROVIDERS,
  getProviderConfig,
  getAllProviderConfigs,
  getAvailableProviders,
  makeInference,
  getProviderHealthStatus,
  getProviderStats,
  resetProviderStats,
  pingProvider,
  providerStats,
  circuitBreakers,
};
