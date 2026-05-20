# Alexa Skill with ChatGPT - API Rotator System

Alexa GPT skill with a multi-provider LLM rotator system. Automatically fails over between free API providers with health checking and TTS output.

## How it works

Every inference request goes through the rotator which pings available providers, selects a healthy one, and falls over automatically if a provider is down. This ensures Alexia GPT is never silent.

Responses are converted to speech via TTS.

## Architecture

- **rotator.js** - Multi-provider LLM router with health checks and automatic failover
- **tts.js** - Text-to-speech conversion with multiple free TTS providers
- **index.js** - Alexa Skill handlers using the rotator

## Supported LLM Providers

| Provider | Speed | Models | Free Tier |
|----------|-------|--------|-----------|
| Groq | Fastest | Llama 3.3 70B, Mixtral, Gemma | 14,400 req/day |
| OpenRouter | Variable | 11+ free models | ~200 req/day |
| Cerebras | Very Fast | Llama 3.1 70B | 1M tokens/day |
| HuggingFace | Moderate | Mistral, Llama, Qwen | 1,000 req/day |
| Together AI | Fast | Llama 3.3 70B | Free tier |
| Google Gemini | Fast | Gemini 2.0 Flash | 1,500 req/day |

## Supported TTS Providers

| Provider | Max Chars | Key Required |
|----------|-----------|-------------|
| FreeTTS | 1,000 | No |
| eidosSpeech | 1,000 | Yes |

## Configuration

Set environment variables for each provider you want to use. At least one is required:

```
GROQ_API_KEY=your-key
OPENROUTER_API_KEY=your-key
CEREBRAS_API_KEY=your-key
HF_API_KEY=your-key
TOGETHER_API_KEY=your-key
GOOGLE_API_KEY=your-key
EIDOS_API_KEY=your-key
```

## Running the example

```
ask init
ask deploy
```

This deploys your Skill to your Amazon Developer account and makes it available for use with Alexa.
