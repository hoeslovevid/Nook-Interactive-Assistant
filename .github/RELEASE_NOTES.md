## Install Nook 0.9.0 on Windows

Download **Nook-Setup-0.9.0-x64.exe** and follow the setup wizard. Windows 10 and 11 on 64-bit Intel/AMD PCs are supported. Existing settings and provider credentials are retained.

Existing installations can use **Updates → Check for updates → Download update → Restart and install**. Public updates do not need a GitHub token. Versions 0.1.0–0.2.0 need one manual installer upgrade.

## New in 0.9.0

- **A focused workspace:** Home, Chat, Voice, Connections, and Appearance are the primary pages. More settings holds less frequent controls. Search settings by name and follow a first-conversation checklist. Connection health, model assignments, layout controls, and phone setup now live beside the features they configure.
- **Custom controls:** rounded text fields, consistent focus states, and searchable choice dialogs in dark and light themes. Choice dialogs support keyboard navigation and restore focus when closed.
- **A calmer notch:** coordinated card transitions, clearer provider/context/image-support information, task-model shortcuts, retained scroll position, and separate unsent drafts per AI provider. Reduced motion avoids redraws for unchanged companion attributes.
- **Dictation anywhere:** enable the optional global shortcut in Voice, hold Ctrl+Shift+F8 (or F9/F10), speak, and release to review. Escape cancels while holding. Ctrl+Shift+F11 pastes the last dictation into the current text field when available. Automatic insertion is separately opt-in, refuses protected or changed targets, and restores supported clipboard formats unless the clipboard changed. Recordings stop after 90 seconds.
- **Offline speech:** explicitly download the checksum-pinned whisper.cpp CPU runtime and Tiny English or multilingual Base model. Downloads contact GitHub/Hugging Face; recognition stays on this PC. Downloads can be cancelled and models removed. Existing chat dictation can use the same installed offline model.
- **Your words and style:** local whole-phrase dictionary replacements, spoken snippets, and optional per-app AI cleanup. AI cleanup is requested manually, sends the draft to your chosen AI connection, can incur API charges, and can be undone. Dictation history is off by default; saved transcripts are encrypted locally.
- **Meeting notes:** explicitly confirm participant consent and record microphone audio, optionally with computer playback. A floating indicator stays visible. Recordings stop after 20 minutes or when processing cannot keep up. Audio is processed in short segments and temporary files are deleted. Review and save encrypted transcripts, request and review an AI summary, edit notes, export Markdown, or delete them. Speaker identification is not automatic. Lock or sleep stops recording and preserves already captured transcript text for review.
- **Android widgets:** four resizable variants for status, the companion, agents, and waiting requests. Status colors distinguish active work, review, and quiet. Widgets open the app for review and never grant approvals themselves.
- **Accessibility and language:** a skip link, clearer dialog names and focus indicators, keyboard-operated voice tabs, and expanded interface translations in the ten supported languages. Detailed new help and some diagnostics retain English fallback; translations still need native-speaker review.
- **Stable Android signing support:** release signing configuration and a manual signed-APK workflow are included. Production signing keys are owner setup; this release's Android download remains clearly labeled as a test build.

## Android test build

**Nook-Android-0.9.0-debug.apk** supports Android 11 or later. Pair with the PC through trusted Wi-Fi using the QR in Companion & devices. A differently signed debug APK may require uninstalling the previous test app and pairing again. Production signing secrets are not configured.

## Validation and platform notes

**177 automated tests** pass. Isolated desktop checks cover custom choices, settings search, French/light-theme controls, native hold-to-dictate shortcuts with synthetic audio, dictionary replacements, meeting consent, encrypted notes, reviewed summaries, model selection, provider drafts, profiles, keyboard entry, streaming, and microphone regressions. Packaged startup, native resources, Windows media integration, and bundled hooks pass. Offline recognition was also tested with the actual downloaded CPU runtime and whisper.cpp's public JFK sample.

No paid AI requests or real microphone recordings were used in those checks. Physical microphone quality, computer-audio recording, and Android biometric/overlay/battery behavior still need device validation.

The release workflow checks Android compilation/lint and Windows tests before publication. **SHA256SUMS.txt**, installer **.blockmap**, and **latest.yml** support download verification and in-app updates. Windows installers remain unsigned. Production Android signing, Windows signing certificates, and Apple signing/push deployment require owner configuration.
