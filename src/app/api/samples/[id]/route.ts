import { NextResponse } from "next/server";

import { getSample } from "@/lib/samples/store";

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

  return NextResponse.json({ sample });
}
