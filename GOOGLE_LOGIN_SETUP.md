# Google login — deferred

The owner chose temporary email/password login for the real workspace instead. Google credentials are not required for the current cloud deployment. Keep the following setup only for a future Google sign-in upgrade.

# Native Google login for TailorPitch

The public app will run on the Cloud Computer. It will use its own Google login, not the Manus sign-in screen. Your existing Proof workspace and approved `leonsbox@gmail.com` access will be preserved.

## One-time owner setup

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview). Select an existing Google Cloud project or create one named **TailorPitch**.
2. In **Branding**, set the application name to **TailorPitch**, provide your support/developer email, and use these public URLs:
   - Homepage: `https://tailorpitch.com/`
   - Privacy: `https://tailorpitch.com/privacy`
   - Authorized domain: `tailorpitch.com`
3. In **Audience**, choose **External** if people outside your Google Workspace will log in. While in Testing, add `leonsbox@gmail.com` as a test user. Add `hello@reqproof.com` only if it is a Google account you will use to sign in.
4. In **Data Access**, configure only the basic OpenID scopes: `openid`, `email`, and `profile`. Dashboard login does **not** need Gmail, Drive, Calendar or LinkedIn permissions.
5. In **Clients**, create a **Web application** client named **TailorPitch web login**.
6. Set the authorized redirect URI exactly to:

   ```text
   https://tailorpitch.com/api/auth/google/callback
   ```

   If Google asks for an authorized JavaScript origin, use `https://tailorpitch.com`. This login uses the server-side authorization-code flow; do not add the Cloud Computer's raw IP as a redirect URI. The `www` host will redirect to the apex host before login.
7. Google displays a **Client ID** and **Client secret**. Enter them in the protected credential card, under `TAILORPITCH_GOOGLE_CLIENT_ID` and `TAILORPITCH_GOOGLE_CLIENT_SECRET`. **Do not paste the secret into chat.** Keep a copy in your own secure credential manager; Google may show the secret only once.

If you already have a Google web OAuth client that you own, you can add this exact callback URI to it and use its ID/secret instead. Do not use a mobile or desktop OAuth client.

## What the backend will do

- Redirect to Google's account picker, then back to the configured callback.
- Verify state, a browser-bound one-time authorization session, PKCE, nonce, issuer, audience, expiry and Google's signed ID token.
- Persist the Google subject identifier separately from the existing user ID, preserving current company memberships. Only explicitly approved existing owner accounts may be migrated through verified authoritative Google email matching; unrelated accounts cannot claim existing users merely by supplying an email.
- Create an HttpOnly application session after successful login. Google tokens are not used as browser session storage or exposed to client code.
- Display a clear access error for accounts without workspace membership.
- Keep Gmail authorization separate from dashboard authentication.

## Current deployment

Public traffic is now on the Cloud Computer with temporary owner email/password login. Google setup remains optional for a future upgrade; no Google credential is needed now.

## Official setup documentation

- [Google: OAuth for web-server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google: OpenID Connect and ID-token validation](https://developers.google.com/identity/openid-connect/openid-connect)
