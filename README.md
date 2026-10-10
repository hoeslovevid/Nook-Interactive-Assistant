<img src="assets/icon.svg" width="64" height="64" alt="Nook logo" />

# Nook

A Windows desktop companion for coding agents, with a compact notch and multi-provider AI chat.

## See Nook in motion

Real app recordings with local sample data—no API key needed for the walkthrough.

![Animated Nook notch showing reading, editing, terminal work, completion, and an approval](assets/previews/notch.gif)

![Animated app walkthrough and companion wardrobe](assets/previews/app-tour.gif)

Prefer still images? See the [welcome screen](assets/previews/welcome.png), [model connections](assets/previews/models.png), and [phone session details](assets/previews/phone-details.png).

## Install on Windows

Download the latest **Nook-Setup-…-x64.exe** from [GitHub Releases](https://github.com/hoeslovevid/Nook-Interactive-Assistant/releases/latest). Run the setup wizard to choose an install location and create shortcuts. Supports Windows 10 and 11 on 64-bit Intel/AMD PCs. No Node.js installation is needed.

Nook is currently unsigned, so Windows may show a SmartScreen or unknown-publisher warning. Download only from this repository's releases. Verify a download against the included SHA256SUMS.txt with `Get-FileHash` if needed.

This repository is private: downloads and updates require a GitHub account with repository access. From version 0.2.1, Nook checks stable GitHub releases at startup and every six hours. Open **Updates** in settings, or choose **Check for updates** from the tray. Download the update, then choose **Restart and install** when ready. Downloads are verified against SHA-512 release metadata; settings and provider keys are retained. First save a fine-grained GitHub token in **Updates → Private repository access**, restricted to this repository with **Contents: read-only** permission. Windows encrypts it locally; no token is bundled with the app or shared with phones. Without a token, Nook asks for access instead of making failing requests. Automatic checks can be turned off. Nook never downloads or restarts silently.

Versions 0.1.0 and 0.2.0 need a one-time manual upgrade using the latest installer. Manual installation remains available for any version: quit Nook through its tray menu, then run the newer installer. Uninstall from Windows Settings → Apps; saved settings are kept.

## Run from source

Install dependencies with npm install, then run npm start. Run npm test for the test suite.

## Build and publish installers

The Nook logo is an arch and dot in periwinkle on slate. Editable vector sources live in `assets/logo.svg`, `assets/icon.svg`, and `assets/tray.svg`. Run `npm run brand` on Windows to regenerate the application and installer icons, high-DPI tray images, phone home-screen icon, and installer sidebar from those sources. The animated companion remains the activity character.

Use Node.js 22 or newer, run `npm ci`, then `npm run dist` on Windows. The installer appears in `dist/`. `npm run pack` creates the unpacked app for testing. Run `npm run smoke:packaged` on a Windows desktop with Nook closed to verify packaged pages, native media, and agent hooks with isolated app data. Runtime files are explicitly included; tests, previews, and development dependencies are excluded. Native scripts and agent hooks are kept outside an ASAR archive so Windows can execute them. Installed agent hooks use Nook's bundled runtime.

For a release, update the version in package.json and package-lock.json, update `.github/RELEASE_NOTES.md`, commit, and push a matching tag such as `v0.2.0`. The Windows release workflow runs tests, builds and verifies the installer and update metadata, then publishes the installer, block map, `latest.yml`, and SHA-256 checksums together. A manual workflow run produces a downloadable build artifact without publishing a release. Releases currently use unsigned executables; code signing is not configured. The updater uses this private GitHub repository over HTTPS using a token saved on the user's PC and SHA-512 artifact checksums; Authenticode verification is disabled until signed installers are available.

To refresh the animated previews, run `npx electron scripts/capture-previews.cjs`, then `python scripts/encode-previews.py` with Pillow installed. The recorder uses isolated sample data and writes frames under `dist/`; only the resulting GIFs are committed and they are excluded from the installer.

## Connect models

Open Models & connections in settings, find a provider, save your API key, and choose a model ID. Find available models loads suggestions from the provider; model IDs can also be entered manually. Switch providers from the notch chat selector.

Supported connections: OpenAI, Gemini, Claude, OpenRouter, DeepSeek, Mistral, Groq, Grok, Ollama, LM Studio, and a custom OpenAI-compatible endpoint. OpenRouter provides access to additional model families with one key. API access requires the provider's API credentials; chat website subscriptions do not configure API access.

Ollama and LM Studio connect to a running server on this PC without a key. Custom endpoints accept HTTPS remote servers or loopback HTTP, with an optional encrypted API key. Enter the full chat/completions endpoint URL.

## Appearance

Appearance offers live color and corner controls. Reset look applies the new slate and periwinkle palette. Existing saved colors are preserved. Keyboard focus and reduced-motion settings are supported.

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

The included phone companion works in a local browser. Keep its page open to receive updates. Local access uses HTTP, so use trusted Wi-Fi. API keys, chat messages, and attachments are excluded from the phone API. Its listener uses port 45821 and stays off until enabled; optionally select **Start phone access with Nook** to keep the address stable across restarts. The separate [native iPhone source](ios/README.md) adds Keychain pairing, device authentication, widgets, and Live Activity support; Apple signing and the optional [push relay](push-relay/README.md) require owner configuration.

## Quick interactions and guided setup

On first launch, a seven-step walkthrough introduces sessions, diffs, sample approvals and questions, offline chat, and service cards. Replay it with **Agents → Play demo**. Sample sessions are isolated from real state and do not write agent hooks, keys, or history. Ending the walkthrough restores the real view; a real approval interrupts it immediately.

Right-click the notch pet or desktop pet for chat, wardrobe, seasonal outfits, mute, and companion settings. Double-click the desktop pet to send it home, or drop it back at the top-center of a screen. Hold the pointer over the pet for a friendly heart reaction. Sleeping and hidden companions render less frequently. Agent colors in settings now tint the companion as well as session pills; a pending approval takes priority over the selected session.

Drag the desktop pet onto a visible window and release to attach a single screenshot to chat. Review or remove it before sending. The pet stays where you place it; release onto an empty desktop to move it without attaching context. Minimized, unavailable, and Nook windows are excluded. Multi-monitor coordinates are converted for Windows display scaling.

Music controls now expose **Shuffle** and **Repeat** when the active player supports them. Repeat cycles off → all → one; unsupported controls remain disabled.

## Phone details and follow-up drafts

In **Companion & devices**, enable **Share session details** to let paired phones inspect the latest 30 steps, bounded code diffs, and completed answers. This intentionally shares code and command context over your trusted local network; it is off by default. Session details are held in memory, not saved as a new history database. The phone also shows connected service summaries and has a focus filter for approvals and questions.

Enable **Receive follow-up drafts** separately to prepare the next instruction from a phone session. Drafts appear in the PC's **Phone draft inbox**, with **Copy draft**, **Copy & open terminal**, and **Dismiss**. Review and paste the instruction into the agent yourself; Nook does not inject keystrokes, resume an agent, or execute these drafts. The inbox holds up to eight drafts and clears when Nook quits. Disabling sharing takes effect on the phone's next refresh; revoking devices invalidates their tokens immediately.

## Workspace, history, and alerts

**Workspace & alerts** adds notification controls, quiet hours that can cross midnight, and per-agent muting. Windows notifications open the waiting request, completed session, or GitHub details. Quiet hours also silence the notch's sounds. Live approvals remain visible regardless of notification settings. The desktop pet docks at the notch when an approval arrives and returns to its saved spot only when the full queue is resolved; disconnected requests are removed without deciding for the agent. Disable pet travel independently.

The wardrobe includes a crown, bow, and raincoat alongside the existing outfits. Head movement carries glasses and hats, scarf tails settle with spring motion, and outfit changes fade. Reduced motion keeps outfits stable.

Enable **Keep completed sessions and decisions** to record an encrypted local archive. Search by text, agent, and project, inspect completed answers and diffs, or delete entries. Retention choices are 7, 30, and 90 days, with at most 300 entries and an 8 MB plaintext capacity before encryption. Recording is off by default; turning it off leaves existing history until it expires or you clear it. No chat attachments or provider keys are serialized. Shared code and command text can still contain sensitive information; enable history and phone detail sharing only for projects you intend to retain or share. The native phone can search the archive only when session detail sharing is enabled.

GitHub, Vercel, and n8n pills open detailed service views. Optionally enable service actions to retry failed GitHub jobs, redeploy Vercel as a preview, or activate/pause n8n workflows. Your service token needs the relevant write permissions. Actions are offered for recent fetched items, expire after five minutes, and can be used once. Every write requires a confirmation on the PC, including requests from a paired phone. A cancelled action never sends a write request. No money or email actions are offered.

Weekly recap can now be saved as a 1080 × 1920 PNG through the Save PNG button, with the same project-name privacy setting as the SVG export.

## Native iPhone source and push relay

The [iPhone app](ios/README.md) includes SwiftUI sessions, questions, diffs, drafts, service details, local history search, authenticated approvals, notification actions, widgets, Siri shortcuts, and a Live Activity/Dynamic Island. Pairing is stored in iPhone Keychain; widget snapshots contain only status and their timestamp. Authentication happens before Allow, and the PC rechecks the exact pending request. Notification actions open the app to complete that flow.

The optional [self-hosted APNs relay](push-relay/README.md) updates an activity started from the phone and delivers generic background alerts. The PC encrypts relay and device tokens. Push payloads contain agent status and request IDs, not commands, code, questions, or provider keys. Details and actions still require the trusted local network; no internet approval tunnel is included. Revoke native devices in desktop settings, disable phone access, or rotate pairing to stop native delivery.

Apple signing, provisioning, real-device testing, and relay deployment are not configured in this Windows workspace. The native source includes XcodeGen configuration and a macOS simulator-build workflow for verification on Apple tooling before distribution.
