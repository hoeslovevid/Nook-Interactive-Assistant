## Install Nook 0.7.0 on Windows

Download **Nook-Setup-0.7.0-x64.exe** below and follow the setup wizard. Windows 10 and 11 on 64-bit Intel/AMD PCs are supported, with the runtime included. Existing settings and provider credentials are retained.

Existing installations can use **Updates → Check for updates → Download update → Restart and install**. Public updates do not require a GitHub token. Versions 0.1.0–0.2.0 need one manual installer upgrade.

## New in 0.7.0

- **Hover dashboard:** choose focus, tasks, notifications, agents, music, services, and saved-prompt widgets. Failed services and requested reviews appear first when enabled. Approvals take priority; select between waiting requests without approving them.
- **Saved conversations:** named, searchable, pinned chats with Markdown export. Persistence is opt-in and uses system encryption, with 7/30/90-day retention. Files, images, and API keys are excluded. Limits: 100 conversations, 200 messages each, and an 8 MB archive budget.
- **Expandable chat:** open the same conversation in a resizable window and return to the notch when finished. Approval alerts remain in the notch while the separate chat window stays usable.
- **Multiple attachments:** attach up to six text/source files or PNG/JPEG images, inspect the included context, remove individual items, and see rough text-token estimates. Reopened chats can retry with attachments retained within the shared memory budget; files must be reattached after restart or eviction.
- **Saved prompts and model comparisons:** reusable prompts are reviewed before sending. Compare two provider/model pairs side by side, with a destination summary before two requests are sent. Comparisons do not replace your chat and support Stop with partial replies preserved.
- **Focus and notifications:** a timer with pause/resume and breaks, small task list, and notification inbox. Timer deadlines survive sleep/restart. Approval requests stay separately actionable.
- **More lifelike pets:** irregular blinks, glances, yawns, stretches, page turns, animated typing/terminal props, speaking reactions, calm/playful/focused personalities, intensity/speed/movement controls, and subtle stretches during long tasks. Reduced motion is retained.
- **Display layouts and fullscreen behavior:** remember notch width, horizontal placement, and widget selection per display. Missing monitors fall back to the normal monitor preference. Optional Windows fullscreen hiding and a pause control keep the notch out of the way.
- **Reviewed voice commands:** select Commands beside Hold to talk, review the transcription, then click Run. Open chat, requests, tasks, or notifications; control the focus timer; and mute/unmute. Voice commands cannot approve an agent or send an AI message.
- **Home dashboard and profiles:** session/request overview, model connection health, recent activity, usage, and named workspace profiles. Profiles keep provider keys and server addresses separate.
- **Interactive notch preview:** test idle, work, chat, approval, and music scenes; hover/click the pet; expand/collapse; play scenes; and preview appearance/wardrobe changes. Sample interactions never act on real requests.
- **Chat controls and guided model setup:** Stop, Retry, Regenerate, and Edit & resend, with partial replies retained. Guided key/connection setup, explicit local-server detection, favorite/recent models, and verified model capability badges.
- **Customization and search:** Ctrl+K command palette, reorderable/hideable activity cards, pinned services, larger text, high contrast, frosted surfaces when supported, and compact/spacious layouts.
- **Speech and performance:** hold-to-talk dictation with draft review, installed Windows voices, optional spoken replies, battery saver, visible CPU/memory/startup measurements, cached settings, and quieter background work.

Also fixes stale state updates overwriting newer chat results, attachment retry behavior across named conversations, notch sizing when widgets appear, detached chat sizing, fullscreen watcher shutdown races, and pet reaction timing when animation speed changes.

## Validation and platform notes

**144 automated tests** pass. Isolated Windows UI checks cover the new everyday tools, chat controls, model setup, interactive preview, themes, approval priority/selection, service widgets, and existing phone/service/sound workflows. Packaged startup, bundled hooks, resources, and native Windows integrations are checked separately. Provider/service tests use simulated responses without paid requests or external writes; voice-command review is tested without recording the user's microphone. Installer metadata, SHA-512 integrity, block map, and SHA-256 checksums are verified before publication.

The iPhone app, widgets, Live Activities, and relay are included as **source**, not an installable iPhone binary. Apple signing, provisioning, push credentials, relay deployment, and physical-device validation require owner setup. The Mac workflow checks simulator compilation and tests.

Windows installers remain unsigned. **SHA256SUMS.txt** verifies the installer; **latest.yml** and the **.blockmap** support verified in-app updates.
