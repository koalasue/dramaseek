import { NextResponse } from "next/server";
import { listDramas, listPlatforms } from "@/lib/repository";
import { searchDailymotion } from "@/lib/live-search/dailymotion";
import { searchWithFirecrawl } from "@/lib/live-search/firecrawl";
import { discoverOfficialPlatformPages, searchOfficialPagesWithSerpApi } from "@/lib/live-search/serpapi";
import { discoverYouTubeShortDramas, searchYouTube } from "@/lib/live-search/youtube";
import { dedupeRankingResources, enrichRankingResource, isEligibleRankingResource } from "@/lib/rankings/quality";
import { buildDramaMetadata } from "@/lib/rankings/metadata";
import { normalizePlayback } from "@/lib/playback";
import type { LiveSearchResource, Platform } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const platformRankingOrder = ["youtube", "reelshort", "dramabox", "netshort", "dailymotion", "shortmax", "goodshort", "flextv", "tiktok"];
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
  const metadata = buildDramaMetadata(resource);
  const playback = normalizePlayback(resource);
  return {
    id: resource.id,
    title: metadata.title,
    original_title: metadata.original_title,
    clean_title: metadata.clean_title,
    titleZh: "",
    synopsis: metadata.description,
    description: metadata.description,
    episodeCount: metadata.episodes,
    languages: ["en"],
    score: resource.hot_score ?? 0,
    hot_score: resource.hot_score ?? 0,
    confidence_score: resource.confidence_score ?? 0,
    resourceCount: 1,
    play_type: playback.playType,
    status: playback.status,
    quality_score: playback.qualityScore,
    video_id: playback.videoId,
    views: resource.viewCount ?? 0,
    likes: resource.likeCount ?? 0,
    comments: resource.commentCount ?? 0,
    mentions: 0,
    creators: 0,
    posterUrl: resource.thumbnailUrl,
    href: `/rankings/drama?title=${encodeURIComponent(metadata.title)}&platform=${encodeURIComponent(resource.platformId)}&cover=${encodeURIComponent(resource.thumbnailUrl)}&description=${encodeURIComponent(metadata.description)}&genre=${encodeURIComponent(metadata.genre.join(","))}&episodes=${encodeURIComponent(String(metadata.episodes ?? ""))}&hot=${encodeURIComponent(String(resource.hot_score ?? 0))}&trend=${encodeURIComponent(resource.trend_direction ?? "STABLE")}&source=${encodeURIComponent(resource.source_url ?? resource.url)}`,
    badge: resource.source_type === "official_channel" ? "官方频道" : "官方平台",
    platform: platformName(platforms, resource.platformId),
    platformId: resource.platformId,
    genre: metadata.genre,
    country: metadata.country,
    cast: metadata.cast,
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
    if (!entries.length) return [];
    return [{ id: platform.id, name: platform.name, mode: "Top 10 verified official short dramas", entries }];
  });

  const comingSoonPlatforms = platformRankingOrder.flatMap((platformId) => {
    const platform = platforms.find((item) => item.id === platformId);
    if (!platform) return [];
    const hasEntries = eligible.some((resource) => resource.platformId === platformId);
    return hasEntries ? [] : [{
      id: platform.id,
      name: platform.name,
      status: "Coming Soon",
      note: "正在接入官方数据与详情页校验，未通过可信度的数据不会展示。",
      expected: platformId === "youtube" ? "官方频道短剧合集" : "官方剧目与热门榜单",
    }];
  });

  const globalTrending = eligible.slice(0, 100).map((resource, index) => ({
    ...buildDramaMetadata(resource),
    rank: index + 1,
    cover: resource.thumbnailUrl,
    platform: platformName(platforms, resource.platformId),
    platformId: resource.platformId,
    hot_score: resource.hot_score ?? 0,
    trend: hotTrendLabel(resource),
    trend_direction: resource.trend_direction ?? "STABLE",
    confidence_score: resource.confidence_score ?? 0,
    source_type: resource.source_type,
    official_source: resource.official_source,
    source_url: resource.source_url,
    play_type: normalizePlayback(resource).playType,
    status: normalizePlayback(resource).status,
    quality_score: normalizePlayback(resource).qualityScore,
    episodes: buildDramaMetadata(resource).episodes,
  }));

  return NextResponse.json(
    {
      globalTrending,
      panels,
      comingSoonPlatforms,
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
