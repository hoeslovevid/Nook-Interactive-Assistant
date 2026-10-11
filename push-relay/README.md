# Nook Apple push relay

This optional Node.js 22+ service sends generic notification alerts and starts, updates, and ends Nook Live Activities through APNs. It receives only agent names, statuses, opaque request IDs, and Apple push tokens. It does not route approval responses, session content, or provider credentials. No payload or token is logged or persisted by this relay.

1. Configure Apple Push Notifications for the signed Nook iPhone app. Create an APNs signing key and keep the `.p8` file on your own server.
2. Generate a strong shared token: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. Set the environment variables shown in `.env.example`, using your Apple team, key, bundle ID, and signing key path. Development builds use `APNS_ENV=sandbox`; distribution builds use `production`.
4. Run `node push-relay/server.cjs`. It binds localhost only. Use your own HTTPS reverse proxy and domain; Nook accepts HTTPS relay addresses only. Set a 16 KB request body limit and a 70-second proxy timeout. The authenticated endpoint is `POST /notify`; `/healthz` is a generic health check.
5. In Nook → Workspace & alerts, save the relay HTTPS address and shared token, then enable phone push updates. The token and registered phone tokens are encrypted by Windows on the PC.
6. Pair the iPhone app with the local desktop endpoint, enable notifications, then choose manual Live Activities or **Automatic Lock Screen handoff** in its Settings tab. The app registers ActivityKit push-to-start and update tokens with the PC. Automatic handoff starts after 20 seconds of PC lock while an agent is working, or immediately for a waiting request. Unlock and quiet transitions receive a 30-second grace period. Quiet hours, muted agents, and approval alert preferences suppress automatic starts. iOS controls permission and update budgets and may delay or throttle delivery.

Notifications can arrive away from the PC. Reading session details or acting on a request still requires the same trusted local network. There is no internet approval tunnel. Each notification opens the native app, which rechecks the request against the PC and authenticates Allow. The iPhone app stores pairing in Keychain and widgets store only the last status snapshot. Quiet hours and muted agents suppress push alerts, while the Live Activity can continue receiving status updates.

The desktop coalesces updates, never retries a service action automatically, and prunes invalid APNs tokens. Revoke native devices in desktop settings to stop delivery. Disabling phone access or rotating the pairing code revokes native devices as well. Re-enabling notifications after revocation requires registration from the paired native app again.

Deployment and Apple signing are intentionally left to the app owner. No Apple key, access token, cloud account, firewall rule, or hosted service is created by this repository.
