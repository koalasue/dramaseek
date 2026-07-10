import { NextRequest, NextResponse } from "next/server";

type Segment = { start?: number; end?: number; text: string };
type TranslateBody = { sourceLanguage?: string; targetLanguage?: string; segments?: Segment[] };
type TranslatedSegment = Segment & { translatedText: string; language?: string };

export const dynamic = "force-dynamic";

function normalizeSegments(body: TranslateBody | null) {
  return body?.segments?.filter((item) => item.text?.trim()).slice(0, 24) ?? [];
}

function jsonResponse(segments: TranslatedSegment[], provider: string) {
  return NextResponse.json({ provider, segments }, { headers: { "Cache-Control": "no-store" } });
}

async function translateWithNllw(body: TranslateBody, segments: Segment[]) {
  const endpoint = process.env.NLLW_TRANSLATE_URL;
  if (!endpoint) return null;

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
  if (!response.ok) throw new Error(`NLLW service failed: ${response.status}`);
  const payload = await response.json();
  const translated = Array.isArray(payload?.segments) ? payload.segments : [];
  return translated.map((item: { translatedText?: string; translated_text?: string; text?: string; language?: string }, index: number) => ({
    ...segments[index],
    translatedText: item.translatedText ?? item.translated_text ?? item.text ?? segments[index]?.text ?? "",
    language: item.language ?? body.sourceLanguage ?? "auto",
  })) as TranslatedSegment[];
}

function extractJsonObject(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? value;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw;
}

async function translateWithOpenAI(body: TranslateBody, segments: Segment[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_TRANSLATE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You translate burned-in English short-drama subtitles into natural Simplified Chinese.",
            "Return JSON only: {\"segments\":[{\"translatedText\":\"...\",\"language\":\"eng_Latn\"}]}",
            "Keep names, relationship terms, and dramatic tone natural for Chinese subtitles.",
            "Do not explain. Do not add extra segments. Preserve the input order.",
            "If the text is already Chinese, return it unchanged.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            sourceLanguage: body.sourceLanguage ?? "auto",
            targetLanguage: body.targetLanguage ?? "zho_Hans",
            segments: segments.map((segment, index) => ({ index, text: segment.text })),
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`OpenAI translation failed: ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(extractJsonObject(content)) as { segments?: Array<{ translatedText?: string; text?: string; language?: string }> };
  const translated = parsed.segments ?? [];
  return segments.map((segment, index) => ({
    ...segment,
    translatedText: translated[index]?.translatedText ?? translated[index]?.text ?? segment.text,
    language: translated[index]?.language ?? body.sourceLanguage ?? "auto",
  })) satisfies TranslatedSegment[];
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as TranslateBody | null;
  const segments = normalizeSegments(body);
  if (!segments.length) return NextResponse.json({ segments: [] });

  const errors: string[] = [];
  try {
    const result = await translateWithNllw(body ?? {}, segments);
    if (result) return jsonResponse(result, "nllw");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "NLLW translation failed");
  }

  try {
    const result = await translateWithOpenAI(body ?? {}, segments);
    if (result) return jsonResponse(result, "openai");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "OpenAI translation failed");
  }

  return NextResponse.json(
    {
      error: errors.length ? errors.join("; ") : "No translation provider configured. Set NLLW_TRANSLATE_URL or OPENAI_API_KEY.",
      segments: [],
    },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
