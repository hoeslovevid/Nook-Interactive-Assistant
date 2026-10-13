## Install Nook 0.8.0 on Windows

Download **Nook-Setup-0.8.0-x64.exe** and follow the setup wizard. Existing settings and provider credentials are retained. Windows 10 and 11 on 64-bit Intel/AMD PCs are supported.

Existing installations can use **Updates → Check for updates → Download update → Restart and install**. Public updates do not require a GitHub token. Versions 0.1.0–0.2.0 need one manual installer upgrade.

## New in 0.8.0

- **Modern island:** a Coucou-inspired black shell, minimal toolbar, rounded cards, pill-shaped approvals, and a companion beside chat. Nook keeps its original pet and branding. Light themes and Classic Nook remain available.
- **Health & studio:** microphone selection and live level testing, installed speech checks, voice previews, key-storage diagnostics, and an optional small AI chat probe. Directory checks are distinguished from successful chat access.
- **Models by task:** local/cloud browsing, reported capability and context filters, and coding, quick-answer, image, and fallback assignments. Fallback prepares context and a draft for review without sending automatically.
- **Reviewed chat actions:** focus timers, explicit play/pause controls, service views, and Spotify song requests. Spotify uses PKCE sign-in and requires your developer Client ID, appropriate account access, and an active playback device. Requests offer a confirmation card; no arbitrary shell commands or agent approvals are executed.
- **Optional “Hey Nook”:** local Windows wake-word recognition, a visible listening indicator, interruption of spoken output, and reviewable drafts. Automatic sending is a separate opt-in. Listening stops on PC lock and sleep.
- **Livelier companion:** anticipation and settling between tasks, plus attached-file motion. Reduced motion remains supported.
- **Widget layout editor:** live preview, drag and keyboard ordering, small/wide cards, visibility controls, and display-specific layouts. Optional rules switch workspace profiles by foreground app or agent project; monitor following is also opt-in.
- **Longer conversations:** branching, conversation search, encrypted pinned instructions, reviewed summaries of exact earlier turns, and approximate text-context counts. Original messages remain available in the library.
- **Android companion:** certificate-pinned HTTPS QR pairing, Android Keystore storage, biometric approvals, session details and questions, separate opt-in phone chat, a home-screen widget, a Quick Settings tile, and an optional activity island.

Open **Health & studio** to configure the additions. Microphone tests stay local; AI probes, summaries, action interpretation, and phone chat may incur the selected provider's API charges.

## Android test build

**Nook-Android-0.8.0-debug.apk** is a development build for Android 11 or later. Enable phone access on the PC, open the Android pairing QR in Health & studio, and pair on trusted Wi-Fi. This APK uses a debug signing certificate; future test builds may require uninstalling the previous test APK and pairing again. Production Android signing is not configured. Biometric, microphone, overlay, and battery behavior require physical-device testing.

## Validation and platform notes

**170 automated tests** pass. Isolated desktop checks cover connection health, a synthetic microphone, model filters and assignments, reviewed actions, explicit media controls, voice drafts, summary review, conversation branches, profile switching, widget layout, dark/light themes, and encrypted Android pairing. Existing keyboard and dictation regression checks pass. Packaged startup, native resources, Windows media integration, and bundled agent hooks pass. Paid AI, real Spotify playback, and physical microphone recognition were not used in these checks.

The release workflow checks Android compilation and lint and Windows tests before publishing. **SHA256SUMS.txt**, **latest.yml**, and the installer **.blockmap** support verification and in-app updates. Windows installers remain unsigned.

The iPhone app, widgets, Live Activities, and relay remain available as source. Apple signing, provisioning, push credentials, relay deployment, and physical-device validation require owner setup.
