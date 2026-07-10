import { NextRequest, NextResponse } from "next/server";

type Segment = { start?: number; end?: number; text: string };

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { sourceLanguage?: string; targetLanguage?: string; segments?: Segment[] } | null;
  const segments = body?.segments?.filter((item) => item.text?.trim()).slice(0, 24) ?? [];
  if (!segments.length) return NextResponse.json({ segments: [] });

  const endpoint = process.env.NLLW_TRANSLATE_URL;
  if (!endpoint) {
    return NextResponse.json({ error: "NLLW_TRANSLATE_URL is not configured", segments: [] }, { status: 501 });
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(process.env.NLLW_API_KEY ? { authorization: `Bearer ${process.env.NLLW_API_KEY}` } : {}) },
    body: JSON.stringify({
      sourceLanguage: body?.sourceLanguage ?? "auto",
      targetLanguage: body?.targetLanguage ?? "zho_Hans",
      segments,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return NextResponse.json({ error: `NLLW service failed: ${response.status}`, segments: [] }, { status: 502 });
  const payload = await response.json();
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
