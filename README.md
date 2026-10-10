# Nook

A Windows desktop companion for coding agents, with a compact notch and multi-provider AI chat.

## Run

Install dependencies with npm install, then run npm start. Run npm test for the test suite.

## Connect models

Open Models & connections in settings, find a provider, save your API key, and choose a model ID. Find available models loads suggestions from the provider; model IDs can also be entered manually. Switch providers from the notch chat selector.

Supported connections: OpenAI, Gemini, Claude, OpenRouter, DeepSeek, Mistral, Groq, Grok, Ollama, LM Studio, and a custom OpenAI-compatible endpoint. OpenRouter provides access to additional model families with one key. API access requires the provider's API credentials; chat website subscriptions do not configure API access.

Ollama and LM Studio connect to a running server on this PC without a key. Custom endpoints accept HTTPS remote servers or loopback HTTP, with an optional encrypted API key. Enter the full chat/completions endpoint URL.

## Appearance

Appearance offers live color and corner controls. Reset look applies the new slate and periwinkle palette. Existing saved colors are preserved. Keyboard focus and reduced-motion settings are supported.

The interface takes inspiration from [Coucou](https://github.com/Louis-CFM/coucou), with Nook's own character and styling.

## Companion & motion

Nook has eight expressive poses, shared across the notch, settings preview, and desktop companion. Preview every pose in Appearance. It reacts to active sessions, approvals, chat requests, completions, and dropped files.

The notch expands with a spring transition and coordinated content reveal. Buttons respond to presses; selected sessions and attached files get subtle feedback. Drop a file from Explorer onto the notch to attach it to chat. The companion notices the file, catches it, and celebrates once attached.

Windows reduced-motion preferences disable spring resizing, character hops, breathing, and interface transitions. Character expressions still communicate status. Artwork and animation are original to Nook.
