import { NextResponse } from "next/server";
import { checkYtDlpAvailable, ytdlpBinary } from "@/lib/download-service";

export async function GET() {
  const ytdlp = await checkYtDlpAvailable();
  return NextResponse.json({
    ytdlp,
    binary: ytdlpBinary(),
    environment: process.env.VERCEL ? "production" : "development",
  }, { status: ytdlp.available ? 200 : 503 });
}
