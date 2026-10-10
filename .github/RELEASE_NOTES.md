## Install Nook on Windows

Download **Nook-Setup-0.2.0-x64.exe** from the assets below, run it, and follow the setup wizard. Requires Windows 10 or 11, 64-bit Intel/AMD. Nook includes its desktop runtime; Node.js is not required to install or use it.

The installer adds Start menu and desktop shortcuts. **Users on 0.1.0: quit Nook and install this release once manually.** From 0.2.0 onward, Nook checks GitHub automatically and lets you download and restart from the Updates page. Your settings and encrypted provider keys stay on this PC. Uninstall through Windows Settings → Apps; saved settings are retained.

This release is unsigned. Windows may display an unknown-publisher or SmartScreen warning. A signing certificate is not yet configured. SHA256SUMS.txt provides download checksums.

Includes the animated notch and companion, wardrobe, multi-provider AI chat, modern settings and shortcuts, Windows media controls, dictation, screenshot context, and the local phone companion. Cloud chat requires your provider API key; local models require a running local server. Phone access is opt-in and works on trusted local Wi-Fi while Nook is running.

## New in 0.2.0

- Automatic stable-release checks at startup and every six hours, download progress, and a user-controlled restart. No silent download or restart.
- Animated recordings in the repository README.
- Pet wardrobe and shortcuts on right-click, double-click home, hover hearts, agent colors, smoother movement, and lighter idle animation.
- Drag the desktop pet onto a window to review a screenshot in chat before sending.
- Seven-step offline walkthrough with sample sessions, diffs, approvals, questions, chat, and service cards.
- Opt-in phone timelines, bounded diffs, completed answers, service summaries, and an approval focus filter.
- Phone follow-up drafts arrive in the PC inbox for review, copy, and terminal handoff; they never run automatically.
- Shuffle and repeat controls for compatible Windows media players.

`latest.yml` and the `.blockmap` asset support in-app updates; download the `.exe` to install manually. Local phone access uses trusted Wi-Fi and does not provide native iPhone Live Activities or an internet relay.
