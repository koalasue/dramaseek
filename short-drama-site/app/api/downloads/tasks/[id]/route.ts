import { NextResponse } from "next/server";
import { getDownloadTask } from "@/lib/download-tasks";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const task = getDownloadTask((await params).id);
  if (!task) return NextResponse.json({ error: "下载任务不存在" }, { status: 404 });
  return NextResponse.json({ task });
}
