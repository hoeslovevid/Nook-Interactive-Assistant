## Install Nook 0.7.1 on Windows

Download **Nook-Setup-0.7.1-x64.exe** below and follow the setup wizard. Windows 10 and 11 on 64-bit Intel/AMD PCs are supported. Existing settings and provider credentials are retained.

Existing installations can use **Updates → Check for updates → Download update → Restart and install**. Public updates do not require a GitHub token. Versions 0.1.0–0.2.0 need one manual installer upgrade.

## Fixed in 0.7.1

- **Chat typing:** opening chat from the app now activates the notch for keyboard input. Repeated view updates no longer reset the window's focus setting. Chat controls retain the chat view while you interact with them.
- **Microphone startup:** choose your input device in either chat window, refresh the device list after connecting a headset, and retry without audio processing when a Windows driver cannot initialize it. Overlapping starts, cancellation during startup, disconnected devices, and failed audio setup release microphone resources correctly.
- **Voice setup and errors:** missing Windows dictation languages and missing OpenAI dictation keys are checked before recording. Permission, device, and audio-processing failures have specific recovery instructions. The compact notch keeps these messages visible and includes a Voice settings shortcut.
- **Chat recovery:** retry restores a rejected request without duplicating its turn; failed sends preserve newer drafts. Ctrl+Enter in another editing field no longer sends the chat composer accidentally. Optional view/notification bookkeeping failures cannot turn a successful reply into an error or leave generation busy.
- **Companion settings:** saving preferences returns the saved settings even when music is disabled. Malformed audio input returns a normal error, and Windows speech output uses UTF-8 for dictation text.
- **Voice commands:** “Open my chat” retains the selected provider.

Dictation creates a draft for review before sending. Windows dictation requires an installed Windows speech recognizer; OpenAI dictation requires an OpenAI API key and sends the recording to OpenAI when stopped. Windows must permit microphone access for desktop apps.

## Validation and platform notes

**148 automated tests** pass. Four isolated desktop checks cover keyboard input, streamed chat over a local HTTP server, retries, synthetic microphone capture, permission/setup failures, cancellation, app settings, expanded chat, approvals, hover widgets, conversations, and existing workflows. Packaged startup, bundled hooks, resources, and native integrations also pass. Tests do not record the user's physical microphone or make paid AI requests; physical microphone and voice quality remain dependent on the user's devices and Windows configuration.

Installer update metadata, SHA-512 integrity, block map, and SHA-256 checksums are verified. **SHA256SUMS.txt**, **latest.yml**, and the **.blockmap** are included for installer verification and in-app updates. Windows installers remain unsigned.

The iPhone app, widgets, Live Activities, and relay remain available as source. Apple signing, provisioning, push credentials, relay deployment, and physical-device validation require owner setup; the Mac workflow checks simulator compilation and tests.
