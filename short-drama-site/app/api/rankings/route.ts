import { NextResponse } from "next/server";
import { listDramas, listPlatforms } from "@/lib/repository";
import { agentReachEnabled, discoverWithAgentReach } from "@/lib/live-search/agent-reach";
import { discoverAggregatorDramas } from "@/lib/live-search/aggregators";
import { discoverDailymotionShortDramas, searchDailymotion } from "@/lib/live-search/dailymotion";
import { searchWithFirecrawl } from "@/lib/live-search/firecrawl";
import { searchOfficialPagesWithSerpApi } from "@/lib/live-search/serpapi";
import { discoverYouTubeShortDramas, searchYouTube } from "@/lib/live-search/youtube";
import { dedupeRankingResources, enrichRankingResource, isEligibleRankingResource, isRejectedOfficialPlatformContent, isRejectedRankingContent } from "@/lib/rankings/quality";
import { buildDramaMetadata } from "@/lib/rankings/metadata";
import { buildDramaTrend } from "@/lib/rankings/trends";
import { normalizePlayback } from "@/lib/playback";
import type { LiveSearchResource, Platform } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const platformRankingOrder = ["shortdrama", "jowo", "minishort", "dramaflows", "dailymotion", "youtube", "reelshort", "dramabox", "netshort", "shortmax", "goodshort", "flextv", "tiktok"];
const rankingsCacheTtlMs = 5 * 60 * 1000;

type RankingsPayload = {
  globalTrending: ReturnType<typeof toGlobalRankingEntry>[];
  panels: Array<{ id: string; name: string; mode: string; entries: ReturnType<typeof toRankingEntry>[] }>;
  platformTrends: ReturnType<typeof buildPlatformTrends>;
  comingSoonPlatforms: never[];
  dramaTrends: ReturnType<typeof buildDramaTrend>[];
  tiktokTrendAnalysis: ReturnType<typeof buildTikTokTrendAnalysis>;
  quality: {
    eligible: number;
    rejected: number;
    minimumConfidence: number;
    blockedReason: string;
  };
  sourceDiagnostics: ReturnType<typeof buildSourceDiagnostics>;
  sampleJson: ReturnType<typeof toGlobalRankingEntry>[];
  updatedAt: string;
  firecrawlEnabled: boolean;
  serpApiEnabled: boolean;
  youtubeApiEnabled: boolean;
  agentReachEnabled: boolean;
};

let rankingsCache: { expiresAt: number; payload: RankingsPayload } | null = null;

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
    badge: resource.source_type === "public_aggregator" ? "免费聚合" : resource.source_type === "official_channel" ? "官方频道" : "官方平台",
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

function toGlobalRankingEntry(resource: LiveSearchResource, platforms: Platform[], index: number) {
  const metadata = buildDramaMetadata(resource);
  const playback = normalizePlayback(resource);
  return {
    ...metadata,
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
    play_type: playback.playType,
    status: playback.status,
    quality_score: playback.qualityScore,
    episodes: metadata.episodes,
  };
}

function buildPlatformTrends(platforms: Platform[], eligible: LiveSearchResource[], enriched: LiveSearchResource[]) {
  return platformRankingOrder.flatMap((platformId) => {
    const platform = platforms.find((item) => item.id === platformId);
    if (!platform) return [];
    const resources = eligible.filter((resource) => resource.platformId === platformId);
    if (!resources.length) return [];
    const candidates = enriched.filter((resource) => resource.platformId === platformId);
    const views = resources.reduce((sum, resource) => sum + (resource.viewCount ?? 0), 0);
    const heat = Math.round(resources.reduce((sum, resource) => sum + (resource.hot_score ?? 0), 0) / resources.length);
    const sourceTypes = [...new Set(candidates.map((resource) => resource.discoverySource ?? resource.source_type).filter(Boolean))];
    return [{
      id: platform.id,
      name: platform.name,
      status: "Trending Data",
      data_source: sourceTypes.join(" + "),
      last_updated: new Date().toISOString(),
      heat_score: Math.max(0, Math.min(100, heat)),
      views,
      search_score: Math.round(resources.reduce((sum, resource) => sum + buildDramaTrend(resource).search_score, 0) / resources.length),
      social_score: Math.round(resources.reduce((sum, resource) => sum + buildDramaTrend(resource).social_score, 0) / resources.length),
      trend_direction: resources.some((resource) => resource.trend_direction === "UP") || platformId === "tiktok" ? "UP" : "STABLE",
      ranking_signal: `${resources.length} verified drama signals`,
      entries: resources.slice(0, 10).map((resource) => toRankingEntry(resource, platforms)),
    }];
  });
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
    discoverDailymotionShortDramas(),
    discoverAggregatorDramas(),
    discoverWithAgentReach(),
    discoverYouTubeShortDramas(),
  ]);
  return settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
}

function buildTikTokTrendAnalysis() {
  return {
    title: "TikTok Trend Analysis",
    note: "TikTok 暂未接入可验证剧目榜数据；不会生成模拟 hashtag 热度。",
    keywords: [],
  };
}

function rejectedReason(resource: LiveSearchResource) {
  const evidence = `${resource.title} ${resource.description ?? ""} ${resource.uploader} ${resource.url}`;
  if (resource.official_source ? isRejectedOfficialPlatformContent(evidence) : isRejectedRankingContent(evidence)) return "rejected_content";
  if (!resource.title) return "missing_title";
  if (!resource.thumbnailUrl && !resource.official_source && resource.source_type !== "public_aggregator") return "missing_cover";
  if (!resource.official_source && resource.source_type !== "public_aggregator" && !(resource.platformId === "dailymotion" && resource.discoverySource === "official_api")) return "unverified_source";
  if ((resource.confidence_score ?? 0) < 50) return "low_confidence";
  return "quality_gate";
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function buildSourceDiagnostics(enriched: LiveSearchResource[], eligible: LiveSearchResource[], rejected: LiveSearchResource[]) {
  return {
    totalDiscovered: enriched.length,
    eligible: eligible.length,
    rejected: rejected.length,
    byPlatform: countBy(enriched.map((resource) => resource.platformId)),
    eligibleByPlatform: countBy(eligible.map((resource) => resource.platformId)),
    byDiscoverySource: countBy(enriched.map((resource) => resource.discoverySource ?? resource.source_type ?? "unknown")),
    rejectedReasons: countBy(rejected.map(rejectedReason)),
  };
}

async function buildRankingsPayload(): Promise<RankingsPayload> {
  const platforms = await listPlatforms();
  const [seedResources, broadResources] = await Promise.all([discoverSeedResources(), discoverBroadResources()]);
  const enriched = dedupeRankingResources([...seedResources, ...broadResources].map((resource, index) => enrichRankingResource(resource, index)));
  const eligible = enriched.filter(isEligibleRankingResource).sort((a, b) => (b.hot_score ?? 0) - (a.hot_score ?? 0));
  const rejected = enriched.filter((resource) => !isEligibleRankingResource(resource));
  const dramaTrends = eligible.map((resource, index) => buildDramaTrend(resource, index));

  const panels = platformRankingOrder.flatMap((platformId) => {
    const platform = platforms.find((item) => item.id === platformId);
    if (!platform) return [];
    const entries = eligible.filter((resource) => resource.platformId === platformId).slice(0, 10).map((resource) => toRankingEntry(resource, platforms));
    if (!entries.length) return [];
    return [{ id: platform.id, name: platform.name, mode: "Top 10 verified short drama trend signals", entries }];
  });

  const platformTrends = buildPlatformTrends(platforms, eligible, enriched);

  const globalTrending = eligible.slice(0, 100).map((resource, index) => toGlobalRankingEntry(resource, platforms, index));

  return {
    globalTrending,
    panels,
    platformTrends,
    comingSoonPlatforms: [],
    dramaTrends,
    tiktokTrendAnalysis: buildTikTokTrendAnalysis(),
    quality: {
      eligible: eligible.length,
      rejected: rejected.length,
      minimumConfidence: 50,
      blockedReason: "普通 SEO 页面、解说/剪辑/预告、文章页或低可信内容不会进入榜单；免费聚合站只展示公开可访问的真实剧集入口。",
    },
    sourceDiagnostics: buildSourceDiagnostics(enriched, eligible, rejected),
    sampleJson: globalTrending.slice(0, 12),
    updatedAt: new Date().toISOString(),
    firecrawlEnabled: Boolean(process.env.FIRECRAWL_API_KEY),
    serpApiEnabled: Boolean(process.env.SERPAPI_KEY),
    youtubeApiEnabled: Boolean(process.env.YOUTUBE_API_KEY),
    agentReachEnabled: agentReachEnabled(),
  };
}

export async function GET(request: Request) {
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
  const now = Date.now();
  const cached = !forceRefresh && rankingsCache && rankingsCache.expiresAt > now ? rankingsCache : null;
  const cacheHit = Boolean(cached);
  const payload = cached ? cached.payload : await buildRankingsPayload();

  if (!cacheHit) rankingsCache = { payload, expiresAt: now + rankingsCacheTtlMs };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-DramaSeek-Cache": cacheHit ? "HIT" : "MISS",
    },
  });
}
