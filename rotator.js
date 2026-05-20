const axios = require('axios');

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
          timeout: options.timeout || 5000,
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
          timeout: options.timeout || 5000,
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
          timeout: options.timeout || 5000,
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
          timeout: options.timeout || 5000,
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
          timeout: options.timeout || 5000,
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
          timeout: options.timeout || 5000,
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
          timeout: options.timeout || 5000,
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
          timeout: options.timeout || 5000,
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
          timeout: options.timeout || 5000,
        }
      );
      return res.data.choices[0].message.content;
    },
  },
];

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

module.exports = {
  API_PROVIDERS,
  getProviderConfig,
  getAllProviderConfigs,
  getAvailableProviders,
};
