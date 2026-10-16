## Install Nook 0.10.0 on Windows

Download **Nook-Setup-0.10.0-x64.exe** and follow the setup wizard. Windows 10 and 11 on 64-bit Intel/AMD PCs are supported. Existing settings and provider credentials are retained.

Existing installations can use **Updates → Check for updates → Download update → Restart and install**. Public updates do not need a GitHub token. Versions 0.1.0–0.2.0 need one manual installer upgrade.

## New in 0.10.0

- **A more expressive notch and companion:** an iOS-inspired capsule, coordinated transitions, walking page companions, subtle page accents, persistent toolbar pet, and reduced-motion support. Resize the live notch preview directly, rearrange widgets, and save widths for the current monitor. Native bounds now follow zoom and available display space.
- **Shared voice setup:** chat dictation, global dictation, meeting capture, and assistant utterances share microphone, language, and engine settings. A six-second microphone test shows input levels and transcription results. Recording timers and actionable notices make capture easier to follow. Explicitly remember short corrections for future dictation.
- **Optional advanced local speech:** checksum-pinned Parakeet speech and speaker-separation packages can be downloaded separately. Speaker labels are estimates and can be renamed. The optional Windows keyword detector still uses the Windows default input and installed English recognizer; the captured utterance uses shared voice settings. Downloads, package notices, and supported-language information are available in Voice.
- **Better meeting review:** search transcripts, filter speaker turns, navigate timestamped text, export SRT/WebVTT when timing is available, and request task suggestions. Review titles, owners, and dates before adding selected tasks. Editing raw transcript text clears outdated timing and speaker metadata.
- **Library and recovery tools:** add supported local documents and explicitly selected project sources for search and reviewed chat context, prepare email/calendar drafts, inspect usage, export portable preferences, and create encrypted recovery backups. Provider keys and source content are excluded from portable preferences and diagnostics.
- **Clearer model choices:** choose configured models for local, quick, image, or default tasks and optionally lock a provider. Suggestions explain the configuration or reported capability used; unknown speed and image support are not invented. Applying a preview is explicit and can only happen once.
- **Reviewed window context:** dropping the pet on a window or choosing a window opens a preview first. Crop it, cover private areas, and explicitly attach it. Redactions are baked into the image pixels. Attaching does not send a message.
- **More Spotify controls:** seek, shuffle, repeat, change supported device volume, and transfer to an available device. Availability depends on the connected account and Spotify playback restrictions. Rate-limit responses produce a cooldown.
- **Phone improvements:** local rediscovery, optional self-hosted encrypted remote relay source, background reconnect support, and nine Android widgets. Remote access requires owner setup; Nook does not deploy hosting automatically. Approval decisions still require review and authentication.
- **Practical polish and fixes:** optional quiet startup, stale voice-setting protection, safer context previews, one-use model offers, corrected per-monitor previews, and checks for lock/sleep, enlarged text, and zoom. The Performance page includes a version-specific manual device checklist.

These additions are inspired by [Coucou](https://github.com/Louis-CFM/coucou). Nook's companion artwork remains original.

## Android test build

**Nook-Android-0.10.0-debug.apk** supports Android 11 or later. Pair with the PC through trusted Wi-Fi using the QR in Companion & devices. A differently signed debug APK may require uninstalling the previous test app and pairing again. Production signing secrets are not configured. iPhone source remains available for owner signing and device configuration; no iPhone binary is distributed here.

## Validation and platform notes

**219 automated tests** passed locally. Isolated desktop checks use simulated provider replies and synthetic microphone audio to cover shared speech, microphone calibration, correction learning, meeting tasks and subtitles, context redaction, model choices, layout editing, Spotify controls, scaling, and suspend/resume. Packaged Windows startup, document workers, native resources, media integration, and bundled agent hooks passed.

The release workflow reruns Android compilation/lint, Windows tests, desktop interaction checks, packaged smoke checks, and installer/update checksum verification before publication. Physical microphone accuracy, real Spotify accounts, Android hardware, Windows Narrator, and installer-upgrade/recovery scenarios remain manual checks; see [DEVICE-TESTING.md](https://github.com/hoeslovevid/Nook-Interactive-Assistant/blob/master/docs/DEVICE-TESTING.md).

**SHA256SUMS.txt**, installer **.blockmap**, and **latest.yml** support download verification and in-app updates. Windows installers remain unsigned. Production Android signing, Windows signing certificates, Apple signing/push delivery, and remote relay hosting require owner configuration.
