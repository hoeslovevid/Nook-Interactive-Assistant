# Nook for Android

Native Android 11+ companion with Nook's original pet, dark cards, local agent status, session details, questions, biometric approvals, and opt-in chat through the PC's AI providers. An optional foreground service adds an activity island, generic request notifications, home-screen widgets, and a Quick Settings tile. The island never grants permissions; Review opens the app and Allow requires biometrics or device unlock.

## Pair

1. On the PC, enable phone access in **Companion & devices**. Allow Nook on your trusted private network if Windows asks.
2. Open **Connection health & studio → Show Android pairing QR**. Scan with your phone camera to open Nook, or paste the displayed link into the Android app. Confirm the computer shown in the pairing dialog.
3. The Android client uses HTTPS on port 45822 with the PC certificate pinned before sending the pairing code or token. The certificate private key is encrypted on the PC; the phone pairing record uses Android Keystore. Codes expire in ten minutes and paired tokens expire after 24 hours. Revoke on the PC to disconnect every device. Regenerating a PC certificate requires pairing again.
4. Enable **Allow paired phones to chat** separately in Connection health. Chat uses the PC's configured models and keys, incurs the provider's API charges, and has separate temporary history. PC chat history, files, and screenshots are excluded. Session detail sharing remains its own opt-in.

The original browser/iPhone HTTP link remains available on port 45821 for trusted Wi-Fi. The Android app rejects unencrypted links and public internet addresses. No relay, router, or firewall settings are changed automatically.

## Rediscovery and optional remote access

Nook advertises `_nook._tcp` only while PC phone access is enabled. Android can discover a changed local address, but still verifies the paired TLS certificate before sending credentials. Open **Connection details** for the last successful connection and recovery steps.

For access away from local Wi-Fi, configure the optional [encrypted relay](../relay/README.md) on the PC, then choose **Refresh remote configuration on Wi-Fi** in the paired Android app. The relay has separate phone capabilities and carries AES-GCM envelopes; the pairing token remains on the endpoints. Local connections are preferred. A failed POST is not automatically repeated through another transport; review state before retrying an action. This source does not deploy or pay for relay hosting.

## Build

Open this directory in Android Studio with **JDK 17**, Android SDK 35, and **Gradle 8.9**. Run `gradle :app:assembleDebug :app:lintDebug`. The included GitHub workflow performs the same checks and uploads a debug APK for device testing. Release signing is deliberately unconfigured; use your own release key before distribution. No credentials or signing material belong in the repository.

The source uses Android framework UI and cryptography, without analytics or external UI libraries. Pairing and chat screens block screenshots. Foreground polling runs while the app is visible or the user-enabled foreground island is active; an optional background reconnect job checks about every 15 minutes, subject to Android scheduling and battery restrictions; screen-off polling slows to 30 seconds. Android may stop background work under battery restrictions. The app reports connection errors and does not grant requests from background notifications.

## Widgets and stable signing

The launcher offers nine resizable widgets: **status**, **companion**, **agents**, **requests**, **usage ring**, **today**, **compact status**, **workspace dashboard**, and **companion mood**. Most layouts follow the system light/dark theme. Usage shows the first available provider’s five-hour used percentage, or an unavailable state. Today counts sessions observed transitioning from active to finished while connected; it is not a complete history. The dashboard expands its detail on wider widget sizes. Widgets only open the review app; they never grant approvals. Snapshots refresh when the connected app, activity island, or optional background reconnect job receives state. They can be stale when all three are stopped. Unchanged snapshots do not trigger another widget update. Disconnecting clears their status.

For a release APK that can be upgraded without reinstalling, create and securely back up one production keystore and reuse it. Configure `NOOK_ANDROID_KEYSTORE` (absolute path), `NOOK_ANDROID_STORE_PASSWORD`, `NOOK_ANDROID_KEY_ALIAS`, and `NOOK_ANDROID_KEY_PASSWORD`, then run `gradle :app:assembleRelease :app:lintRelease`. Without those variables the release task remains unsigned; it never substitutes a debug key.

The manual **Signed Android companion** workflow accepts repository secrets `NOOK_ANDROID_KEYSTORE_BASE64`, `NOOK_ANDROID_STORE_PASSWORD`, `NOOK_ANDROID_KEY_ALIAS`, and `NOOK_ANDROID_KEY_PASSWORD`. It restores the key temporarily, builds and verifies a signed release APK, uploads a build artifact, and deletes the temporary key. Keep the keystore and passwords outside Git. Installing a production-signed APK over a differently signed debug APK requires uninstalling the debug app and pairing again. No production keystore or repository signing secrets are configured by this source change.

Physical-device microphone input, camera QR scanning, biometric behavior, overlay positioning around device cut-outs, and battery behavior still require device validation. QR scanning uses the phone's existing camera/scanner; no camera permission is requested by Nook itself.
