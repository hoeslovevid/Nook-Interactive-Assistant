## Install Nook 0.5.0 on Windows

Download **Nook-Setup-0.5.0-x64.exe** from the assets below and follow the setup wizard. Supports Windows 10 and 11 on 64-bit Intel/AMD PCs. Nook includes its runtime; Node.js is not required. Existing settings and encrypted provider keys are retained.

For an existing installation, open **Updates**, check for the new version, download it, then choose **Restart and install**. Versions 0.1.0 and 0.2.0 require one manual upgrade using the installer. Uninstall through Windows Settings → Apps; saved settings are retained.

## New in 0.5.0

- **Public updates:** download releases and check for updates without a GitHub token. Optional saved tokens remain supported.
- **Black by default:** black app and notch surfaces, readable charcoal panels, and periwinkle accents. Original untouched notch colors upgrade to black; explicit themes and custom colors are preserved.
- **Pet branding:** Nook's actual notch companion silhouette, eyes, and smile replace the arch logo. Black-background icons cover the executable, installer/uninstaller, tray at three scales, app screens, browser/phone home screen, iPhone app and widget artwork, and recap exports.
- **Appearance controls:** Black, Graphite, Midnight, and Forest app themes; comfortable or compact spacing; a 520–820 px expanded notch width that fits the display; and Full, Economy, or Reduced companion motion. Windows reduced motion takes priority.
- **Guided AI connections:** provider key-page links, show/hide controls, encrypted local saving, and model-directory checks after saving. Errors explain missing keys, denied access, rate limits, and offline local servers. Checks do not generate a chat response or verify available credits.
- **Better model selection:** search live model lists in settings and switch models directly in notch chat. Known non-chat entries are filtered using IDs and supplied capabilities; manual IDs remain supported. Discovery does not guarantee every model supports all chat features or attachments.
- **Less background work:** hidden and offscreen companions stop drawing; Full caps companion drawing at 30 fps and Economy at 15 fps. Reduced uses still poses, and pointer tracking stops after the gaze settles.
- **Smoother chat and history:** unchanged transcript/provider controls retain their existing elements, each provider keeps a bounded conversation, and history recaps cache unchanged activity instead of rereading the lifetime log on each streamed response.
- **Reliable customization:** appearance changes are coalesced and saved when a control change finishes; unsaved edits survive unrelated background updates, and older theme requests cannot overwrite newer ones.
- New repository screenshots show the black app/notch, customization controls, and guided model setup.

Includes the task workbench, approvals and questions, animated wardrobe, multi-provider chat, Windows media controls, dictation, screenshot context, optional local phone access, encrypted history, and agent integrations from earlier releases.

## Verification and access

Validation: **80 automated tests**, isolated Windows UI checks for appearance persistence, notch sizing, hidden/reduced animation, key setup, model switching, transcript preservation, gaze settling, and existing workflows; packaged startup/resource/native-hook checks; and installer/update checksum verification. AI setup checks use simulated providers, with no paid chat requests.

This repository is public. Version 0.5.0 checks and downloads public releases without a GitHub account or token. Existing saved tokens remain optional; remove an expired one under **Updates → Optional GitHub access**. Older versions 0.2.1–0.4.0 can update with a valid saved token, or install this release manually once. Tokens remain encrypted on the PC and are never bundled or shared with phones.

Windows installers are unsigned and may show SmartScreen or unknown-publisher prompts. **SHA256SUMS.txt** provides download checksums; **latest.yml** and the **.blockmap** support verified in-app updates.

Native iPhone app, widgets, Live Activities, and the self-hosted push relay are included as **source**. Device signing, Apple push credentials, and relay deployment require owner setup. This release does not include an installable iPhone binary.
