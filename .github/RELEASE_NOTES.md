## Install Nook 0.10.1 on Windows

Download **Nook-Setup-0.10.1-x64.exe**, or use **Updates → Check for updates → Download update → Restart and install** in Nook. Existing settings and provider credentials are retained. Public updates do not need a GitHub token.

## Fixed in 0.10.1

- **The notch stays open when you return to it.** Moving off the notch and back before its close delay expired left an old timer running. It could collapse the notch underneath your pointer and make it appear to refresh repeatedly. Re-entry now cancels that timer; leaving normally still closes the notch.
- **Background updates preserve your controls.** Music playback and agent updates rebuilt the hover dashboard, replacing buttons while they were being pressed or focused. Widgets now retain their identity and update their text, counts, and status in place. Playback position and unrelated agent progress no longer rebuild the dashboard or restart its companion animations.
- **Regression checks before release.** A new desktop check verifies hover re-entry, normal collapse, keyboard focus, real pointer clicks across background updates, retained chat drafts/selections, stable window bounds, and no renderer reloads. It runs in both release and desktop-quality workflows.

## Downloads and verification

The Windows installer supports Windows 10 and 11 on 64-bit Intel/AMD PCs. **Nook-Android-0.10.1-debug.apk** is an Android 11+ test build; a differently signed previous debug build may require uninstalling and pairing again. Windows installers remain unsigned.

The 219 automated tests and isolated desktop checks use simulated provider responses rather than paid AI calls. Release publication requires Android compilation/lint, notch stability checks, the broader desktop interaction checks, packaged Windows smoke checks, and installer/update checksum verification. Physical-device and upgrade/recovery validation remain documented in [DEVICE-TESTING.md](https://github.com/hoeslovevid/Nook-Interactive-Assistant/blob/master/docs/DEVICE-TESTING.md).

Installer **.blockmap**, **latest.yml**, and **SHA256SUMS.txt** are included for in-app updates and download verification.
