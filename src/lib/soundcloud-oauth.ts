import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type SoundCloudToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  expires_at?: number;
};

const tokenPath = path.join(process.cwd(), ".local", "soundcloud-token.json");
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function getSoundCloudClientConfig(origin: string) {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;
  const redirectUri =
    process.env.SOUNDCLOUD_REDIRECT_URI ?? `${origin}/api/soundcloud/auth/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret)
  };
}

export async function readStoredSoundCloudToken() {
  try {
    const rawToken = await readFile(tokenPath, "utf8");
    return JSON.parse(rawToken) as SoundCloudToken;
  } catch {
    return null;
  }
}

export async function writeStoredSoundCloudToken(token: SoundCloudToken) {
  const tokenWithExpiry = {
    ...token,
    expires_at: token.expires_in ? Date.now() + token.expires_in * 1000 : token.expires_at
  };

  await mkdir(path.dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, JSON.stringify(tokenWithExpiry, null, 2), "utf8");

  return tokenWithExpiry;
}

export async function clearStoredSoundCloudToken() {
  try {
    await unlink(tokenPath);
  } catch {
    // Token file may not exist yet.
  }
}

export async function getUsableSoundCloudAccessToken(origin: string) {
  const envToken = process.env.SOUNDCLOUD_ACCESS_TOKEN;

  if (envToken) {
    return envToken;
  }

  const storedToken = await readStoredSoundCloudToken();

  if (!storedToken?.access_token) {
    return null;
  }

  if (!storedToken.expires_at || storedToken.expires_at - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
    return storedToken.access_token;
  }

  if (!storedToken.refresh_token) {
    return null;
  }

  const refreshedToken = await refreshSoundCloudToken(origin, storedToken.refresh_token);
  return refreshedToken.access_token;
}

export async function exchangeSoundCloudCodeForToken({
  code,
  codeVerifier,
  origin
}: {
  code: string;
  codeVerifier: string;
  origin: string;
}) {
  const { clientId, clientSecret, redirectUri, isConfigured } = getSoundCloudClientConfig(origin);

  if (!isConfigured || !clientId || !clientSecret) {
    throw new Error("SoundCloud OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    code
  });

  const token = await requestSoundCloudToken(body);
  return writeStoredSoundCloudToken(token);
}

async function refreshSoundCloudToken(origin: string, refreshToken: string) {
  const { clientId, clientSecret, isConfigured } = getSoundCloudClientConfig(origin);

  if (!isConfigured || !clientId || !clientSecret) {
    throw new Error("SoundCloud OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  });

  const token = await requestSoundCloudToken(body);
  return writeStoredSoundCloudToken(token);
}

async function requestSoundCloudToken(body: URLSearchParams) {
  const response = await fetch("https://secure.soundcloud.com/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json; charset=utf-8",
      "content-type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`SoundCloud token request failed with HTTP ${response.status}: ${details}`);
  }

  return (await response.json()) as SoundCloudToken;
}
