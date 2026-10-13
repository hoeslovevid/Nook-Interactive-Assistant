## Install Nook 0.7.2 on Windows

Download **Nook-Setup-0.7.2-x64.exe** below and follow the setup wizard. Existing settings and provider credentials are retained. Windows 10 and 11 on 64-bit Intel/AMD PCs are supported.

Existing installations can use **Updates → Check for updates → Download update → Restart and install**. Public updates do not require a GitHub token. Versions 0.1.0–0.2.0 need one manual installer upgrade.

## Fixed in 0.7.2

- **Clear API errors:** Nook no longer discards the provider's error code and displays only “returned 429.” Known credit-balance, quota, project/organization spending, usage-limit, authentication, model-access, and temporary rate-limit failures now have specific recovery guidance. A 429 without sufficient provider details remains explicitly ambiguous.
- **Account shortcuts:** OpenAI API failures offer the relevant billing, usage-limit, or project-settings link, alongside Models & connections. Recovery controls work in compact notch chat and the expanded window, and scroll into view when needed.
- **Respectful retries:** when a provider supplies Retry-After, Nook shows a countdown and prevents requests to that provider until the delay expires. Other providers remain available. Existing conversation turns are retained during cooldown, and retries replace the failed turn without duplication. No automatic chat retries are made.
- **Safer diagnostics:** error bodies are read within a 64 KB limit. Provider messages that could echo keys, private prompts, or account identifiers are excluded. Known errors inside streamed responses use the same recovery guidance.
- **Provider switching:** changing providers clears the previous provider's recovery message and actions.

Credit, billing, or quota failures require changes to the relevant API account; repeatedly retrying cannot restore API credits. API access is separate from chat website subscriptions.

## Validation and platform notes

**154 automated tests** pass, including quota classification, rate limits, cooldowns, bounded error parsing, streamed errors, and credential/privacy checks. Isolated desktop checks cover recovery controls in both chat windows, streamed replies through a local HTTP server, keyboard input, and synthetic dictation. Packaged startup, native integrations, resources, and bundled hooks also pass. These checks use fake credentials and responses, with no paid AI requests or recording of the user's microphone.

Installer update metadata, SHA-512 integrity, block map, and SHA-256 checksums are verified before publication. **SHA256SUMS.txt**, **latest.yml**, and the **.blockmap** are included for installer verification and in-app updates. Windows installers remain unsigned.

The iPhone app, widgets, Live Activities, and relay remain available as source. Apple signing, provisioning, push credentials, relay deployment, and physical-device validation require owner setup; the Mac workflow checks simulator compilation and tests.
