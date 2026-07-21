import { createHash, randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { getSoundCloudClientConfig } from "@/lib/soundcloud-oauth";

export const runtime = "nodejs";

function base64Url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const { clientId, redirectUri, isConfigured } = getSoundCloudClientConfig(origin);

  if (!isConfigured || !clientId) {
    return NextResponse.json(
      {
        error:
          "Missing SOUNDCLOUD_CLIENT_ID or SOUNDCLOUD_CLIENT_SECRET. Register a SoundCloud app and configure both values."
      },
      { status: 503 }
    );
  }

  const codeVerifier = base64Url(randomBytes(64));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  const state = base64Url(randomBytes(32));
  const authorizeUrl = new URL("https://secure.soundcloud.com/authorize");

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);

  response.cookies.set("soundcloud_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 10 * 60
  });
  response.cookies.set("soundcloud_pkce_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 10 * 60
  });

  return response;
}
