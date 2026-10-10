# Nook

A Windows desktop companion for coding agents, with a compact notch and multi-provider AI chat.

## Install on Windows

Download the latest **Nook-Setup-…-x64.exe** from [GitHub Releases](https://github.com/hoeslovevid/Nook-Interactive-Assistant/releases/latest). Run the setup wizard to choose an install location and create shortcuts. Supports Windows 10 and 11 on 64-bit Intel/AMD PCs. No Node.js installation is needed.

Nook is currently unsigned, so Windows may show a SmartScreen or unknown-publisher warning. Download only from this repository's releases. Verify a download against the included SHA256SUMS.txt with `Get-FileHash` if needed.

To update, quit Nook through its tray menu and run the new installer. Settings and provider keys are retained. Uninstall from Windows Settings → Apps; saved settings are kept.

## Run from source

Install dependencies with npm install, then run npm start. Run npm test for the test suite.

## Build and publish installers

Use Node.js 22 or newer, run `npm ci`, then `npm run dist` on Windows. The installer appears in `dist/`. `npm run pack` creates the unpacked app for testing. Run `npm run smoke:packaged` on a Windows desktop with Nook closed to verify packaged pages, native media, and agent hooks with isolated app data. Runtime files are explicitly included; tests, previews, and development dependencies are excluded. Native scripts and agent hooks are kept outside an ASAR archive so Windows can execute them. Installed agent hooks use Nook's bundled runtime.

For a release, update the version in package.json and package-lock.json, update `.github/RELEASE_NOTES.md`, commit, and push a matching tag such as `v0.1.0`. The Windows release workflow runs tests, builds the installer, and publishes it with SHA-256 checksums. A manual workflow run produces a downloadable build artifact without publishing a release. Releases currently use unsigned executables; code signing is not configured.

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

## Task animations and settings

Reading, editing, and terminal tools now drive distinct looping companion animations with book, keyboard, and terminal cues. The 120-pixel desktop pet shares the notch's task state, including chat activity. Reduced motion keeps the expressions and task cues without movement.

Models & connections uses expandable cards, cloud/local/integration filters, saved-key filtering, search, and a selectable list of discovered models. Shortcuts display keycaps, record on click, reject duplicate or unsafe typing combinations, and restore previous shortcuts if Windows cannot register a change. The settings and notch use rounded accent scrollbars with hover and drag feedback.

## Wardrobe, voice, music, and pocket companion

Open **Companion & devices** to choose an original outfit, enable seasonal changes, configure dictation, and turn on Windows media controls. Outfits apply to the notch and desktop pet. Clicking the pet makes it react; repeated pokes briefly annoy it or make it dizzy before it recovers. Music makes it dance when no agent needs attention.

Music uses the active Windows media session. Spotify, browser playback, and other compatible players expose title, artist, artwork, playback controls, and seeking according to their Windows integration. Enable music controls first; controls appear in the notch activity card when a session is available. Unsupported controls are disabled. No Spotify account tokens are required.

In chat, **Dictate** starts the microphone only after you click. Stop to transcribe and review the draft; Esc cancels. Recordings stop after 45 seconds. Windows mode uses an installed offline Windows speech recognizer; choose a speech language in Windows if none is available. OpenAI mode sends the stopped recording to the OpenAI transcription API using your encrypted OpenAI API key and may incur API charges. Temporary local WAV files are deleted after transcription. Dictation never sends a chat message automatically.

**Window context** lists open windows. Choose one to capture a single screenshot, review it in chat, and send a question to a model with image support. Remove the screenshot to cancel. Nook does not continuously watch or capture your windows. Screenshots are held in memory and shared only when you send the message.

For the **phone companion**, click Enable phone access. Open the displayed address on a phone on the same trusted local network and enter the six-digit pairing code. The code expires after 10 minutes; paired browser sessions expire after 24 hours. You can view sessions, recent activity, approve or deny requests, and answer agent questions. Revoke & new code invalidates all paired devices. Disable closes the listener. Windows may require private-network firewall access; guest Wi-Fi or client isolation can prevent access. No firewall or router rules are modified by Nook.

The phone companion is a local browser interface, not a native iOS app: internet relaying, Lock Screen widgets, background push, and Live Activities are not included. Keep Nook running and the phone page open to receive updates. Local access uses HTTP, so use trusted Wi-Fi. API keys, chat messages, and attachments are excluded from the phone API. The service is off at every launch until you enable it.
