# Optional Android remote relay

Nook works directly on local Wi-Fi without this service. This optional, single-PC relay lets the paired Android companion reach a running PC on another network. The iPhone source and browser phone page do not use this transport.

1. Install Node.js 22 or later on your relay host. Generate a random desktop key, for example `node -p "require('node:crypto').randomBytes(32).toString('hex')"`.
2. Set `NOOK_RELAY_DESKTOP_KEY` to that key and run `node relay/server.cjs`. The listener binds to `127.0.0.1:45900`; `PORT` can change the port.
3. Put an HTTPS reverse proxy in front of it. Forward POST requests and allow bodies up to 3 MB. Keep the loopback listener private. Disable request-body and Authorization-header logging. Use a trusted TLS certificate; redirects are rejected by the clients.
4. In **Companion & devices → Away from home**, enter the HTTPS origin and desktop key, enable the relay, and save. Enable normal phone access too.
5. Pair the Android app on local Wi-Fi. If it was already paired, choose **Refresh remote configuration on Wi-Fi** there. Connection details shows whether the last request used Wi-Fi or the encrypted relay.

The PC polls outbound; it does not open a public incoming port. Each phone has a separate relay capability. AES-256-GCM protects request and reply contents using keys derived from the locally paired session token, with different keys for each direction and the request ID as authenticated data. The relay does not receive the session token. The operator can observe timing and encrypted payload sizes, delay traffic, or deny service. Protect the desktop key as a server credential.

Queues are held in memory, limited to eight requests per phone, and expire after 150 seconds. Decrypted requests must be fresh within two minutes. Requests are delivered once; ambiguous network failures are not retried as actions. Review the latest PC state before submitting again. The PC reuses its existing route validation and checks the exact pending approval ID. Biometric approval remains in the Android app.

Access expires after 24 hours and is revoked by PC phone-access restart, device revocation, or certificate re-pairing. Reconnect locally to pair again. Turning off the relay stops remote processing; turning off phone access also revokes the phone tokens. Stopping this relay process discards queued requests. Nook does not deploy or pay for hosting automatically.

The optional Android background reconnect job requests a check about every 15 minutes. Android can defer jobs while idle. The foreground activity island uses its existing user-enabled foreground service instead.
