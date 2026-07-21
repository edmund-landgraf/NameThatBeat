import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getSample, getSampleAudioPath, sampleAudioExists } from "@/lib/samples/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const sample = await getSample(id);

  if (!sample) {
    return NextResponse.json({ error: "Sample not found." }, { status: 404 });
  }

  if (!(await sampleAudioExists(sample))) {
    return NextResponse.json({ error: "Audio file missing." }, { status: 404 });
  }

  const bytes = await readFile(getSampleAudioPath(sample));

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": sample.mimeType || "audio/mpeg",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${sample.originalFilename.replace(/"/g, "")}"`
    }
  });
}
