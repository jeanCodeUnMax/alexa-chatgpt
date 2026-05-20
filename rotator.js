const axios = require("axios");

const HEALTH_CHECK_TIMEOUT = 5000;
const INFERENCE_TIMEOUT = 30000;
const HEALTH_CHECK_INTERVAL = 60000;

const PROVIDERS = [
  {
    id: "groq",
    name: "Groq",
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    model: () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    apiKey: () => process.env.GROQ_API_KEY,
    healthEndpoint: "/openai/v1/models",
    priority: 1,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openrouter/free"],
    model: () => process.env.OPENROUTER_MODEL || "openrouter/free",
    apiKey: () => process.env.OPENROUTER_API_KEY,
    healthEndpoint: "/api/v1/models",
    priority: 2,
  },
  {
    id: "cerebras",
    name: "Cerebras",
    type: "openai-compatible",
    baseUrl: "https://api.cerebras.ai/v1",
    models: ["llama3.1-70b", "llama3.1-8b"],
    model: () => process.env.CEREBRAS_MODEL || "llama3.1-70b",
    apiKey: () => process.env.CEREBRAS_API_KEY,
    healthEndpoint: "/v1/models",
    priority: 3,
  },
  {
    id: "huggingface",
    name: "HuggingFace",
    type: "huggingface",
    baseUrl: "https://api-inference.huggingface.co/models",
    models: ["mistralai/Mistral-7B-Instruct-v0.3", "meta-llama/Meta-Llama-3-8B-Instruct"],
    model: () => process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3",
    apiKey: () => process.env.HF_API_KEY,
    healthEndpoint: "/api/models",
    priority: 4,
  },
  {
    id: "together",
    name: "Together AI",
    type: "openai-compatible",
    baseUrl: "https://api.together.xyz/v1",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
    model: () => process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    apiKey: () => process.env.TOGETHER_API_KEY,
    healthEndpoint: "/v1/models",
    priority: 5,
  },
  {
    id: "google",
    name: "Google Gemini",
    type: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.0-flash", "gemini-1.5-flash"],
    model: () => process.env.GEMINI_MODEL || "gemini-2.0-flash",
    apiKey: () => process.env.GOOGLE_API_KEY,
    healthEndpoint: "/v1beta/models",
    priority: 6,
  },
];

class ProviderHealthTracker {
  constructor() {
    this.healthStatus = new Map();
    this.lastCheck = new Map();
    this.consecutiveFailures = new Map();
    for (const p of PROVIDERS) {
      this.healthStatus.set(p.id, "unknown");
      this.lastCheck.set(p.id, 0);
      this.consecutiveFailures.set(p.id, 0);
    }
  }

  isHealthy(providerId) {
    const status = this.healthStatus.get(providerId);
    return status === "healthy";
  }

  isAvailable(providerId) {
    const status = this.healthStatus.get(providerId);
    return status === "healthy" || status === "unknown";
  }

  markHealthy(providerId) {
    this.healthStatus.set(providerId, "healthy");
    this.consecutiveFailures.set(providerId, 0);
    this.lastCheck.set(providerId, Date.now());
  }

  markUnhealthy(providerId) {
    const fails = this.consecutiveFailures.get(providerId) + 1;
    this.consecutiveFailures.set(providerId, fails);
    this.lastCheck.set(providerId, Date.now());
    if (fails >= 3) {
      this.healthStatus.set(providerId, "unhealthy");
    }
  }

  getAvailableProviders() {
    return PROVIDERS.filter((p) => {
      const key = p.apiKey();
      if (!key) return false;
      return this.isAvailable(p.id);
    }).sort((a, b) => a.priority - b.priority);
  }
}

const tracker = new ProviderHealthTracker();

async function checkProviderHealth(provider) {
  const key = provider.apiKey();
  if (!key) return false;

  try {
    if (provider.type === "gemini") {
      const res = await axios.get(
        `${provider.baseUrl}${provider.healthEndpoint}?key=${key}`,
        { timeout: HEALTH_CHECK_TIMEOUT }
      );
      return res.status === 200;
    }

    const res = await axios.get(`${provider.baseUrl}${provider.healthEndpoint}`, {
      timeout: HEALTH_CHECK_TIMEOUT,
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    return res.status === 200;
  } catch (err) {
    return false;
  }
}

async function runHealthChecks() {
  const results = {};
  for (const provider of PROVIDERS) {
    if (!provider.apiKey()) {
      tracker.markUnhealthy(provider.id);
      results[provider.id] = "no-api-key";
      continue;
    }
    const healthy = await checkProviderHealth(provider);
    if (healthy) {
      tracker.markHealthy(provider.id);
      results[provider.id] = "healthy";
    } else {
      tracker.markUnhealthy(provider.id);
      results[provider.id] = "unhealthy";
    }
  }
  return results;
}

let healthCheckInterval = null;

function startHealthChecks(intervalMs = HEALTH_CHECK_INTERVAL) {
  if (healthCheckInterval) return;
  runHealthChecks();
  healthCheckInterval = setInterval(runHealthChecks, intervalMs);
}

function stopHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

async function queryOpenAICompatible(provider, messages, options = {}) {
  const key = provider.apiKey();
  const model = provider.model();
  const res = await axios.post(
    `${provider.baseUrl}/chat/completions`,
    {
      model,
      messages,
      max_tokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7,
    },
    {
      timeout: INFERENCE_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
    }
  );
  return res.data.choices[0].message.content;
}

async function queryHuggingFace(provider, messages, options = {}) {
  const key = provider.apiKey();
  const model = provider.model();
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

  const res = await axios.post(
    `${provider.baseUrl}/${model}`,
    {
      inputs: prompt,
      parameters: {
        max_new_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        return_full_text: false,
      },
    },
    {
      timeout: INFERENCE_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
    }
  );

  const data = res.data;
  if (Array.isArray(data) && data[0] && data[0].generated_text) {
    return data[0].generated_text.trim();
  }
  if (data.generated_text) {
    return data.generated_text.trim();
  }
  throw new Error("Unexpected HuggingFace response format");
}

async function queryGemini(provider, messages, options = {}) {
  const key = provider.apiKey();
  const model = provider.model();

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === "system");

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction.content }],
    };
  }

  const res = await axios.post(
    `${provider.baseUrl}/models/${model}:generateContent?key=${key}`,
    body,
    { timeout: INFERENCE_TIMEOUT }
  );

  const candidates = res.data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates in Gemini response");
  }
  const parts = candidates[0].content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("No parts in Gemini response");
  }
  return parts[0].text;
}

async function queryProvider(provider, messages, options = {}) {
  switch (provider.type) {
    case "openai-compatible":
      return await queryOpenAICompatible(provider, messages, options);
    case "huggingface":
      return await queryHuggingFace(provider, messages, options);
    case "gemini":
      return await queryGemini(provider, messages, options);
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

async function inference(messages, options = {}) {
  const available = tracker.getAvailableProviders();

  if (available.length === 0) {
    throw new Error(
      "No LLM providers available. Set at least one API key: GROQ_API_KEY, OPENROUTER_API_KEY, CEREBRAS_API_KEY, HF_API_KEY, TOGETHER_API_KEY, or GOOGLE_API_KEY"
    );
  }

  const errors = [];
  for (const provider of available) {
    try {
      const response = await queryProvider(provider, messages, options);
      tracker.markHealthy(provider.id);
      return {
        text: response,
        provider: provider.id,
        model: provider.model(),
      };
    } catch (err) {
      tracker.markUnhealthy(provider.id);
      errors.push({
        provider: provider.id,
        error: err.message,
      });
    }
  }

  throw new Error(
    `All providers failed. Errors: ${errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}`
  );
}

function getProviderStatus() {
  const result = {};
  for (const provider of PROVIDERS) {
    result[provider.id] = {
      configured: !!provider.apiKey(),
      health: tracker.healthStatus.get(provider.id),
      consecutiveFailures: tracker.consecutiveFailures.get(provider.id),
      lastCheck: tracker.lastCheck.get(provider.id),
      model: provider.model(),
    };
  }
  return result;
}

module.exports = {
  inference,
  getProviderStatus,
  runHealthChecks,
  startHealthChecks,
  stopHealthChecks,
  PROVIDERS,
};
