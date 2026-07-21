import { NextResponse } from "next/server";

import { exchangeSoundCloudCodeForToken } from "@/lib/soundcloud-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = parseCookieHeader(cookieHeader);
  const expectedState = cookies.get("soundcloud_oauth_state");
  const codeVerifier = cookies.get("soundcloud_pkce_verifier");

  if (error) {
    return redirectWithStatus(url.origin, `SoundCloud authorization failed: ${error}`);
  }

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    return redirectWithStatus(url.origin, "SoundCloud authorization could not be verified.");
  }

  try {
    await exchangeSoundCloudCodeForToken({
      code,
      codeVerifier,
      origin: url.origin
    });

    const response = NextResponse.redirect(`${url.origin}/?soundcloud=connected`);
    clearOAuthCookies(response);
    return response;
  } catch (authError) {
    const message =
      authError instanceof Error ? authError.message : "SoundCloud authorization failed.";
    return redirectWithStatus(url.origin, message);
  }
}

function redirectWithStatus(origin: string, message: string) {
  const response = NextResponse.redirect(
    `${origin}/?soundcloud_error=${encodeURIComponent(message)}`
  );
  clearOAuthCookies(response);
  return response;
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set("soundcloud_oauth_state", "", { path: "/", maxAge: 0 });
  response.cookies.set("soundcloud_pkce_verifier", "", { path: "/", maxAge: 0 });
}

function parseCookieHeader(cookieHeader: string) {
  return new Map(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [name, ...valueParts] = cookie.split("=");
        return [name, decodeURIComponent(valueParts.join("="))] as const;
      })
  );
}
