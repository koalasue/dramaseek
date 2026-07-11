import { NextRequest, NextResponse } from "next/server";
import { agentReachEnabled, searchWithAgentReach } from "@/lib/live-search/agent-reach";
import { aggregatorPlatformIds, searchAggregatorDramas } from "@/lib/live-search/aggregators";
import { searchDailymotion } from "@/lib/live-search/dailymotion";
import { firecrawlPlatformIds, searchWithFirecrawl } from "@/lib/live-search/firecrawl";
import { searchOfficialPagesWithSerpApi } from "@/lib/live-search/serpapi";
import { searchYouTube } from "@/lib/live-search/youtube";
import { normalizePlayback } from "@/lib/playback";
import type { LiveSearchResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 160) ?? "";
  const platformStatus: LiveSearchResponse["platformStatus"] = {
    youtube: process.env.YOUTUBE_API_KEY ? "live" : "needs_key",
    reelshort: process.env.FIRECRAWL_API_KEY || process.env.SERPAPI_KEY ? "live" : "needs_key",
    dramabox: process.env.FIRECRAWL_API_KEY || process.env.SERPAPI_KEY ? "live" : "needs_key",
    netshort: process.env.FIRECRAWL_API_KEY || process.env.SERPAPI_KEY ? "live" : "needs_key",
    dailymotion: "live",
    shortdrama: "live",
    jowo: "live",
    minishort: "live",
    dramaflows: "live",
    tiktok: process.env.SERPAPI_KEY ? "live" : "needs_key"
  };
  if (agentReachEnabled()) platformStatus.youtube = "live";
  if (!query) return NextResponse.json({ resources: [], platformStatus } satisfies LiveSearchResponse);
  const [dailymotion, aggregators, firecrawl, serpapi, youtube, agentReach] = await Promise.allSettled([
    searchDailymotion(query),
    searchAggregatorDramas(query),
    searchWithFirecrawl(query),
    searchOfficialPagesWithSerpApi(query),
    searchYouTube(query),
    searchWithAgentReach(query),
  ]);
  if (dailymotion.status === "rejected") platformStatus.dailymotion = "unavailable";
  if (aggregators.status === "rejected") aggregatorPlatformIds.forEach((id) => { platformStatus[id] = "unavailable"; });
  if (firecrawl.status === "rejected") firecrawlPlatformIds.forEach((id) => { platformStatus[id] = "unavailable"; });
  if (serpapi.status === "rejected" && !process.env.FIRECRAWL_API_KEY) firecrawlPlatformIds.forEach((id) => { platformStatus[id] = "unavailable"; });
  if (youtube.status === "rejected") platformStatus.youtube = "unavailable";
  const resources = [
    ...(youtube.status === "fulfilled" ? youtube.value : []),
    ...(aggregators.status === "fulfilled" ? aggregators.value : []),
    ...(dailymotion.status === "fulfilled" ? dailymotion.value : []),
    ...(firecrawl.status === "fulfilled" ? firecrawl.value : []),
    ...(serpapi.status === "fulfilled" ? serpapi.value : []),
    ...(agentReach.status === "fulfilled" ? agentReach.value : []),
  ].map((resource) => {
    const playback = normalizePlayback(resource);
    return { ...resource, play_type: playback.playType, status: playback.status, quality_score: playback.qualityScore, video_id: playback.videoId };
  });
  return NextResponse.json({ resources, platformStatus } satisfies LiveSearchResponse, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
