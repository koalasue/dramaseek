import { NextRequest, NextResponse } from "next/server";
import { searchDailymotion } from "@/lib/live-search/dailymotion";
import { firecrawlPlatformIds, searchWithFirecrawl } from "@/lib/live-search/firecrawl";
import type { LiveSearchResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 160) ?? "";
  const platformStatus: LiveSearchResponse["platformStatus"] = {
    youtube: process.env.YOUTUBE_API_KEY ? "live" : "needs_key",
    reelshort: process.env.FIRECRAWL_API_KEY ? "live" : "needs_key",
    dramabox: process.env.FIRECRAWL_API_KEY ? "live" : "needs_key",
    netshort: process.env.FIRECRAWL_API_KEY ? "live" : "needs_key",
    dailymotion: "live", tiktok: "unavailable"
  };
  if (!query) return NextResponse.json({ resources: [], platformStatus } satisfies LiveSearchResponse);
  const [dailymotion, firecrawl] = await Promise.allSettled([
    searchDailymotion(query),
    searchWithFirecrawl(query),
  ]);
  if (dailymotion.status === "rejected") platformStatus.dailymotion = "unavailable";
  if (firecrawl.status === "rejected") firecrawlPlatformIds.forEach((id) => { platformStatus[id] = "unavailable"; });
  const resources = [
    ...(dailymotion.status === "fulfilled" ? dailymotion.value : []),
    ...(firecrawl.status === "fulfilled" ? firecrawl.value : []),
  ];
  return NextResponse.json({ resources, platformStatus } satisfies LiveSearchResponse, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
