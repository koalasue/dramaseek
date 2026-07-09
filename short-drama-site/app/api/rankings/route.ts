import { NextResponse } from "next/server";
import { listDramas, listPlatforms } from "@/lib/repository";
import { searchDailymotion } from "@/lib/live-search/dailymotion";
import { searchWithFirecrawl } from "@/lib/live-search/firecrawl";
import { discoverOfficialPlatformPages, searchOfficialPagesWithSerpApi } from "@/lib/live-search/serpapi";
import { discoverYouTubeShortDramas, searchYouTube } from "@/lib/live-search/youtube";
import { dedupeRankingResources, enrichRankingResource, isEligibleRankingResource } from "@/lib/rankings/quality";
import type { LiveSearchResource, Platform } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const platformRankingOrder = ["youtube", "reelshort", "dramabox", "shortmax", "goodshort", "flextv", "netshort"];
const discoveryPlatforms = ["reelshort", "dramabox", "shortmax", "goodshort", "flextv", "netshort"] as const;

function hotTrendLabel(resource: LiveSearchResource) {
  if (resource.trend_direction === "UP") return "Rising";
  if (resource.trend_direction === "DOWN") return "Cooling";
  return "Stable";
}

function platformName(platforms: Platform[], platformId: string) {
  return platforms.find((platform) => platform.id === platformId)?.name ?? platformId;
}

function toRankingEntry(resource: LiveSearchResource, platforms: Platform[]) {
  const title = resource.title.replace(/\s*[-|]\s*(ReelShort|DramaBox|NetShort|ShortMax|GoodShort|FlexTV).*$/i, "").trim();
  return {
    id: resource.id,
    title,
    titleZh: "",
    synopsis: resource.description ?? "官方来源发现的短剧资源，简介以平台页面为准。",
    episodeCount: resource.episodeCount,
    languages: ["en"],
    score: resource.hot_score ?? 0,
    hot_score: resource.hot_score ?? 0,
    confidence_score: resource.confidence_score ?? 0,
    resourceCount: 1,
    views: resource.viewCount ?? 0,
    likes: resource.likeCount ?? 0,
    comments: resource.commentCount ?? 0,
    mentions: 0,
    creators: 0,
    posterUrl: resource.thumbnailUrl,
    href: `/?q=${encodeURIComponent(title)}&platform=${resource.platformId}`,
    badge: resource.source_type === "official_channel" ? "官方频道" : "官方平台",
    platform: platformName(platforms, resource.platformId),
    platformId: resource.platformId,
    genre: resource.genre ?? [],
    trend_direction: resource.trend_direction ?? "STABLE",
    trend: hotTrendLabel(resource),
    source_type: resource.source_type,
    official_source: resource.official_source,
    source_url: resource.source_url,
  };
}

async function discoverSeedResources() {
  const dramas = await listDramas();
  const candidates = dramas.slice(0, 12);
  const discoveries = await Promise.all(candidates.map(async (drama) => {
    const query = drama.titleEn || drama.titleZh;
    const [dm, official, serpapi, youtube] = await Promise.allSettled([
      searchDailymotion(query),
      searchWithFirecrawl(query),
      searchOfficialPagesWithSerpApi(query),
      searchYouTube(query),
    ]);
    return [
      ...(youtube.status === "fulfilled" ? youtube.value : []),
      ...(official.status === "fulfilled" ? official.value : []),
      ...(serpapi.status === "fulfilled" ? serpapi.value : []),
      ...(dm.status === "fulfilled" ? dm.value : []),
    ];
  }));
  return discoveries.flat();
}

async function discoverBroadResources() {
  const settled = await Promise.allSettled([
    discoverYouTubeShortDramas(),
    ...discoveryPlatforms.map((platformId) => discoverOfficialPlatformPages(platformId)),
  ]);
  return settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
}

function buildTikTokTrendAnalysis() {
  return {
    title: "TikTok Trend Analysis",
    note: "TikTok 目前只做关键词趋势观察，不把普通视频搜索结果当作官方短剧榜单。",
    keywords: [
      { tag: "#shortdrama", status: "watching" },
      { tag: "#reelshort", status: "watching" },
      { tag: "#dramabox", status: "watching" },
    ],
  };
}

export async function GET() {
  const platforms = await listPlatforms();
  const [seedResources, broadResources] = await Promise.all([discoverSeedResources(), discoverBroadResources()]);
  const enriched = dedupeRankingResources([...seedResources, ...broadResources].map((resource, index) => enrichRankingResource(resource, index)));
  const eligible = enriched.filter(isEligibleRankingResource).sort((a, b) => (b.hot_score ?? 0) - (a.hot_score ?? 0));
  const rejected = enriched.filter((resource) => !isEligibleRankingResource(resource));

  const panels = platformRankingOrder.flatMap((platformId) => {
    const platform = platforms.find((item) => item.id === platformId);
    if (!platform) return [];
    const entries = eligible.filter((resource) => resource.platformId === platformId).slice(0, 10).map((resource) => toRankingEntry(resource, platforms));
    return [{ id: platform.id, name: platform.name, mode: "Top 10 verified official short dramas", entries }];
  });

  const globalTrending = eligible.slice(0, 100).map((resource, index) => ({
    rank: index + 1,
    cover: resource.thumbnailUrl,
    title: resource.title,
    platform: platformName(platforms, resource.platformId),
    platformId: resource.platformId,
    genre: resource.genre ?? [],
    hot_score: resource.hot_score ?? 0,
    trend: hotTrendLabel(resource),
    trend_direction: resource.trend_direction ?? "STABLE",
    confidence_score: resource.confidence_score ?? 0,
    source_type: resource.source_type,
    official_source: resource.official_source,
    source_url: resource.source_url,
    episodes: resource.episodeCount,
  }));

  return NextResponse.json(
    {
      globalTrending,
      panels,
      tiktokTrendAnalysis: buildTikTokTrendAnalysis(),
      quality: {
        eligible: eligible.length,
        rejected: rejected.length,
        minimumConfidence: 70,
        blockedReason: "普通搜索结果、SEO页面、非官方频道、解说/剪辑/预告、无封面或无集数信息不会进入排行榜。",
      },
      sampleJson: globalTrending.slice(0, 12),
      updatedAt: new Date().toISOString(),
      firecrawlEnabled: Boolean(process.env.FIRECRAWL_API_KEY),
      serpApiEnabled: Boolean(process.env.SERPAPI_KEY),
      youtubeApiEnabled: Boolean(process.env.YOUTUBE_API_KEY),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
