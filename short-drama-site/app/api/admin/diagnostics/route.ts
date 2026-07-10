import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    providers: {
      dailymotion: { status: "live", note: "公开 API，无需密钥。" },
      youtube: { status: process.env.YOUTUBE_API_KEY ? "live" : "needs_key", env: "YOUTUBE_API_KEY" },
      officialSearch: { status: process.env.SERPAPI_KEY ? "live" : "needs_key", env: "SERPAPI_KEY", note: "用于搜索 ReelShort、DramaBox、NetShort 官方页面。" },
      firecrawl: { status: process.env.FIRECRAWL_API_KEY ? "live" : "needs_key", env: "FIRECRAWL_API_KEY" },
      tiktok: { status: process.env.SERPAPI_KEY ? "limited" : "needs_key", env: "SERPAPI_KEY", note: "仅做公开搜索线索，不作为官方播放 API。" },
    },
    updatedAt: new Date().toISOString(),
  });
}
