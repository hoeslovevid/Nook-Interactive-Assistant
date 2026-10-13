<img src="assets/icon.svg" width="64" height="64" alt="Nook logo" />

# Nook

A Windows desktop companion for coding agents, with a compact notch and multi-provider AI chat.

## Connection studio and modern island

Open **Health & studio** for the latest controls. The default modern island uses a black outer shell, a minimal toolbar, rounded activity cards, a companion beside chat, pill-shaped approvals, and quieter chat options, inspired by [Coucou](https://github.com/Louis-CFM/coucou). Nook keeps its own original pet, artwork, and branding. **Classic Nook** remains selectable; dark and light themes both work.

![Modern Nook chat](assets/previews/island-chat.png)

See the [light theme](assets/previews/island-chat-light.png), [hover widgets](assets/previews/island-widgets.png), and [connection studio](assets/previews/connection-studio.png). These previews use sample conversations and synthetic audio.

- **Connection health:** choose a microphone and test its live level for up to 15 seconds. Tests stop when you leave the page or hide the app; no audio is saved or sent. Check installed speech languages and voices, preview speech output, inspect key-storage status, or send a small AI chat test. That test sends only “Reply with OK,” may incur API charges, and excludes chat history. A successful model-directory check alone does not prove chat access or available credits.
- **Models by task:** browse local/cloud providers, search models, and filter by reported image/tool support and context size. Unknown capabilities stay unknown. Assign coding, quick-answer, image, and fallback models. Fallback copies earlier text and a reviewable draft to a new target conversation without sending; the source and previous target remain in the library. Files/images are excluded, and a failed request containing an attachment requires reattaching it.
- **Chat actions:** supported requests offer a review card for focus timers, music playback, service views, and Spotify songs. Confirm to run; offers expire after two minutes and can be used once. Unknown phrasing can use **Chat options → Prepare an AI action**, which sends only the current draft to the selected AI for interpretation. The result must match a small allowlist; no arbitrary shell commands or agent approvals are offered.
- **Spotify song search/playback:** create a Spotify developer app, register `http://127.0.0.1:45823/callback`, enter its public Client ID, and connect. Sign-in uses PKCE; access and refresh tokens stay in Credential Manager. Choose the matching track before playback. A supported Spotify account, appropriate access, and an active playback device are required. Existing Windows media controls still work without Spotify sign-in.
- **“Hey Nook”:** opt-in local Windows recognition listens for this English phrase using the default Windows microphone and an installed recognizer. It interrupts spoken output and prepares a draft. Automatic sending is a separate opt-in; recognized text then goes to the selected AI, while actions still require review. A visible microphone badge can stop listening; the notch stays compact while the listener is active. The listener stops on lock/sleep/quit and can be stopped or restarted in the studio. Physical microphone and recognizer accuracy still require testing on your PC.
- **More expressive motion:** task changes include anticipation and settling, and attached files travel toward the companion. Existing breathing, gaze, blinks, task props, speech, outfits, and personality controls remain available. Reduced motion skips the new movement.
- **Visual layout editing:** drag or move widgets with keyboard controls, toggle visibility, choose small/wide cards, and see the live layout preview. Save width, horizontal position, and selected widget order for each display. Music/service widgets appear when connected, and waiting approvals take priority.
- **Automatic profiles:** associate saved profiles with foreground application process names or running-agent project paths. Matching runs only while enabled and waits during chat generation or approvals. Monitor following also runs only when enabled and avoids moving a focused notch.
- **Long conversations:** branch at a message, search the visible conversation, save encrypted per-provider instructions, and review AI-generated summaries before applying them. Summaries replace only the exact older turns actually summarized; originals remain in the library. Summary generation incurs the selected provider's API charges. Context counts are rough text estimates, exclude image costs, and use provider-reported limits when available. Clearing conversations also clears associated summaries; pinned provider instructions have their own controls.
- **Android companion:** [native Android source](android/README.md) adds certificate-pinned HTTPS pairing via a QR/link, Android Keystore storage, biometric approvals, questions, opt-in phone chat, session details, a home-screen widget, a Quick Settings tile, and an optional activity island. Android chat requires the encrypted connection and has separate temporary history; PC chat messages, attachments, and keys are excluded. The browser/iPhone HTTP connection remains for trusted Wi-Fi. Release signing and real-device validation remain owner setup tasks.

Run `npm run smoke:studio` for isolated UI checks using fake AI replies, credentials, speech, and Chromium's synthetic microphone. It also checks encrypted phone pairing in Electron. The Android source has been compiled with Android 35 resources and D8, and a locally signed debug APK is available under `dist/Nook-Android-debug.apk` for device testing. The Android workflow builds a debug APK and runs lint when pushed; production signing is not configured. New studio-specific copy is currently English.

## Conversations and everyday tools

Open **Chats & everyday tools** in the app, or use **Ctrl+K** to find a tool.

- Hover the notch for your selected focus, task, notification, agent, music, service, and prompt widgets. Services needing attention can appear first; pinned services follow. Music and service widgets appear when connected. Approvals take priority, with a picker when several requests are waiting.
- Keep named, searchable, pinned conversations and export them as Markdown. Chat saving is off by default; enabling it requires system encryption. Choose 7, 30, or 90 days of retention. Files, images, API keys, and server credentials are excluded. The library keeps up to 100 conversations and 200 messages per conversation within an 8 MB storage budget. Requests use recent messages within a bounded text budget, with reviewed summaries carrying older context. Reattach files after restarting or when the shared memory cache expires.
- Expand chat into a resizable window and return to the notch with the same conversation. Attach up to six text/source files or PNG/JPEG images, preview their included content, and remove them individually. File imports are limited to 2 MB and 60,000 text characters per file, with 120,000 characters of combined text. Token counts are rough text estimates; image usage varies by provider.
- Save personal prompts or use starters, then review the draft before sending. Compare two provider/model pairs side by side: the review names both destinations, and clicking Send makes two requests with only the comparison prompt. Comparisons support Stop and preserve partial replies.
- Use a focus timer with pause, resume, a five-minute break, and a small task list. Timer deadlines survive sleep and restart. Notification history contains bounded completion/service titles; approvals stay in their own review queue.
- Choose calm, playful, or focused pet behavior, animation intensity, speed, and movement within the pet area. Reduced motion remains available.
- Save notch width, horizontal placement, and widget selection per display. Missing monitors fall back to your existing monitor preference. Windows can hide the notch over fullscreen applications; the monitor watcher runs only while enabled. Pause hides the notch until opened from the tray or resumed in settings.
- In notch chat, choose **Commands** beside Hold to talk. Review the recognized command and click **Run command**. Supported commands open chat, requests, notifications, or tasks; start/pause/resume/stop a focus timer; and mute/unmute sounds. Commands cannot approve requests or send chat messages. Transcription follows your existing Windows/OpenAI voice setting.

## See Nook in motion

Real app recordings with local sample data—no API key needed for the walkthrough.

![Animated Nook notch showing reading, editing, terminal work, completion, and an approval](assets/previews/notch.gif)

![Animated app walkthrough and companion wardrobe](assets/previews/app-tour.gif)

### Task workbench

![Animated task sidebar, file changes, and completion](assets/previews/workbench.gif)

### Approvals and questions

![Animated approval queue and question choices](assets/previews/approvals.gif)

### Chat

![Animated sample chat with typing indicators and streamed text](assets/previews/chat.gif)

### Wardrobe and app settings

![Animated companion wardrobe](assets/previews/wardrobe.gif)

![Animated appearance, connections, shortcuts, and workspace settings](assets/previews/app-settings.gif)

### Choose your theme

![Animated dark and light appearance presets](assets/previews/themes.gif)

### Usage limits at a glance

![Animated sample Claude usage dashboard with reset countdowns and warnings](assets/previews/usage-dashboard.gif)

### Continue a conversation with another AI

![Animated Markdown chat and selected-message handoff between sample local providers](assets/previews/chat-handoff.gif)

### Connected service companions

![Animated service companions showing connected services, reviews, and failed builds](assets/previews/service-companions.gif)

### Sound studio and custom agents

![Animated event sound and volume controls](assets/previews/sound-studio.gif)

![Animated custom-agent identity, event mapping, and sample-event setup](assets/previews/custom-agents.gif)

These clips show the real Nook interface using isolated sample sessions and simulated provider/service data. Usage, service balances, and failures are examples; no API credentials or personal account data are used in the recordings. Existing clips have also been refreshed for the latest interface.

Prefer still images? See the [welcome screen](assets/previews/welcome.png), [model connections](assets/previews/models.png), and [phone session details](assets/previews/phone-details.png).

The latest source UI has a compact toolbar, animated task companion, line-numbered changes, queue-aware approvals, and a quieter chat composer. See the [task workbench](assets/previews/notch-workbench.png), [approval card](assets/previews/notch-approval.png), and [chat view](assets/previews/notch-chat.png). The app includes a live workspace status strip and consistent navigation icons. These screenshots use isolated sample sessions.

Run `npm run smoke:workspace` on Windows to check session selection, typed-only questions, approval queues, unsaved preferences, narrow layouts, appearance persistence, notch sizing, hidden/reduced animation, key setup, searchable model selection, transcript preservation, history, phone revocation, and recap export without changing your real app data or sending real service actions.

Run `npm run smoke:chat` to verify actual keyboard entry and streamed replies through a local HTTP test server, plus dictation with Chromium's synthetic microphone. It checks microphone startup, cancellation, permission errors, failed audio setup, resource cleanup, and the expanded chat window without recording your microphone or using API credentials. In chat, choose your microphone from the input selector and use **Refresh** after connecting a headset. Windows must allow microphone access for desktop apps. Dictation creates a draft for you to review and send.

## Install on Windows

Download the latest **Nook-Setup-…-x64.exe** from [GitHub Releases](https://github.com/hoeslovevid/Nook-Interactive-Assistant/releases/latest). Run the setup wizard to choose an install location and create shortcuts. Supports Windows 10 and 11 on 64-bit Intel/AMD PCs. No Node.js installation is needed.

Nook is currently unsigned, so Windows may show a SmartScreen or unknown-publisher warning. Download only from this repository's releases. Verify a download against the included SHA256SUMS.txt with `Get-FileHash` if needed.

This repository is public. From version 0.5.1, downloading releases and checking for updates do not require a GitHub account or token. Nook checks stable releases at startup and every six hours. Open **Updates** in settings, or choose **Check for updates** from the tray. Download the update, then choose **Restart and install** when ready. Downloads are verified against SHA-512 release metadata; settings and provider keys are retained. Saved update tokens remain optional and encrypted locally; remove one under **Optional GitHub access** if it is expired. Automatic checks can be turned off. Nook never downloads or restarts silently.

Versions 0.2.1–0.5.0 used authenticated update checks. Those installations can use a valid saved token to download this release, or install it once manually to get updates without a token.

Versions 0.1.0 and 0.2.0 need a one-time manual upgrade using the latest installer. Manual installation remains available for any version: quit Nook through its tray menu, then run the newer installer. Uninstall from Windows Settings → Apps; saved settings are kept.

## Run from source

Install dependencies with npm install, then run npm start. Run npm test for the test suite.

## Appearance and performance

Preview the default [black app](assets/previews/black-theme.png) and [black notch](assets/previews/black-notch.png), the [appearance controls](assets/previews/customization.png) and [guided model setup](assets/previews/model-setup.png). These screenshots use isolated sample data.

**Appearance** offers four dark themes—Black (default), Graphite, Midnight, and Forest—and three light themes: Pearl (cool white), Sand (warm cream), and Mint (soft green). Selecting a theme applies matching app and notch colors; fine-tune the notch colors afterward. Your theme and custom colors are saved between launches. Comfortable or compact spacing, a 520–820 px expanded notch width (clamped to your display), and corner controls are also available. Animation modes apply to the app, notch, and desktop companion: Full caps companion drawing at 30 fps, Economy at 15 fps, and Reduced draws still poses when they change. Windows reduced motion always takes priority.

Hidden and offscreen companion previews stop drawing. Unchanged chat transcripts and provider choices retain their existing interface elements; pointer tracking stops after the gaze settles. Each provider retains up to 200 recent chat messages in memory. Activity recaps reuse unchanged history and refresh the rolling week at least every minute, using at most the last 2,000 log lines within a 4 MB tail to keep lifetime log growth from blocking the interface.

## Build and publish installers

The Nook logo uses the original notch companion: a pale seed silhouette, periwinkle pupils, and a small smile on a black tile. Editable vector sources live in `assets/logo.svg`, `assets/icon.svg`, and `assets/tray.svg`. Run `npm run brand` on Windows to regenerate the application and installer icons, high-DPI tray images, phone home-screen icon, and installer sidebar from those sources. The animated companion remains the activity character.

Use Node.js 22 or newer, run `npm ci`, then `npm run dist` on Windows. The installer appears in `dist/`. `npm run pack` creates the unpacked app for testing. Run `npm run smoke:packaged` on a Windows desktop with Nook closed to verify packaged pages, native media, and agent hooks with isolated app data. Runtime files are explicitly included; tests, previews, and development dependencies are excluded. Native scripts and agent hooks are kept outside an ASAR archive so Windows can execute them. Installed agent hooks use Nook's bundled runtime.

For a release, update the version in package.json and package-lock.json, update `.github/RELEASE_NOTES.md`, commit, and push a matching tag such as `v0.2.0`. The Windows release workflow runs tests, builds and verifies the installer and update metadata, then publishes the installer, block map, `latest.yml`, and SHA-256 checksums together. A manual workflow run produces a downloadable build artifact without publishing a release. Releases currently use unsigned executables; code signing is not configured. The updater uses this public GitHub repository over HTTPS with optional locally saved authentication and SHA-512 artifact checksums; Authenticode verification is disabled until signed installers are available.

To refresh all thirteen animated previews, run `npx electron scripts/capture-previews.cjs`, then `python scripts/encode-previews.py` with Pillow installed. The recorder uses isolated sample data and writes frames under `dist/`; only the resulting GIFs are committed and they are excluded from the installer.

## Connect models

Open **Models & connections**, expand a provider, and choose **Get an API key** to open its key page. Paste the key (Show/Hide is available), then Save. Nook encrypts it locally and checks the provider's model directory, with clear feedback for missing keys, denied access, rate limits, and offline local servers. Connection checks do not generate a chat response or check your available credits.

Search the returned chat models and select one, or enter a model ID manually. Known embedding, speech-only, image-generation, reranking, and other non-chat entries are excluded where the provider identifies them. Discovery does not guarantee a listed model supports every chat feature or attachment type. Switch providers in notch chat, then choose **Switch model…** to select a different model without opening settings. Successful lists are cached for one minute; the settings check button refreshes them. API keys stay in the main process and are not returned to the interface.

Model discovery follows the providers' APIs, including [OpenAI's model list](https://developers.openai.com/api/reference/resources/models/methods/list), so users can choose models available to their account without waiting for a Nook release.

Supported connections: OpenAI, Gemini, Claude, OpenRouter, DeepSeek, Mistral, Groq, Grok, Ollama, LM Studio, and a custom OpenAI-compatible endpoint. OpenRouter provides access to additional model families with one key. API access requires the provider's API credentials; chat website subscriptions do not configure API access.

Chat errors distinguish known API credit, spending/usage-limit, key, model-access, and temporary rate-limit failures. OpenAI account errors include links to the relevant API billing or limit settings. A bare 429 without provider details remains ambiguous. When the server specifies a retry delay, Nook shows a countdown and prevents early requests to that provider; other providers stay available. There are no automatic chat retries, and provider error messages that might echo prompts or credentials are excluded from diagnostics.

Ollama and LM Studio connect to a running server on this PC without a key. Custom endpoints accept HTTPS remote servers or loopback HTTP, with an optional encrypted API key. Enter the full chat/completions endpoint URL.

## Chat formatting and continuing with another AI

Notch chat renders headings, emphasis, inline code, nested lists, quotes, and fenced code with a copy button. Links open only after a click and accept HTTP or HTTPS. Model output is rendered as text and safe interface elements; embedded HTML cannot run scripts.

Choose **Continue with another AI**, pick a destination and select the messages to copy. This replaces that provider's in-memory conversation while preserving the source. Files and images are excluded. Nothing is sent to the destination until you submit your next message. **Restore previous chat** remains available until you send a new message there. A handoff accepts up to 24 messages and 64,000 characters; larger selections are rejected instead of silently shortened.

Connected GitHub, Vercel, Stripe, Resend, Notion, n8n, and Cal.com cards have small animated companions with distinct colors and status expressions. Click one to open its details. Existing confirmation-based actions remain available for GitHub CI, Vercel previews, and n8n; the other service details are read-only. Cards retain their canvases between status updates and release their animation listeners when removed.

## Sound studio

In **Companion & devices**, preview greeting, approval, completion, chat-error, and pet-interaction sounds. Import WAV, MP3, OGG, or M4A recordings under 2 MB, adjust volume, and enable events individually. **Use default** restores a built-in tone and **Stop preview** stops playback. Custom sounds are local, limited to 15 seconds per playback, and master mute stops active audio. Older hi.wav, greet.wav, approval.wav, and finish.wav files are recognized.

## Languages

The default follows the Windows language, falling back to English when unsupported. Select English, Simplified Chinese, Hindi, Spanish, Arabic, French, Bengali, Brazilian Portuguese, Russian, or Indonesian in settings. App controls, help, onboarding, tray menus, dialogs, and common errors update with the selected language. Arabic uses right-to-left reading; code, URLs, keys, model identifiers, and user-authored content retain their direction and original text. Provider-supplied diagnostics and content may remain in their original language.

Translations are compiled from the editable files in locales/ with python scripts/build-locales.py. Some common translations are adapted from [Coucou](https://github.com/Louis-CFM/coucou), copyright 2026 Louis Raillé, under its MIT license. The attribution and license are distributed in lib/Coucou-Translation-LICENSE.txt. Nook's additional interface translations, artwork, and animations are maintained here.

## Secure keys and exact terminal navigation

Provider, integration, update-access, and push-relay keys use Windows Credential Manager. On first startup, Nook migrates the previous encrypted key file, verifies each migrated value, and keeps an encrypted recovery copy. Existing native entries take priority. A failed migration preserves the old encrypted file; the settings page reports storage status without exposing keys. Credential entries are scoped to the local Nook profile.

For precise VS Code or Cursor terminal selection, open **Agents → Linked terminals → Show terminal helper**. Install terminal-helper.vsix through the editor's **Extensions → Install from VSIX**, then run **Nook: Create linked terminal** and start the agent inside it. The helper restores that specific terminal, including split terminals, through an authenticated local pipe; it cannot type or execute commands.

Alternatively, use **Open linked Windows Terminal** to create a named tab. Keep its Nook title so Nook can select it again. Windows Terminal navigation restores the tab, rather than a particular split pane. Existing unlinked sessions use window or project-folder fallback. The helper source is in terminal-helper/; regenerate the bundled extension with python scripts/build-terminal-helper.py.

## Appearance

Appearance offers live color and corner controls. Reset look restores the default Black theme and periwinkle accent. Existing saved colors are preserved until you choose a new theme or reset the look. Keyboard focus and reduced-motion settings are supported.

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

The optional [self-hosted APNs relay](push-relay/README.md) can start, update, and end Live Activities when the phone opts into automatic handoff, and delivers generic background alerts. The PC encrypts relay and device tokens. Push payloads contain agent status and request IDs, not commands, code, questions, or provider keys. Details and actions still require the trusted local network; no internet approval tunnel is included. Revoke native devices in desktop settings, disable phone access, or rotate pairing to stop native delivery.

Apple signing, provisioning, real-device testing, and relay deployment are not configured in this Windows workspace. The native source includes XcodeGen configuration and a macOS simulator-build workflow for verification on Apple tooling before distribution.

## Usage, dictation, wardrobe, and custom agents

The Claude and Codex plan cards open a usage dashboard with progress rings, reset countdowns, and warnings at 90% used. Enable the corresponding plan-usage setting in Agents. These are the latest limits reported by the local agent, rather than API billing totals; unknown reset times stay unknown, and expired countdowns ask you to refresh the agent.

Choose **Speech language** in Companion & devices, or right-click the chat microphone. Windows lists installed System.Speech recognizers and uses the exact chosen culture. Add speech support in Windows language settings if it is missing. OpenAI dictation uses your saved OpenAI key and sends the selected language with the recording; Automatic lets the recognizer select its default or detect the language. Review the text before sending.

Hover or focus a wardrobe tile to preview it on the app, notch, and desktop pet. Click to save; previews never change the saved outfit and expire after ten seconds. Nook has original summer visor, moon wizard, and holiday outfits. Seasonal mode selects the visor in summer and the wizard in October. Reduced motion applies to all outfits.

In **Agents → Custom agents**, name and color an agent, map its JSON event fields and event names, and test a sample without sending it anywhere. Save and export the profile, then copy the generated PowerShell command into that agent’s activity hook configuration. The hook consumes one JSON object from standard input, emits Read/Edit/Bash/Stop activity, and exits successfully if Nook is unavailable. It never handles or grants permissions; the agent keeps its own prompts. Up to ten profiles can be saved. Field paths are simple dot-separated properties, with no expressions or prototype traversal. Exported profiles contain mappings and appearance, not keys. Keep the exported profile path stable; export again after changing a mapping.

## More service controls

With **Offer service actions** enabled, GitHub PRs can be approved, given a review comment, or sent a request for changes. Inspect the changes in GitHub first. Reviews attach to the fetched commit and refuse to submit if the PR changes during confirmation. Vercel queued/running builds can be cancelled; n8n failed executions can be retried. Cancellation and retry re-check the current item after confirmation. Workflow retries can repeat side effects, which the PC confirmation explicitly describes. Service credentials need write access for these actions. Every offer expires after five minutes and is consumed once.

## iPhone search and automatic handoff

The iPhone source adds session pinning, swipe actions, context menus, a light/dark/system appearance setting, an iOS Focus filter for waiting approvals, and opt-in Spotlight search. Spotlight indexes session/project names and agent names on the phone, excludes code and answers, expires entries after a day, and clears when disabled, disconnected, or PC detail sharing is switched off. Search identifiers are scoped to the paired PC.

Automatic Lock Screen handoff is opt-in on the iPhone and requires a configured Apple push relay. Routine work starts an activity after twenty seconds of PC lock; waiting approvals can start immediately. Unlocking gets thirty seconds before the activity ends, and relocking retains it. Start requests are deduplicated per handoff by the running relay; restarting the relay clears its in-memory deduplication cache. Apple delivery, permission, and throttling rules still apply. Manual Live Activities remain available. Details and actions continue to require the trusted LAN.

These additions were inspired by [Coucou](https://github.com/Louis-CFM/coucou); Nook’s companion artwork and new outfits are original. API behavior follows the [GitHub review API](https://docs.github.com/en/rest/pulls/reviews), [Vercel cancellation API](https://vercel.com/docs/rest-api/deployments/cancel-a-deployment), [n8n public API client](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/cli/src/client.ts), [OpenAI dictation API](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create), and [Apple ActivityKit guidance](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications).

## Dashboard, workspace profiles, and interactive notch preview

Nook opens on **Home**, with current agent sessions, waiting requests, recent activity, saved integrations, and agent-reported limits. Model checks are manual, non-generative requests; the dashboard records their last verification time rather than claiming continuous connection health.

In **Appearance**, try the interactive notch with sample tasks, chat, approvals, and music. Collapse or expand it, click the pet, edit a sample greeting, and play the scene sequence. Sample messages and decisions stay inside the preview. The scene player pauses offscreen. Theme, colors, width, wardrobe, and reduced motion apply to its companion.

Move or hide session, service, music, and GitHub cards; pin favorite integrations and choose compact or spacious card spacing. Actual approvals remain available regardless of layout. Text can be enlarged to 115% or 130%, with high contrast, notch opacity, and a frosted surface option. Native background material depends on Windows support; a tinted surface remains the fallback.

Save up to twelve named **workspace profiles** on Home, then apply or remove them. Profiles capture appearance, card layout, model IDs, visible pills, and notification preferences. They exclude API keys, server addresses, push credentials, chat contents, and attachments. Existing credentials remain in Credential Manager. Applying a profile waits for the current chat to finish or be stopped.

Press **Ctrl+K** inside Nook to search commands, settings, live sessions, linked terminals, services, and favorite models. Use the arrow keys and Enter to select; Escape closes it. New approvals interrupt notch search without making a decision. Alt+Left/Right navigates session and service buttons when a text field is not focused.

## Chat controls, model setup, and voice companion

**Stop generating** cancels the request and keeps any partial reply. **Retry request** and **Regenerate** replace the latest turn without duplicating its user prompt; its attachment is retained within a shared 32 MB memory budget. Evicted attachments require reattaching instead of silently retrying without them. **Edit & resend** replaces that provider's selected user turn and later replies, while preserving other providers. Failed replies display errors separately and do not send those diagnostics back to the model. User input remains limited to 2,000 characters per message.

The guided **Connect an AI** wizard saves a provider key, checks the model directory, and lets you choose a model before opening chat. **Find local AI servers** checks the configured Ollama and LM Studio addresses on demand. Favorites and recent models appear first. Image, tool, and context-size badges use explicit provider metadata; unreported capabilities remain unknown.

Hold **Talk** in notch chat, then release to transcribe and review your draft. Space or Enter also holds the button; cancellation releases the microphone. Sending still requires your click. Existing Windows/OpenAI transcription settings apply. **Read aloud** uses an installed Windows speech voice on this PC. Optional automatic spoken replies are off by default, respect mute/quiet hours, and have Stop controls. Choose a voice and speed in Companion & devices. Wake-word listening is off by default and can be enabled separately in Health & studio.

## Lifelike motion and performance measurements

The original companion now has independently timed blinks, occasional stretches, glances, yawns, and nods. Reading turns pages, typing highlights keys, terminal work blinks a cursor, and speech animates its mouth. Task poses ease into each other. Reduced motion preserves expressions and brief interaction updates, then stops drawing again.

**Performance** shows combined process CPU, approximate working-set memory, notch readiness time, power state, and background-check cadence. Measurements refresh only while the page is visible. Automatic battery saver uses economy motion and slower media/service checks; local agent events and approvals remain immediate. Settings reads are briefly cached with write invalidation, unchanged lists retain their elements, and hidden dashboards stop rebuilding.

Run `npm run smoke:experience` for isolated checks of the new dashboard, interactive preview, profiles, card layout, larger text, command palette, local model setup, favorites, chat cancellation/regeneration/editing, speech controls, and approval interruption. Network providers and voice output are simulated during these checks. Windows microphone and audible voice quality still depend on installed hardware, voices, recognizers, and permissions.
