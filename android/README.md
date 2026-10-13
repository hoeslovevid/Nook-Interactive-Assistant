# Nook for Android

Native Android 11+ companion with Nook's original pet, dark cards, local agent status, session details, questions, biometric approvals, and opt-in chat through the PC's AI providers. An optional foreground service adds an activity island, generic request notifications, a home-screen widget, and a Quick Settings tile. The island never grants permissions; Review opens the app and Allow requires biometrics or device unlock.

## Pair

1. On the PC, enable phone access in **Companion & devices**. Allow Nook on your trusted private network if Windows asks.
2. Open **Connection health & studio → Show Android pairing QR**. Scan with your phone camera to open Nook, or paste the displayed link into the Android app. Confirm the computer shown in the pairing dialog.
3. The Android client uses HTTPS on port 45822 with the PC certificate pinned before sending the pairing code or token. The certificate private key is encrypted on the PC; the phone pairing record uses Android Keystore. Codes expire in ten minutes and paired tokens expire after 24 hours. Revoke on the PC to disconnect every device. Regenerating a PC certificate requires pairing again.
4. Enable **Allow paired phones to chat** separately in Connection health. Chat uses the PC's configured models and keys, incurs the provider's API charges, and has separate temporary history. PC chat history, files, and screenshots are excluded. Session detail sharing remains its own opt-in.

The original browser/iPhone HTTP link remains available on port 45821 for trusted Wi-Fi. The Android app rejects unencrypted links and public internet addresses. No relay, router, or firewall settings are changed automatically.

## Build

Open this directory in Android Studio with **JDK 17**, Android SDK 35, and **Gradle 8.9**. Run `gradle :app:assembleDebug :app:lintDebug`. The included GitHub workflow performs the same checks and uploads a debug APK for device testing. Release signing is deliberately unconfigured; use your own release key before distribution. No credentials or signing material belong in the repository.

The source uses Android framework UI and cryptography, without analytics or external UI libraries. Pairing and chat screens block screenshots. Polling runs only while the app is visible or the user-enabled foreground island is active; screen-off polling slows to 30 seconds. Android may stop background work under battery restrictions. The app reports connection errors and does not grant requests from background notifications.

Physical-device microphone input, camera QR scanning, biometric behavior, overlay positioning around device cut-outs, and battery behavior still require device validation. QR scanning uses the phone's existing camera/scanner; no camera permission is requested by Nook itself.
