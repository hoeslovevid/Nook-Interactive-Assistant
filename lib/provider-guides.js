(function (root, factory) {
  const guides = factory();
  if (typeof module === 'object' && module.exports) module.exports = guides;
  else root.NookProviderGuides = guides;
})(typeof window === 'undefined' ? globalThis : window, () => ({
  chatgpt: { url: 'https://platform.openai.com/api-keys', text: 'Create an OpenAI API key. API access and billing are separate from your ChatGPT subscription.' },
  gemini: { url: 'https://aistudio.google.com/apikey', text: 'Create a Gemini API key in Google AI Studio.' },
  claude: { url: 'https://platform.claude.com/settings/keys', text: 'Create an Anthropic API key for Claude. Claude app subscriptions do not provide API credits.' },
  openrouter: { url: 'https://openrouter.ai/settings/keys', text: 'One OpenRouter key gives you access to models from multiple providers.' },
  deepseek: { url: 'https://platform.deepseek.com/api_keys', text: 'Create a key in your DeepSeek platform account.' },
  mistral: { url: 'https://console.mistral.ai/api-keys', text: 'Create a Mistral key in La Plateforme.' },
  groq: { url: 'https://console.groq.com/keys', text: 'Create a Groq API key for supported open models.' },
  xai: { url: 'https://console.x.ai', text: 'Create a key in the xAI console to connect Grok.' },
  ollama: { text: 'No API key needed. Start Ollama, download a model, then check the connection to see installed models.' },
  lmstudio: { text: 'No API key needed. Load a model in LM Studio and start its local API server.' },
  custom: { text: 'Use an OpenAI compatible chat/completions address. Cloud servers require HTTPS; API keys are optional depending on your server.' },
}));
