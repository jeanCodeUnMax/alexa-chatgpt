const https = require("https");

const API_PROVIDERS = [
  {
    name: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    apiKeyEnv: "GROQ_API_KEY",
    format: "openai",
    rateLimit: { rpm: 30, tpm: 6000, rpd: 1000 },
    timeoutMs: 5000,
    requestFn: (prompt, apiKey) => {
      const body = JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        max_tokens: 256,
        temperature: 0.7,
      });
      return { body, headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } };
    },
    parseFn: (data) => data.choices[0].message.content,
  },
  {
    name: "openrouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "openrouter/free",
    apiKeyEnv: "OPENROUTER_API_KEY",
    format: "openai",
    rateLimit: { rpm: 20, rpd: 50 },
    timeoutMs: 10000,
    requestFn: (prompt, apiKey) => {
      const body = JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        max_tokens: 256,
      });
      return { body, headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } };
    },
    parseFn: (data) => data.choices[0].message.content,
  },
  {
    name: "cerebras",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    model: "llama3.1-8b",
    apiKeyEnv: "CEREBRAS_API_KEY",
    format: "openai",
    rateLimit: { rpm: 30, tpm: 60000, rpd: 14400 },
    timeoutMs: 5000,
    requestFn: (prompt, apiKey) => {
      const body = JSON.stringify({
        model: "llama3.1-8b",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 256,
      });
      return { body, headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } };
    },
    parseFn: (data) => data.choices[0].message.content,
  },
  {
    name: "huggingface",
    endpoint: "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
    model: "mistralai/Mistral-7B-Instruct-v0.3",
    apiKeyEnv: "HUGGINGFACE_API_KEY",
    format: "huggingface",
    rateLimit: { rph: 60 },
    timeoutMs: 30000,
    requestFn: (prompt, apiKey) => {
      const body = JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 256, return_full_text: false },
      });
      return { body, headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } };
    },
    parseFn: (data) => {
      if (Array.isArray(data)) return data[0].generated_text;
      if (data.generated_text) return data.generated_text;
      if (data.error) throw new Error(data.error);
      return JSON.stringify(data);
    },
  },
  {
    name: "google-gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    model: "gemini-2.0-flash",
    apiKeyEnv: "GOOGLE_API_KEY",
    format: "google",
    rateLimit: { rpm: 15, tpm: 1000000, rpd: 1500 },
    timeoutMs: 10000,
    requestFn: (prompt, apiKey) => {
      const body = JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: { maxOutputTokens: 256, temperature: 0.7 },
      });
      return { body, headers: { "Content-Type": "application/json" }, apiKey };
    },
    parseFn: (data) => {
      if (data.candidates && data.candidates[0]) {
        return data.candidates[0].content.parts[0].text;
      }
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return JSON.stringify(data);
    },
  },
  {
    name: "cohere",
    endpoint: "https://api.cohere.ai/v2/chat",
    model: "command-r7b",
    apiKeyEnv: "COHERE_API_KEY",
    format: "cohere",
    rateLimit: { rpm: 20, monthly: 1000 },
    timeoutMs: 10000,
    requestFn: (prompt, apiKey) => {
      const body = JSON.stringify({
        model: "command-r7b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 256,
      });
      return { body, headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } };
    },
    parseFn: (data) => {
      if (data.message && data.message.content) {
        if (typeof data.message.content === "string") return data.message.content;
        if (Array.isArray(data.message.content)) {
          return data.message.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");
        }
      }
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return JSON.stringify(data);
    },
  },
];

const providerScores = {};
API_PROVIDERS.forEach((p) => {
  providerScores[p.name] = { success: 0, failure: 0, avgLatency: 0, lastChecked: null };
});

function getApiKey(provider) {
  const key = process.env[provider.apiKeyEnv];
  if (!key) return null;
  return key;
}

function makeHttpRequest(url, options) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || "POST",
        headers: options.headers,
        timeout: options.timeout || 5000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            } else {
              resolve(data);
            }
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function pingProvider(provider) {
  const start = Date.now();
  const apiKey = getApiKey(provider);
  if (!apiKey) return false;

  try {
    if (provider.format === "google") {
      const url = `${provider.endpoint}?key=${apiKey}`;
      const { requestFn } = provider;
      const { body } = requestFn("Ping", apiKey);
      await makeHttpRequest(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, timeout: provider.timeoutMs });
    } else {
      const { requestFn } = provider;
      const { body, headers } = requestFn("Ping", apiKey);
      await makeHttpRequest(provider.endpoint, { method: "POST", headers, body, timeout: provider.timeoutMs });
    }
    const latency = Date.now() - start;
    providerScores[provider.name].success++;
    providerScores[provider.name].avgLatency =
      providerScores[provider.name].avgLatency * 0.8 + latency * 0.2;
    providerScores[provider.name].lastChecked = new Date().toISOString();
    return true;
  } catch (e) {
    providerScores[provider.name].failure++;
    providerScores[provider.name].lastChecked = new Date().toISOString();
    return false;
  }
}

function getSortedProviders() {
  const available = API_PROVIDERS.filter((p) => getApiKey(p));

  available.sort((a, b) => {
    const scoreA = providerScores[a.name];
    const scoreB = providerScores[b.name];

    const totalA = scoreA.success + scoreA.failure;
    const totalB = scoreB.success + scoreB.failure;

    const rateA = totalA > 0 ? scoreA.success / totalA : 0.5;
    const rateB = totalB > 0 ? scoreB.success / totalB : 0.5;

    if (totalA === 0 && totalB === 0) return 0;
    if (totalA === 0) return 1;
    if (totalB === 0) return -1;

    if (Math.abs(rateA - rateB) > 0.1) return rateB - rateA;

    return scoreA.avgLatency - scoreB.avgLatency;
  });

  return available;
}

async function makeInference(prompt) {
  const providers = getSortedProviders();

  if (providers.length === 0) {
    throw new Error("No API keys configured. Set at least one of: GROQ_API_KEY, OPENROUTER_API_KEY, CEREBRAS_API_KEY, HUGGINGFACE_API_KEY, GOOGLE_API_KEY, COHERE_API_KEY");
  }

  const errors = [];

  for (const provider of providers) {
    try {
      const apiKey = getApiKey(provider);
      let url = provider.endpoint;
      const { requestFn, parseFn } = provider;
      const { body, headers } = requestFn(prompt, apiKey);

      let result;
      if (provider.format === "google") {
        url = `${provider.endpoint}?key=${apiKey}`;
        result = await makeHttpRequest(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, timeout: provider.timeoutMs });
      } else {
        result = await makeHttpRequest(provider.endpoint, { method: "POST", headers, body, timeout: provider.timeoutMs });
      }

      const response = parseFn(result);
      providerScores[provider.name].success++;
      const latency = Date.now();
      providerScores[provider.name].avgLatency =
        providerScores[provider.name].avgLatency * 0.8 + latency * 0.2;
      return { response, provider: provider.name };
    } catch (e) {
      providerScores[provider.name].failure++;
      errors.push(`${provider.name}: ${e.message}`);
    }
  }

  throw new Error(`All providers failed: ${errors.join("; ")}`);
}

async function healthCheck() {
  const results = [];
  for (const provider of API_PROVIDERS) {
    const apiKey = getApiKey(provider);
    if (!apiKey) {
      results.push({ name: provider.name, status: "no_key", configured: false });
      continue;
    }
    const start = Date.now();
    try {
      const ok = await pingProvider(provider);
      results.push({
        name: provider.name,
        status: ok ? "ok" : "error",
        configured: true,
        latency: Date.now() - start,
        score: providerScores[provider.name],
      });
    } catch (e) {
      results.push({ name: provider.name, status: "error", configured: true, error: e.message });
    }
  }
  return results;
}

module.exports = { API_PROVIDERS, makeInference, healthCheck, getSortedProviders, providerScores };
