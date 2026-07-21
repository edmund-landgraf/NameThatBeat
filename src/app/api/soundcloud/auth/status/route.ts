import { NextResponse } from "next/server";

import { getSoundCloudClientConfig, readStoredSoundCloudToken } from "@/lib/soundcloud-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const { isConfigured, redirectUri } = getSoundCloudClientConfig(origin);
  const storedToken = await readStoredSoundCloudToken();

  return NextResponse.json({
    configured: isConfigured,
    connected: Boolean(process.env.SOUNDCLOUD_ACCESS_TOKEN || storedToken?.access_token),
    usingEnvToken: Boolean(process.env.SOUNDCLOUD_ACCESS_TOKEN),
    redirectUri,
    expiresAt: storedToken?.expires_at ?? null
  });
}
