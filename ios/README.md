# Nook for iPhone — native source

SwiftUI iOS 18 app with paired local agent sessions, diffs, answers, follow-up drafts, service details, shared history search, notification actions, device authentication before Allow, home-screen widgets, a Live Activity and Dynamic Island, and Siri shortcuts. It has its own Nook artwork. API keys stay on the PC.

## Build on a Mac

1. Install Xcode 16 or newer and XcodeGen (`brew install xcodegen`).
2. From `ios/`, run `xcodegen generate`, then open `NookPhone.xcodeproj`. Select the NookPhone scheme.
3. For an unsigned simulator check: `xcodebuild -project NookPhone.xcodeproj -scheme NookPhone -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`.
4. To run on a physical iPhone, select your Apple developer team in Xcode. Change bundle identifiers and `group.com.nook.phone` everywhere to identifiers registered to your team. Enable Push Notifications and App Groups on the app, and App Groups on its widget extension. Keep the group identifier identical in `NookShared.swift` and both entitlements.
5. Pair using the PC address and six-digit code from Nook's Companion & devices page. Enable session details for diffs and history, and enable history recording in Workspace & alerts for completed session archives. Enable follow-up drafts separately.
6. Configure the optional [Apple push relay](../push-relay/README.md) to receive background alerts and Live Activity updates. Start an activity manually, or opt into Automatic Lock Screen handoff. The app registers both push-to-start and activity-update tokens. The relay can start, update, and end activities while the app is in the background; Apple controls delivery. Apple signing, provisioning, APNs credentials, and relay deployment are required for real-device push testing.

The desktop uses port 45821. Its local listener remains off until enabled; optionally select Start phone access with Nook to preserve access across restarts. Pairing credentials expire after 24 hours or when revoked. Reconnect on trusted Wi-Fi to review and act. Native notifications and Live Activity links open the app; they do not bypass authentication or stale-request checks. Widgets and Siri status use the last cached status and show its age.

The app rejects non-local PC addresses. Local HTTP is explicitly allowed for the paired LAN endpoint; use trusted Wi-Fi. The Apple push relay is HTTPS and carries only status metadata. There is no CloudKit dependency or internet approval tunnel. Biometric authentication can fall back to the iPhone passcode, as selected by the system.

The source was authored on Windows. Apple builds and physical-device behavior must be verified on a Mac before distributing it. The repository includes a macOS workflow for an unsigned simulator build and XCTest checks for Spotlight identifiers and phone-state compatibility. Generated Xcode projects and local signing files are ignored.

## Search, Focus, and handoff

Enable Spotlight search in the phone’s Settings tab to index names and project metadata on this device. PC detail sharing must be on. Code, commands, final answers, and pairing tokens are excluded. Entries expire after a day and are cleared on disconnect or when search/sharing is disabled. Spotlight links open a session for inspection; they never perform an approval. History metadata refreshes in the background at most once a minute so a slow archive request does not delay the approval poll.

In iPhone Settings → Focus → Add Filter, choose Nook’s **Waiting approvals** filter. It filters the Agents view independently of the manual requests-only toggle. Session rows support Pin/Unpin by swipe or context menu, plus Open and Copy name. History offers Open and Copy summary. Settings includes Dark, Light, and iPhone-setting appearance.

**Automatic Lock Screen handoff** is off by default. With a configured APNs relay, push-to-start tokens permit an activity to start while the app is in the background. Routine starts wait for twenty seconds of PC lock; waiting approvals start immediately, subject to desktop quiet hours, muting, and approval alert settings. Unlocking receives a thirty-second grace period. Test real device behavior with a signed build and the correct sandbox/production APNs environment; the Windows tests cover the timing and relay protocol, not Apple’s delivery behavior.
