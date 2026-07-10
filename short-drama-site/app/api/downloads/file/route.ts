import { NextRequest, NextResponse } from "next/server";
import { validateAuthorizedMediaUrl, validateMediaResponse } from "@/lib/download-policy";

export async function GET(request: NextRequest) {
  const policy = validateAuthorizedMediaUrl(request.nextUrl.searchParams.get("url") ?? "");
  if (!policy.allowed || !policy.url) return NextResponse.json({ error: policy.reason }, { status: 400 });
  try {
    const upstream = await fetch(policy.url, { redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "无法读取媒体文件" }, { status: 502 });
    const media = validateMediaResponse(upstream.headers.get("content-type"), upstream.headers.get("content-length"));
    if (!media.allowed) return NextResponse.json({ error: media.reason }, { status: 400 });
    return new Response(upstream.body, { headers: {
      "content-type": media.contentType ?? "application/octet-stream",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(policy.filename ?? "video.mp4")}`,
      ...(media.contentLength ? { "content-length": String(media.contentLength) } : {}),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff"
    }});
  } catch { return NextResponse.json({ error: "下载连接失败" }, { status: 502 }); }
}
