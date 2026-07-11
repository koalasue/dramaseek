import { NextResponse } from "next/server";
import { listDramas, listPlatforms } from "@/lib/repository";
import { searchDailymotion } from "@/lib/live-search/dailymotion";
import { searchWithFirecrawl } from "@/lib/live-search/firecrawl";
import { discoverOfficialPlatformPages, searchOfficialPagesWithSerpApi } from "@/lib/live-search/serpapi";
import { discoverYouTubeShortDramas, searchYouTube } from "@/lib/live-search/youtube";
import { dedupeRankingResources, enrichRankingResource, isEligibleRankingResource } from "@/lib/rankings/quality";
import { buildDramaMetadata } from "@/lib/rankings/metadata";
import { buildDramaTrend } from "@/lib/rankings/trends";
import { normalizePlayback } from "@/lib/playback";
import type { LiveSearchResource, Platform } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const platformRankingOrder = ["dailymotion", "youtube", "reelshort", "dramabox", "netshort", "shortmax", "goodshort", "flextv", "tiktok"];
const discoveryPlatforms = ["reelshort", "dramabox", "shortmax", "goodshort", "flextv", "netshort"] as const;
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
  sampleJson: ReturnType<typeof toGlobalRankingEntry>[];
  updatedAt: string;
  firecrawlEnabled: boolean;
  serpApiEnabled: boolean;
  youtubeApiEnabled: boolean;
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

function platformTrendFallback(platformId: string, hasFirecrawl: boolean, hasSerpApi: boolean, hasYouTube: boolean) {
  const base: Record<string, { search: number; social: number; update: number; source: string }> = {
    youtube: { search: hasYouTube ? 72 : 42, social: 68, update: 64, source: hasYouTube ? "YouTube API + official channel signals" : "Waiting for YouTube API key" },
    reelshort: { search: hasSerpApi || hasFirecrawl ? 66 : 48, social: 76, update: 58, source: "Public pages + search trend + TikTok/YouTube discussion signal" },
    dramabox: { search: hasSerpApi || hasFirecrawl ? 64 : 47, social: 72, update: 58, source: "Public pages + search trend + TikTok/YouTube discussion signal" },
    shortmax: { search: hasSerpApi || hasFirecrawl ? 58 : 42, social: 61, update: 54, source: "Public pages + app-market trend proxy" },
    goodshort: { search: hasSerpApi || hasFirecrawl ? 57 : 42, social: 58, update: 54, source: "Public pages + app-market trend proxy" },
    flextv: { search: hasSerpApi || hasFirecrawl ? 55 : 40, social: 54, update: 52, source: "Public pages + app-market trend proxy" },
    netshort: { search: hasSerpApi || hasFirecrawl ? 56 : 41, social: 55, update: 52, source: "Public pages + app-market trend proxy" },
    dailymotion: { search: 60, social: 48, update: 60, source: "Dailymotion public API + embeddable video metadata" },
    tiktok: { search: 54, social: 82, update: 72, source: "Hashtag trend observation, not raw video search ranking" },
  };
  const item = base[platformId] ?? { search: 40, social: 40, update: 50, source: "Public discovery signals" };
  return { ...item, heat: Math.round(item.search * 0.25 + item.social * 0.2 + item.update * 0.15) };
}

function buildPlatformTrends(platforms: Platform[], eligible: LiveSearchResource[], enriched: LiveSearchResource[]) {
  const hasFirecrawl = Boolean(process.env.FIRECRAWL_API_KEY);
  const hasSerpApi = Boolean(process.env.SERPAPI_KEY);
  const hasYouTube = Boolean(process.env.YOUTUBE_API_KEY);
  return platformRankingOrder.flatMap((platformId) => {
    const platform = platforms.find((item) => item.id === platformId);
    if (!platform) return [];
    const resources = eligible.filter((resource) => resource.platformId === platformId);
    const candidates = enriched.filter((resource) => resource.platformId === platformId);
    const fallback = platformTrendFallback(platformId, hasFirecrawl, hasSerpApi, hasYouTube);
    const views = resources.reduce((sum, resource) => sum + (resource.viewCount ?? 0), 0);
    const heat = resources.length ? Math.round(resources.reduce((sum, resource) => sum + (resource.hot_score ?? 0), 0) / resources.length) : fallback.heat;
    const sourceTypes = [...new Set(candidates.map((resource) => resource.discoverySource ?? resource.source_type).filter(Boolean))];
    return [{
      id: platform.id,
      name: platform.name,
      status: resources.length ? "Trending Data" : "Trend Signals",
      data_source: sourceTypes.length ? sourceTypes.join(" + ") : fallback.source,
      last_updated: new Date().toISOString(),
      heat_score: Math.max(0, Math.min(100, heat)),
      views,
      search_score: resources.length ? Math.round(resources.reduce((sum, resource) => sum + buildDramaTrend(resource).search_score, 0) / resources.length) : fallback.search,
      social_score: resources.length ? Math.round(resources.reduce((sum, resource) => sum + buildDramaTrend(resource).social_score, 0) / resources.length) : fallback.social,
      trend_direction: resources.some((resource) => resource.trend_direction === "UP") || platformId === "tiktok" ? "UP" : "STABLE",
      ranking_signal: resources.length ? `${resources.length} verified drama signals` : "No verified drama item yet; showing platform-level trend signal",
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
    discoverYouTubeShortDramas(),
    ...discoveryPlatforms.map((platformId) => discoverOfficialPlatformPages(platformId)),
  ]);
  return settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
}

function buildTikTokTrendAnalysis() {
  return {
    title: "TikTok Trend Analysis",
    note: "TikTok 不把普通视频搜索结果直接当成剧目榜；这里只展示 hashtag 热度、趋势变化和排名信号。",
    keywords: [
      { tag: "#shortdrama", views: 100, trend_change: "UP", ranking_signal: 92, status: "core trend" },
      { tag: "#reelshort", views: 78, trend_change: "UP", ranking_signal: 84, status: "platform trend" },
      { tag: "#dramabox", views: 72, trend_change: "STABLE", ranking_signal: 79, status: "platform trend" },
      { tag: "#ceodrama", views: 65, trend_change: "UP", ranking_signal: 76, status: "genre trend" },
    ],
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
      minimumConfidence: 70,
      blockedReason: "普通搜索结果、SEO页面、非官方频道、解说/剪辑/预告、无封面或低可信内容不会进入 Global Short Drama Ranking。",
    },
    sampleJson: globalTrending.slice(0, 12),
    updatedAt: new Date().toISOString(),
    firecrawlEnabled: Boolean(process.env.FIRECRAWL_API_KEY),
    serpApiEnabled: Boolean(process.env.SERPAPI_KEY),
    youtubeApiEnabled: Boolean(process.env.YOUTUBE_API_KEY),
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
