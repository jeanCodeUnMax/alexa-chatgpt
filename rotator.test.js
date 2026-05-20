const axios = require('axios');

jest.mock('axios');

const rotator = require('./rotator');

describe('rotator.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rotator.resetProviderStats();
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.TOGETHER_API_KEY;
    delete process.env.CEREBRAS_API_KEY;
    delete process.env.COHERE_API_KEY;
    delete process.env.HF_TOKEN;
    delete process.env.SAMBANOVA_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
  });

  describe('getAvailableProviders', () => {
    test('returns empty array when no API keys are set', () => {
      const available = rotator.getAvailableProviders();
      expect(available).toEqual([]);
    });

    test('returns providers with configured API keys', () => {
      process.env.GROQ_API_KEY = 'test-key';
      process.env.GEMINI_API_KEY = 'test-key';
      const available = rotator.getAvailableProviders();
      expect(available).toHaveLength(2);
      expect(available.map((p) => p.name)).toContain('Groq');
      expect(available.map((p) => p.name)).toContain('Google Gemini');
    });
  });

  describe('getProviderConfig', () => {
    test('returns provider config by name', () => {
      const config = rotator.getProviderConfig('Groq');
      expect(config).toBeDefined();
      expect(config.name).toBe('Groq');
      expect(config.baseURL).toBe('https://api.groq.com/openai/v1');
    });

    test('returns undefined for unknown provider', () => {
      const config = rotator.getProviderConfig('UnknownProvider');
      expect(config).toBeUndefined();
    });
  });

  describe('getAllProviderConfigs', () => {
    test('returns all provider configs', () => {
      const configs = rotator.getAllProviderConfigs();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0]).toHaveProperty('name');
      expect(configs[0]).toHaveProperty('type');
      expect(configs[0]).toHaveProperty('baseURL');
      expect(configs[0]).toHaveProperty('envKey');
    });
  });

  describe('makeInference', () => {
    test('throws error when no providers are configured', async () => {
      await expect(rotator.makeInference('test prompt')).rejects.toThrow(
        'No LLM API providers configured'
      );
    });

    test('returns response from first available provider', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      axios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Hello from Groq' } }] },
      });

      const result = await rotator.makeInference('test prompt');
      expect(result.response).toBe('Hello from Groq');
      expect(result.provider).toBe('Groq');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    test('tries next provider when first fails', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      process.env.GEMINI_API_KEY = 'test-key';
      axios.post
        .mockRejectedValueOnce(new Error('Groq timeout'))
        .mockRejectedValueOnce(new Error('Groq timeout'))
        .mockRejectedValueOnce(new Error('Groq timeout'))
        .mockResolvedValueOnce({
          data: {
            candidates: [
              { content: { parts: [{ text: 'Hello from Gemini' }] } },
            ],
          },
        });

      const result = await rotator.makeInference('test prompt');
      expect(result.response).toBe('Hello from Gemini');
      expect(result.provider).toBe('Google Gemini');
    });

    test('throws error when all providers fail', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      process.env.GEMINI_API_KEY = 'test-key';
      axios.post.mockRejectedValue(new Error('API Error'));

      await expect(rotator.makeInference('test prompt')).rejects.toThrow(
        'All providers failed'
      );
    });

    test('respects custom maxTokens option', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      axios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Response' } }] },
      });

      await rotator.makeInference('test prompt', { maxTokens: 500 });
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ max_tokens: 500 }),
        expect.any(Object)
      );
    });

    test('respects custom temperature option', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      axios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { content: 'Response' } }] },
      });

      await rotator.makeInference('test prompt', { temperature: 0.9 });
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ temperature: 0.9 }),
        expect.any(Object)
      );
    });
  });

  describe('getProviderHealthStatus', () => {
    test('returns health status for available providers', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      axios.mockResolvedValueOnce({ status: 200 });

      const results = await rotator.getProviderHealthStatus();
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('name', 'Groq');
      expect(results[0]).toHaveProperty('healthy');
      expect(results[0]).toHaveProperty('circuitBreakerState');
      expect(results[0]).toHaveProperty('score');
    });
  });

  describe('providerStats', () => {
    test('tracks success and failure statistics', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      axios.post
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Success' } }] },
        })
        .mockRejectedValueOnce(new Error('Failure'));

      await rotator.makeInference('success prompt');
      try {
        await rotator.makeInference('fail prompt');
      } catch {}

      const stats = rotator.getProviderStats();
      expect(stats['Groq']).toBeDefined();
      expect(stats['Groq'].totalRequests).toBe(2);
      expect(stats['Groq'].totalSuccesses).toBe(1);
      expect(stats['Groq'].totalFailures).toBe(1);
    });
  });

  describe('circuitBreakers', () => {
    test('opens circuit after consecutive failures', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      axios.post.mockRejectedValue(new Error('API Error'));

      for (let i = 0; i < 5; i++) {
        try {
          await rotator.makeInference(`test prompt ${i}`);
        } catch {}
      }

      const stats = rotator.getProviderStats();
      expect(stats['Groq'].circuitBreakerState).toBe('open');
    });
  });

  describe('pingProvider', () => {
    test('returns true for healthy provider', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      axios.mockResolvedValueOnce({ status: 200 });

      const groqProvider = rotator.getProviderConfig('Groq');
      const result = await rotator.pingProvider(groqProvider);
      expect(result).toBe(true);
    });

    test('returns false for unhealthy provider', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      axios.mockRejectedValueOnce(new Error('Network error'));

      const groqProvider = rotator.getProviderConfig('Groq');
      const result = await rotator.pingProvider(groqProvider);
      expect(result).toBe(false);
    });
  });
});
