import type { DramaTrend, LiveSearchResource } from "@/lib/types";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function viewScore(views = 0) {
  if (views <= 0) return 0;
  return clampScore(Math.log10(views + 1) * 15);
}

export function searchTrendScore(resource: LiveSearchResource, index = 0) {
  const rankSignal = resource.officialRank ? Math.max(0, 101 - resource.officialRank) : 0;
  const sourceSignal =
    resource.source_type === "official_platform" || resource.source_type === "official_channel" ? 72 :
    resource.discoverySource === "serpapi" || resource.discoverySource === "firecrawl" ? 58 :
    resource.discoverySource === "official_api" ? 52 :
    35;
  return clampScore(Math.max(rankSignal, sourceSignal - index * 1.5));
}

export function socialTrendScore(resource: LiveSearchResource) {
  const likes = resource.likeCount ?? 0;
  const comments = resource.commentCount ?? 0;
  const social = likes + comments * 3;
  return clampScore(Math.log10(social + 1) * 18);
}

export function updateFrequencyScore(value?: string) {
  if (!value) return 62;
  const ageMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 70;
  const ageDays = ageMs / 86_400_000;
  return clampScore(100 - ageDays * 4);
}

export function calculateHeatScore(resource: LiveSearchResource, index = 0) {
  const views = viewScore(resource.viewCount ?? 0);
  const search = searchTrendScore(resource, index);
  const social = socialTrendScore(resource);
  const update = updateFrequencyScore(resource.discoveredAt);
  return {
    views,
    search,
    social,
    update,
    heat: clampScore(views * 0.4 + search * 0.25 + social * 0.2 + update * 0.15),
  };
}

export function buildDramaTrend(resource: LiveSearchResource, index = 0): DramaTrend {
  const scores = calculateHeatScore(resource, index);
  return {
    id: `trend:${resource.id}`,
    drama_id: resource.officialDramaId,
    platform: resource.platformId,
    views: resource.viewCount ?? 0,
    search_score: scores.search,
    social_score: scores.social,
    update_score: scores.update,
    heat_score: scores.heat,
    trend_direction: resource.trend_direction ?? (scores.social >= 50 || scores.search >= 78 ? "UP" : "STABLE"),
    source_url: resource.source_url ?? resource.url,
    source_type: resource.source_type,
    updated_at: resource.discoveredAt ?? new Date().toISOString(),
  };
}

