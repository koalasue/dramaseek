import { NextResponse } from "next/server";
import { createDownloadTask, listDownloadTasks } from "@/lib/download-tasks";
import { checkYtDlpAvailable, validateDownloadSource } from "@/lib/download-service";

export async function GET() {
  const ytdlp = await checkYtDlpAvailable();
  return NextResponse.json({ tasks: listDownloadTasks(), ytdlp });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { url?: string; quality?: string; ownershipConfirmed?: boolean } | null;
  const validation = validateDownloadSource(String(body?.url ?? ""), body?.ownershipConfirmed === true);
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
  const ytdlp = await checkYtDlpAvailable();
  if (!ytdlp.available) return NextResponse.json({ error: ytdlp.error }, { status: 503 });
  const task = createDownloadTask(validation.url, body?.quality?.trim() || undefined);
  return NextResponse.json({ task }, { status: 202 });
}
