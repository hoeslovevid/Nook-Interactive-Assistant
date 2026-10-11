## Install Nook 0.6.0 on Windows

Download **Nook-Setup-0.6.0-x64.exe** below and follow the setup wizard. Nook supports Windows 10 and 11 on 64-bit Intel/AMD PCs and includes its runtime. Existing settings and provider credentials are retained.

Existing installations can use **Updates → Check for updates → Download update → Restart and install**. Public updates do not require a GitHub token. Older versions 0.1.0–0.2.0 need one manual installer upgrade.

## New in 0.6.0

- **Seven themes:** Black, Graphite, Midnight, and Forest, plus Pearl, Sand, and Mint. App and notch palettes stay in sync; custom colors and reduced-motion settings are retained.
- **Richer chat:** Markdown lists, quotes, headings, safe links, and code blocks with copy controls. Select messages to continue with another provider, with an undo option before the next send.
- **Usage dashboard:** clickable Claude/Codex plan cards, session and weekly rings, reset countdowns, and near-limit warnings. These are agent-reported limits, rather than API billing totals; unavailable data is shown honestly.
- **Multilingual dictation:** choose a speech language in settings or from the microphone menu. Windows lists installed recognizers; OpenAI mode uses the selected language with your saved key. Review dictated text before sending.
- **Live wardrobe previews:** hover or focus an outfit to preview it across the app, notch, and desktop pet. New original summer visor, moon wizard, and holiday outfits join the existing wardrobe. Previews never overwrite the saved outfit.
- **Animated service companions:** distinct mini-pets for all seven integrations, with expressions for healthy connections, waiting reviews, and failures.
- **More service actions:** review GitHub PRs, cancel queued/running Vercel builds, and retry failed n8n executions. Actions require PC confirmation, expire, cannot replay, and re-check the current item before writing. PR reviews bind to the inspected commit; workflow retries explain possible repeated effects.
- **Custom-agent wizard:** choose a name and pet color, map JSON event fields, test a sample, and export a hook profile and command. Activity-only adapters leave permissions with the original agent.
- **Sound studio:** per-event sound toggles, adjustable volume, preview/stop controls, and custom audio imports.
- **Localization:** automatic OS language, ten interface languages, Arabic right-to-left layout, and translated menus. Model IDs, code, and credentials retain their original text.
- **Credential storage:** Windows Credential Manager with verified migration and encrypted recovery for existing credentials. Secrets stay outside renderer state.
- **Precise terminal focus:** bundled VS Code/Cursor helper for linked terminals, named Windows Terminal tabs, and a modern Windows process fallback.
- **iPhone source:** Spotlight session/history metadata, Focus filters for waiting approvals, pinning, swipe/context actions, and light/dark/system appearance.
- **Automatic Lock Screen handoff:** opt-in push-to-start Live Activities, a twenty-second routine lock delay, immediate waiting-request handoff, and a thirty-second unlock grace period. Starts respect quiet hours and muted agents.
- **Refreshed demonstrations:** updated animated app/notch previews plus new theme, usage, chat handoff, service-companion, sound-studio, and custom-agent clips, recorded with isolated sample data.

Also fixes low percentages being misread as full usage, system-language RTL resets, preview cleanup, and notch sizing/keyboard handling while dialogs are open.

## Validation and platform notes

**114 automated tests** pass. Isolated Windows UI checks cover themes, chat formatting/handoff, service cards, sound controls, languages, live wardrobe previews, custom-agent export, approvals, history, and model selection. Packaged startup, runtime resources, native media, and bundled hooks are checked separately. The installer, updater metadata, block map, and checksums are verified before publication. Provider and service-action tests use simulated responses without paid requests or external writes.

The native iPhone app, widgets, Live Activities, and relay are included as **source**, not an installable iPhone binary. Apple signing, provisioning, push credentials, relay deployment, and physical-device validation require owner setup. The repository's Mac workflow checks simulator compilation and the Spotlight/state compatibility tests.

Windows installers remain unsigned and may show an unknown-publisher prompt. Use **SHA256SUMS.txt** to verify the installer; **latest.yml** and the **.blockmap** support verified in-app updates.
