const axios = require("axios");

const TTS_PROVIDERS = [
  {
    id: "freetts",
    name: "FreeTTS",
    baseUrl: "https://freetts.org/api/v1/tts",
    requiresKey: false,
    maxChars: 1000,
    async generate(text, voice = "en-US-JennyNeural") {
      const res = await axios.post(
        this.baseUrl,
        { text: text.substring(0, this.maxChars), voice },
        { timeout: 30000 }
      );
      if (res.data && res.data.file_id) {
        return `https://freetts.org/api/v1/download/${res.data.file_id}`;
      }
      throw new Error("No file_id in FreeTTS response");
    },
  },
  {
    id: "eidosspeech",
    name: "eidosSpeech",
    baseUrl: "https://eidosspeech.xyz/api/v1/tts",
    requiresKey: true,
    maxChars: 1000,
    async generate(text, voice = "en-US-JennyNeural") {
      const key = process.env.EIDOS_API_KEY;
      if (!key) {
        throw new Error("EIDOS_API_KEY not set");
      }
      const res = await axios.post(
        this.baseUrl,
        { text: text.substring(0, this.maxChars), voice },
        {
          timeout: 30000,
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": key,
          },
          responseType: "arraybuffer",
        }
      );
      return res.data;
    },
  },
];

async function textToSpeech(text, preferredProvider = null) {
  if (!text || text.trim().length === 0) {
    throw new Error("Empty text for TTS");
  }

  let providers = [...TTS_PROVIDERS];

  if (preferredProvider) {
    const idx = providers.findIndex((p) => p.id === preferredProvider);
    if (idx > 0) {
      const [p] = providers.splice(idx, 1);
      providers.unshift(p);
    }
  }

  for (const provider of providers) {
    if (provider.requiresKey) {
      const keyEnv = provider.id.toUpperCase() + "_API_KEY";
      if (!process.env[keyEnv]) {
        continue;
      }
    }

    try {
      const audioResult = await provider.generate(text);
      return {
        audio: audioResult,
        provider: provider.id,
        format: provider.id === "eidosspeech" ? "mp3-buffer" : "mp3-url",
      };
    } catch (err) {
      console.error(`TTS provider ${provider.id} failed: ${err.message}`);
    }
  }

  throw new Error("All TTS providers failed");
}

function getTTSSpeakable(text) {
  if (!text) return "";
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*`_~]/g, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .substring(0, 1000);
}

module.exports = {
  textToSpeech,
  getTTSSpeakable,
  TTS_PROVIDERS,
};
