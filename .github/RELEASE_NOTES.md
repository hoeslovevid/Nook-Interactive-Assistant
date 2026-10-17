## Install Nook 0.11.3

Download **Nook-Setup-0.11.3-x64.exe**, or open **Updates → Check for updates → Download update → Restart and install**. Existing settings and provider credentials are retained. Public updates do not require a GitHub token.

This is the first published installer in the 0.11 series. It includes the features below and verifies animated and reduced-motion behavior independently of the build machine’s Windows accessibility preferences. Desktop checks wait for the windows and their initial state to be ready instead of assuming a fixed startup delay. Motion checks also wait for the selected setting to appear in the rendered pose. Nook continues to respect your own motion settings.

## A more personal companion

- **A livelier pet:** 34 performances in the animation studio, flexible body motion, layered expressions, task props, gentle petting, and speech/microphone reactions. New parcel, reminder, conductor, blanket, sparkle and stretch performances use anticipation and settling. Hidden previews pause; reduced motion and battery settings remain available.
- **Make it your Nook:** 29 full costumes, independently selectable hats, face accessories and clothing, six skins, curated appearance collections, and reviewed import/export of color-and-costume packs.
- **A calmer notch:** stable hover controls, an activity queue, project switching, reviewed routine launchers, reminders and a file shelf. Typing, focus and pointer interactions survive background updates.
- **New gallery:** refreshed recordings of the actual app, new animations of the pet and workspace tools, and dark/light screenshots beside the relevant README sections. Recordings use isolated sample data and simulated services.

## Projects and everyday tools

- **Unified search · Ctrl+K** finds retained chats, imported/indexed sources, approved memories, current sessions, reminders, spaces and settings locally.
- **Project spaces** link conversations, sources, permitted memories and an optional preferred model. Switch with a review; return to the most recently selected conversation for each provider. Sources are attached explicitly and memory still respects each provider permission.
- **Reviewed routines** run up to six approved app, saved-profile and focus-timer steps in order. Failures, cancellation or locking stop later steps. Completed steps remain applied; arbitrary commands and scheduled execution are excluded.
- **Local reminders** support once, daily, weekdays, weekly, pause and snooze. Nook must be running; overdue occurrences are combined after resuming.
- **Grouped notifications** reduce repeated alerts, support project/agent snoozes and an optional quiet digest, and keep approvals separate.
- **File shelf** holds temporary snapshots and stores only explicitly pinned files encrypted. Preview, copy a path or attach a draft without automatically sending. Original files remain untouched.
- **Troubleshooting** shows sanitized model/voice failures, recovery links, connection checks and reviewed redacted exports.

## More choices for AI and voice

- **Nook Local** manages a verified llama.cpp runtime and downloadable Lite/Balanced models for on-device chat, optional local memory and idle unloading. Models require a separate download and sufficient RAM; unavailable local models never silently fall back to a cloud provider. See [Nook Local setup](https://github.com/hoeslovevid/Nook-Interactive-Assistant/blob/master/docs/NOOK-LOCAL.md).
- Dedicated **Qwen and Kimi/Moonshot** connections join the existing providers. Model selection adds task/cost recommendations, clearer key setup, provider-scoped approved memory and better reasoning/stream handling.
- Guided microphone/provider/voice setup, interruptible streamed assistant replies, optional sentence-by-sentence speech and optional ElevenLabs voices. Paid providers require their own API keys and may charge for requests.
- Optional encrypted contacts, approved application launchers, clipboard privacy controls, and expanded read-only portfolio integrations. Coinbase/Kraken permission checks reject trading/transfer access. Market and RPC data may be partial or approximate; no trading or transfers are performed.
- Everyday/All settings modes and an on-demand responsiveness check make configuration easier to navigate. Startup health and Stable/Beta recovery controls provide more useful recovery paths.

## Downloads and verification

Windows 10/11, Intel/AMD 64-bit. **Nook-Android-0.11.3-debug.apk** is an Android 11+ test build; a differently signed earlier debug build may require uninstalling and pairing again. Apple signing and physical-device validation remain owner setup tasks. Windows installers remain unsigned; the optional signed-build workflow requires the owner's certificate.

The release checks **296 automated tests**, isolated desktop interactions, Android compilation/lint, packaged Windows startup/native resources, and installer/update metadata integrity. AI, cloud speech, account services and microphone input use fixtures in automated desktop checks; these do not establish live-service or physical-device behavior. See [device testing](https://github.com/hoeslovevid/Nook-Interactive-Assistant/blob/master/docs/DEVICE-TESTING.md).

Installer **.blockmap**, **latest.yml**, and **SHA256SUMS.txt** accompany the downloads for updates and verification. Browse the [updated screenshot gallery](https://github.com/hoeslovevid/Nook-Interactive-Assistant#see-nook-in-motion).
