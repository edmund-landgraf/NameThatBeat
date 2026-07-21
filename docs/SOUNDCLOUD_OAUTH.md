# SoundCloud OAuth

SoundCloud API requests require an authenticated application. NameThatBeat supports two local development modes:

- user login through SoundCloud OAuth Authorization Code with PKCE
- optional server token through `SOUNDCLOUD_ACCESS_TOKEN`

The user login path is preferred for testing live SoundCloud search from the web app.

## Required App Settings

Create or use a SoundCloud developer app and configure:

```text
SOUNDCLOUD_CLIENT_ID=...
SOUNDCLOUD_CLIENT_SECRET=...
SOUNDCLOUD_REDIRECT_URI=http://127.0.0.1:3000/api/soundcloud/auth/callback
```

The redirect URI in SoundCloud must exactly match the value used by the dev server.

## Local Flow

1. Start the Next.js app.
2. Open `http://127.0.0.1:3000/`.
3. Click `Connect SoundCloud`.
4. SoundCloud redirects back to `/api/soundcloud/auth/callback`.
5. The server exchanges the authorization code with `code_verifier`.
6. The token is stored locally under `.local/soundcloud-token.json`.
7. Track selection calls reuse the stored token.

The `.local` directory is git-ignored.

## API Routes

```text
GET  /api/soundcloud/auth/start
GET  /api/soundcloud/auth/callback
GET  /api/soundcloud/auth/status
POST /api/soundcloud/auth/disconnect
GET  /api/soundcloud/select?q=piano%20jazz&count=10&limit=50
```

## Token Refresh

SoundCloud access tokens expire. The local token helper refreshes the stored token when a refresh token is available and the access token is near expiry.

For production, replace local file storage with per-user encrypted token storage.
