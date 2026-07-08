import { NextRequest, NextResponse } from "next/server";
import { createSubmission } from "@/lib/repository";
import { validateResourceUrl } from "@/lib/url-policy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateResourceUrl(String(body.url ?? ""));
    if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });
    const input = { url: String(body.url), title: String(body.title ?? "").trim().slice(0, 160) || undefined, note: String(body.note ?? "").trim().slice(0, 800) || undefined, contact: String(body.contact ?? "").trim().slice(0, 200) || undefined };
    return NextResponse.json({ submission: await createSubmission(input) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("duplicate") ? "这个链接已经提交过" : "无法保存提交，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
