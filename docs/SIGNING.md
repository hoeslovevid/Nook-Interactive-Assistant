# Signed installers and release channels

Normal GitHub releases remain unsigned until an owner supplies signing credentials. Nook cannot generate a trusted Windows publisher certificate or a production Android identity on the owner's behalf. Existing development APKs are explicitly labeled debug.

## Windows

Use the manual **Signed Windows installer** workflow after configuring repository secrets `NOOK_WINDOWS_CERTIFICATE` (a base64-encoded PFX accepted by electron-builder) and `NOOK_WINDOWS_CERTIFICATE_PASSWORD`. Enter the exact certificate publisher name when dispatching. The workflow requires code signing, validates Authenticode signatures on both the application and installer against the exact requested publisher, and runs the personal-workspace interaction checks. Update signature verification is configured for that publisher. Keep the certificate and password outside Git. It uploads a build artifact for review; it does not replace public releases automatically.

When adopting signed releases, review the publisher identity, test an upgrade from the currently unsigned installer, and arrange a manual installer transition if Windows or the updater requires one. Keep the same publisher identity for future updates. Do not claim the normal unsigned release workflow has become signed merely because the manual workflow exists.

## Android

The existing **Signed Android companion** workflow uses one owner-managed production keystore. Configure `NOOK_ANDROID_KEYSTORE_BASE64`, `NOOK_ANDROID_STORE_PASSWORD`, `NOOK_ANDROID_KEY_ALIAS`, and `NOOK_ANDROID_KEY_PASSWORD`. Back up the keystore securely and reuse it; differently signed debug APKs require uninstalling before switching to production.

## Stable and beta

Stable is the default. Preview tags and package versions must match `vX.Y.Z-beta.N` and `X.Y.Z-beta.N`. The release workflow publishes them as prereleases with `beta.yml` and never marks them latest. Stable builds publish `latest.yml`. Release gates run for both channels. The app allows beta only through an explicit channel choice and keeps automatic downgrades disabled. Switching back to Stable waits for a newer stable version; manually install a known stable release when recovery is needed.

## Recovery checks

Before testing a beta, create an encrypted backup in Library & tools and keep its password separately. A local startup marker records whether the previous run ended cleanly; a warning is evidence of an interrupted session, not proof that a release is broken. Recovery links open release downloads. No installer is silently rolled back, no app data is deleted, and failed checksums never become installable downloads.
