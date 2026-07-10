import { NextResponse } from "next/server";
import { validateAuthorizedMediaUrl, validateMediaResponse } from "@/lib/download-policy";

export async function POST(request: Request) {
  const { url, ownershipConfirmed } = await request.json();
  if (ownershipConfirmed !== true) return NextResponse.json({ error: "必须确认你拥有该内容或已取得下载授权" }, { status: 400 });
  const policy = validateAuthorizedMediaUrl(String(url ?? ""));
  if (!policy.allowed || !policy.url) return NextResponse.json({ error: policy.reason }, { status: 400 });
  try {
    const response = await fetch(policy.url, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return NextResponse.json({ error: `媒体服务器返回 ${response.status}` }, { status: 400 });
    const media = validateMediaResponse(response.headers.get("content-type"), response.headers.get("content-length"));
    if (!media.allowed) return NextResponse.json({ error: media.reason }, { status: 400 });
    return NextResponse.json({ filename: policy.filename, contentType: media.contentType, contentLength: media.contentLength, downloadUrl: `/api/downloads/file?url=${encodeURIComponent(policy.url)}` });
  } catch { return NextResponse.json({ error: "无法检查该媒体链接" }, { status: 502 }); }
}
