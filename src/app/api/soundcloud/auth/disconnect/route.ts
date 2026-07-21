import { NextResponse } from "next/server";

import { clearStoredSoundCloudToken } from "@/lib/soundcloud-oauth";

export const runtime = "nodejs";

export async function POST() {
  await clearStoredSoundCloudToken();
  return NextResponse.json({ connected: Boolean(process.env.SOUNDCLOUD_ACCESS_TOKEN) });
}
