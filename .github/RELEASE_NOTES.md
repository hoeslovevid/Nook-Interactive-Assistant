## Install Nook on Windows

Download **Nook-Setup-0.4.0-x64.exe** from the assets below, run it, and follow the setup wizard. Requires Windows 10 or 11, 64-bit Intel/AMD. Nook includes its desktop runtime; Node.js is not required to install or use it.

The installer adds Start menu and desktop shortcuts. **Users on 0.1.0 or 0.2.0: quit Nook and install this release once manually.** From 0.2.1 onward, Nook checks GitHub automatically and lets you download and restart from the Updates page. Your settings and encrypted provider keys stay on this PC. Uninstall through Windows Settings → Apps; saved settings are retained.

This release is unsigned. Windows may display an unknown-publisher or SmartScreen warning. A signing certificate is not yet configured. SHA256SUMS.txt provides download checksums.

Includes the animated notch and companion, wardrobe, multi-provider AI chat, modern settings and shortcuts, Windows media controls, dictation, screenshot context, and the local phone companion. Cloud chat requires your provider API key; local models require a running local server. Phone access is opt-in and works on trusted local Wi-Fi while Nook is running.

## New in 0.4.0

- Modern app navigation with original line icons, a live workspace status strip, and consistent rounded connection cards.
- Wider, responsive notch with activity/chat/file controls, settings and sound buttons, an animated task sidebar, line-numbered diffs, and real task progress.
- Clearer approvals with queue counts, waiting timers, larger Allow/Deny buttons, and secondary actions. Typed-only questions and empty-answer validation work correctly; deferring a request no longer hides the next one.
- Cleaner chat bubbles, typing indicators, a compact composer, and a reviewable error panel. Streaming handles CRLF frames, final events, provider completion markers, and errors; stalled requests time out.
- File picker and PNG/JPEG context support, bounded file reads, correct custom-key status, and session shortcuts that navigate sessions.
- Unsaved workspace preferences survive background updates; exiting the walkthrough reliably restores real state.
- Reliable phone push retries and periodic Live Activity refreshes; expired tokens are pruned and failed encryption preserves existing registrations.
- Service actions expire if connection settings or credentials change. Malformed history and invalid or duplicate hook messages are handled safely.
- iPhone query encoding, pairing-change checks, and activity cleanup fixes. iPhone app and widget source are checked with an unsigned Mac simulator build; device signing and push deployment still require owner setup.
- Seven animated repository previews covering the notch, task workbench, approvals, chat, wardrobe, app settings, and walkthrough.

Validation: 71 automated tests, isolated desktop workflow checks, and packaged Windows startup/resource/native-hook checks. All demonstrations use local sample data; no provider calls or real service writes are made by the preview recorder.

## Included from 0.3.0

- Minimal Nook logo across Windows executable, installer, uninstaller, tray, app screens, browser and phone icons, and recap exports.
- Smoother pet docking and return after the whole approval queue is resolved; abandoned hook requests clear without a decision.
- Animated wardrobe motion and transitions, plus crown, bow, and raincoat outfits.
- Workspace & alerts page with Windows notifications, quiet hours, and per-agent muting.
- Optional encrypted session and decision history, text/agent/project search, 7/30/90-day retention, bounded storage, and deletion controls.
- Detailed GitHub, Vercel, and n8n views. Optional one-use, expiring service actions require confirmation on the PC.
- 1080 × 1920 PNG recap export and an optional stable phone listener across restarts.
- Native iOS app and self-hosted APNs relay **source**, with Keychain pairing, authenticated approvals, widgets, Siri shortcuts, and Live Activity support. The app and widgets passed an unsigned Mac simulator build. Apple signing, push credentials, and relay deployment are not configured. Session details and actions continue to use trusted local Wi-Fi.

## Included from 0.2.1

This repository remains private. Users need repository access to download the installer. Save a fine-grained GitHub token in the Updates page, restricted to this repository with Contents: read-only permission. The token is encrypted on the PC, never bundled in the app, and never shared with phones. Missing access shows setup instructions instead of repeated failed checks.

## Included from 0.2.0

- Automatic stable-release checks at startup and every six hours, download progress, and a user-controlled restart. No silent download or restart.
- Animated recordings in the repository README.
- Pet wardrobe and shortcuts on right-click, double-click home, hover hearts, agent colors, smoother movement, and lighter idle animation.
- Drag the desktop pet onto a window to review a screenshot in chat before sending.
- Seven-step offline walkthrough with sample sessions, diffs, approvals, questions, chat, and service cards.
- Opt-in phone timelines, bounded diffs, completed answers, service summaries, and an approval focus filter.
- Phone follow-up drafts arrive in the PC inbox for review, copy, and terminal handoff; they never run automatically.
- Shuffle and repeat controls for compatible Windows media players.

`latest.yml` and the `.blockmap` asset support in-app updates; download the `.exe` to install manually. The browser phone companion uses trusted Wi-Fi. Native iPhone Live Activities and push notifications require building and configuring the separate iOS and relay source.
