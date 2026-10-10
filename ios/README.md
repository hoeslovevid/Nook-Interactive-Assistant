# Nook for iPhone — native source

SwiftUI iOS 18 app with paired local agent sessions, diffs, answers, follow-up drafts, service details, shared history search, notification actions, device authentication before Allow, home-screen widgets, a Live Activity and Dynamic Island, and Siri shortcuts. It has its own Nook artwork. API keys stay on the PC.

## Build on a Mac

1. Install Xcode 16 or newer and XcodeGen (`brew install xcodegen`).
2. From `ios/`, run `xcodegen generate`, then open `NookPhone.xcodeproj`. Select the NookPhone scheme.
3. For an unsigned simulator check: `xcodebuild -project NookPhone.xcodeproj -scheme NookPhone -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`.
4. To run on a physical iPhone, select your Apple developer team in Xcode. Change bundle identifiers and `group.com.nook.phone` everywhere to identifiers registered to your team. Enable Push Notifications and App Groups on the app, and App Groups on its widget extension. Keep the group identifier identical in `NookShared.swift` and both entitlements.
5. Pair using the PC address and six-digit code from Nook's Companion & devices page. Enable session details for diffs and history, and enable history recording in Workspace & alerts for completed session archives. Enable follow-up drafts separately.
6. Configure the optional [Apple push relay](../push-relay/README.md) to receive background alerts and Live Activity updates. Start the activity once from the iPhone app. Apple signing, provisioning, APNs credentials, and relay deployment are required for real-device push testing.

The desktop uses port 45821. Its local listener remains off until enabled; optionally select Start phone access with Nook to preserve access across restarts. Pairing credentials expire after 24 hours or when revoked. Reconnect on trusted Wi-Fi to review and act. Native notifications and Live Activity links open the app; they do not bypass authentication or stale-request checks. Widgets and Siri status use the last cached status and show its age.

The app rejects non-local PC addresses. Local HTTP is explicitly allowed for the paired LAN endpoint; use trusted Wi-Fi. The Apple push relay is HTTPS and carries only status metadata. There is no CloudKit dependency or internet approval tunnel. Biometric authentication can fall back to the iPhone passcode, as selected by the system.

The source was authored on Windows. Apple builds and physical-device behavior must be verified on a Mac before distributing it. The repository includes a macOS workflow for an unsigned simulator build. Generated Xcode projects and local signing files are ignored.
