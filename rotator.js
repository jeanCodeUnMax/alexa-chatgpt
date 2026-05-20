const https = require("https");
const http = require("http");
const url = require("url");

const API_PROVIDERS = [
  {
    name: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    pingUrl: "https://api.groq.com/openai/v1/models",
    model: "llama-3.3-70b-versatile",
    maxTokens: 200,
    timeout: 5000,
    retries: 2,
    envVar: "GROQ_API_KEY",
    buildRequest(prompt) {
      return {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env[this.envVar] || ""}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "user", content: prompt },
          ],
          max_tokens: this.maxTokens,
          temperature: 0.7,
        }),
      };
    },
    parseResponse(data) {
      const parsed = JSON.parse(data);
      return parsed.choices[0].message.content.trim();
    },
  },
  {
    name: "openrouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    pingUrl: "https://openrouter.ai/api/v1/models",
    model: "meta-llama/llama-3.3-70b-instruct",
    maxTokens: 200,
    timeout: 5000,
    retries: 2,
    envVar: "OPENROUTER_API_KEY",
    buildRequest(prompt) {
      return {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/alexa-gpt-rotator",
          "X-Title": "Alexa GPT Rotator",
          Authorization: `Bearer ${process.env[this.envVar] || ""}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: this.maxTokens,
          temperature: 0.7,
        }),
      };
    },
    parseResponse(data) {
      const parsed = JSON.parse(data);
      return parsed.choices[0].message.content.trim();
    },
  },
  {
    name: "cerebras",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    pingUrl: "https://api.cerebras.ai/v1/models",
    model: "llama3.1-70b",
    maxTokens: 200,
    timeout: 5000,
    retries: 2,
    envVar: "CEREBRAS_API_KEY",
    buildRequest(prompt) {
      return {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env[this.envVar] || ""}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: this.maxTokens,
          temperature: 0.7,
        }),
      };
    },
    parseResponse(data) {
      const parsed = JSON.parse(data);
      return parsed.choices[0].message.content.trim();
    },
  },
  {
    name: "huggingface",
    endpoint: "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct/v1/chat/completions",
    pingUrl: "https://api-inference.huggingface.co/status/meta-llama/Meta-Llama-3-8B-Instruct",
    model: "meta-llama/Meta-Llama-3-8B-Instruct",
    maxTokens: 200,
    timeout: 5000,
    retries: 2,
    envVar: "HUGGINGFACE_API_KEY",
    buildRequest(prompt) {
      return {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env[this.envVar] || ""}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: this.maxTokens,
          temperature: 0.7,
        }),
      };
    },
    parseResponse(data) {
      const parsed = JSON.parse(data);
      return parsed.choices[0].message.content.trim();
    },
  },
  {
    name: "together",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    pingUrl: "https://api.together.xyz/v1/models",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    maxTokens: 200,
    timeout: 5000,
    retries: 2,
    envVar: "TOGETHER_API_KEY",
    buildRequest(prompt) {
      return {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env[this.envVar] || ""}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: this.maxTokens,
          temperature: 0.7,
        }),
      };
    },
    parseResponse(data) {
      const parsed = JSON.parse(data);
      return parsed.choices[0].message.content.trim();
    },
  },
  {
    name: "gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    pingUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    model: "gemini-1.5-flash",
    maxTokens: 200,
    timeout: 5000,
    retries: 2,
    envVar: "GOOGLE_API_KEY",
    buildRequest(prompt) {
      return {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: this.maxTokens,
            temperature: 0.7,
          },
        }),
      };
    },
    parseResponse(data) {
      const parsed = JSON.parse(data);
      return parsed.candidates[0].content.parts[0].text.trim();
    },
    getFullUrl() {
      return `${this.endpoint}?key=${process.env[this.envVar] || ""}`;
    },
  },
];

const API_SCORES = {};

function initScores() {
  for (const api of API_PROVIDERS) {
    if (!API_SCORES[api.name]) {
      API_SCORES[api.name] = {
        successes: 0,
        failures: 0,
        totalResponseTime: 0,
        lastPingAt: 0,
        isHealthy: true,
      };
    }
  }
}

initScores();

function getSortedProviders() {
  return [...API_PROVIDERS].sort((a, b) => {
    const scoreA = API_SCORES[a.name];
    const scoreB = API_SCORES[b.name];

    if (!scoreA || !scoreB) return 0;

    const totalA = scoreA.successes + scoreA.failures;
    const totalB = scoreB.successes + scoreB.failures;

    const successRateA = totalA > 0 ? scoreA.successes / totalA : 1;
    const successRateB = totalB > 0 ? scoreB.successes / totalB : 1;

    const avgTimeA =
      scoreA.successes > 0 ? scoreA.totalResponseTime / scoreA.successes : 0;
    const avgTimeB =
      scoreB.successes > 0 ? scoreB.totalResponseTime / scoreB.successes : 0;

    if (Math.abs(successRateA - successRateB) > 0.1) {
      return successRateB - successRateA;
    }

    return avgTimeA - avgTimeB;
  });
}

function makeHttpRequest(fullUrl, requestOptions, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(fullUrl);
    const isHttps = parsedUrl.protocol === "https:";
    const lib = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: requestOptions.method || "GET",
      headers: requestOptions.headers || {},
      timeout: timeoutMs,
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (requestOptions.body) {
      req.write(requestOptions.body);
    }

    req.end();
  });
}

async function pingApi(provider) {
  const now = Date.now();
  const score = API_SCORES[provider.name];

  if (score && now - score.lastPingAt < 30000) {
    return score.isHealthy;
  }

  try {
    const startTime = Date.now();
    let pingUrl = provider.pingUrl;
    let pingOptions = { method: "GET", headers: {} };

    if (provider.name === "gemini") {
      const key = process.env[provider.envVar] || "";
      pingUrl = `${provider.pingUrl}?key=${key}`;
    } else if (provider.envVar && process.env[provider.envVar]) {
      pingOptions.headers["Authorization"] =
        `Bearer ${process.env[provider.envVar]}`;
    }

    const response = await makeHttpRequest(pingUrl, pingOptions, 3000);
    const elapsed = Date.now() - startTime;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (score) {
        score.lastPingAt = now;
        score.isHealthy = true;
      }
      return true;
    } else {
      if (score) {
        score.lastPingAt = now;
        score.isHealthy = false;
        score.failures++;
      }
      return false;
    }
  } catch (err) {
    if (score) {
      score.lastPingAt = now;
      score.isHealthy = false;
      score.failures++;
    }
    return false;
  }
}

async function callApi(provider, prompt) {
  const score = API_SCORES[provider.name];
  let lastError = null;

  for (let attempt = 0; attempt <= provider.retries; attempt++) {
    try {
      const startTime = Date.now();
      const request = provider.buildRequest(prompt);

      let fullUrl =
        typeof provider.getFullUrl === "function"
          ? provider.getFullUrl()
          : provider.endpoint;

      const response = await makeHttpRequest(
        fullUrl,
        request,
        provider.timeout,
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        const elapsed = Date.now() - startTime;
        const text = provider.parseResponse(response.data);

        if (score) {
          score.successes++;
          score.totalResponseTime += elapsed;
          score.isHealthy = true;
        }

        return text;
      } else {
        lastError = new Error(
          `HTTP ${response.statusCode}: ${response.data.slice(0, 200)}`,
        );
        if (score) {
          score.failures++;
        }
      }
    } catch (err) {
      lastError = err;
      if (score) {
        score.failures++;
      }
    }
  }

  throw lastError || new Error(`Failed to call ${provider.name}`);
}

async function makeInference(prompt, maxProvidersToTry = null) {
  const providers = getSortedProviders();
  const toTry = maxProvidersToTry ? providers.slice(0, maxProvidersToTry) : providers;

  let errors = [];

  for (const provider of toTry) {
    const isHealthy = await pingApi(provider);
    if (!isHealthy) {
      continue;
    }

    try {
      const result = await callApi(provider, prompt);
      return result;
    } catch (err) {
      errors.push({ provider: provider.name, error: err.message });
    }
  }

  for (const provider of toTry) {
    const isHealthy = API_SCORES[provider.name]?.isHealthy;
    if (isHealthy) continue;

    try {
      const result = await callApi(provider, prompt);
      return result;
    } catch (err) {
      errors.push({ provider: provider.name, error: err.message });
    }
  }

  const errorSummary = errors
    .map((e) => `${e.provider}: ${e.error}`)
    .join("; ");
  throw new Error(`All APIs failed. Errors: ${errorSummary}`);
}

function getScores() {
  return { ...API_SCORES };
}

function resetScores() {
  for (const api of API_PROVIDERS) {
    API_SCORES[api.name] = {
      successes: 0,
      failures: 0,
      totalResponseTime: 0,
      lastPingAt: 0,
      isHealthy: true,
    };
  }
}

module.exports = {
  makeInference,
  pingApi,
  getScores,
  resetScores,
  API_PROVIDERS,
};
