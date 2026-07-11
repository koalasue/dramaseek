import { normalizeText } from "@/lib/search";
import { calculateHeatScore } from "@/lib/rankings/trends";
import type { LiveSearchResource } from "@/lib/types";

export const officialDramaPlatforms = ["reelshort", "dramabox", "shortmax", "goodshort", "flextv", "netshort"] as const;
export const publicAggregatorPlatforms = ["shortdrama", "jowo", "minishort", "dramaflows"] as const;

export const officialYouTubeChannelPattern =
  /\b(reelshort|dramabox|shortmax|goodshort|flextv|netshort)\b/i;

const rejectedContentPattern =
  /\b(trailer|review|recap|explanation|explained|clip|watch\s+free|free\s+drama|tv\s+shows?|tubi|full\s+movie|movies?|episode\s+only|youtube\s+compilation|reaction|commentary|preview|teaser|fanmade|edit)\b|解说|讲解|盘点|吐槽|影评|预告|花絮|混剪|二创/i;

const rejectedOfficialPlatformPattern =
  /\b(trailer|review|recap|explanation|explained|clip|episode\s+only|youtube\s+compilation|reaction|commentary|preview|teaser|fanmade|edit)\b|解说|讲解|盘点|吐槽|影评|预告|花絮|混剪|二创/i;

const genreRules: Array<[string, RegExp]> = [
  ["Romance", /\b(romance|love|bride|wife|husband|marriage|married|divorce|wedding)\b/i],
  ["CEO", /\b(ceo|boss|president)\b|总裁/i],
  ["Mafia", /\b(mafia|mob|gangster)\b/i],
  ["Werewolf", /\b(werewolf|alpha|luna|wolf|lycan)\b/i],
  ["Revenge", /\b(revenge|betray|ex|payback)\b/i],
  ["Fantasy", /\b(fantasy|dragon|vampire|witch|magic|king|queen|prince|princess)\b/i],
  ["Billionaire", /\b(billionaire|millionaire|heiress|tycoon)\b/i],
  ["Marriage", /\b(marriage|married|bride|groom|wife|husband|contract)\b/i],
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function isRejectedRankingContent(value: string) {
  return rejectedContentPattern.test(value);
}

export function isRejectedOfficialPlatformContent(value: string) {
  return rejectedOfficialPlatformPattern.test(value);
}

export function inferGenres(resource: Pick<LiveSearchResource, "title" | "description">) {
  const text = `${resource.title} ${resource.description ?? ""}`;
  const genres = genreRules.flatMap(([genre, pattern]) => (pattern.test(text) ? [genre] : []));
  return [...new Set(genres)];
}

export function extractEpisodeCount(value: string) {
  const patterns = [
    /\b(?:ep|episode|episodes)\s*(?:1\s*[-–]\s*)?(\d{2,3})\b/i,
    /\b(\d{2,3})\s*(?:eps|episodes)\b/i,
    /(?:全集|全剧|共)\s*(\d{2,3})\s*(?:集|话)?/i,
    /(?:第\s*)?(\d{2,3})\s*集/i,
  ];
  for (const pattern of patterns) {
    const parsed = Number(pattern.exec(value)?.[1]);
    if (Number.isFinite(parsed) && parsed >= 5 && parsed <= 200) return parsed;
  }
  return undefined;
}

export function officialDramaIdFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/(?:\/(?:drama|movie|series|show|video|play|full-episodes?)\/|id=)([a-z0-9_-]{4,})/i);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function hasCompleteDetails(resource: LiveSearchResource) {
  return Boolean(resource.title && resource.url && (resource.description || resource.durationSeconds || resource.episodeCount));
}

function hasHotData(resource: LiveSearchResource) {
  return Boolean((resource.viewCount ?? 0) > 0 || (resource.likeCount ?? 0) > 0 || (resource.commentCount ?? 0) > 0 || resource.officialRank);
}

function isTrustedPublicPlayable(resource: LiveSearchResource) {
  return resource.platformId === "dailymotion" && resource.discoverySource === "official_api" && Boolean(resource.thumbnailUrl) && (resource.durationSeconds ?? 0) >= 45;
}

function isTrustedOfficialPlatformResource(resource: LiveSearchResource) {
  return officialDramaPlatforms.includes(resource.platformId as typeof officialDramaPlatforms[number]) && Boolean(resource.official_source) && Boolean(resource.url);
}

function isTrustedPublicAggregatorResource(resource: LiveSearchResource) {
  return publicAggregatorPlatforms.includes(resource.platformId as typeof publicAggregatorPlatforms[number]) &&
    resource.source_type === "public_aggregator" &&
    resource.discoverySource === "public_aggregator" &&
    Boolean(resource.title && resource.url);
}

export function enrichRankingResource(resource: LiveSearchResource, index = 0): LiveSearchResource {
  const evidence = `${resource.title} ${resource.description ?? ""} ${resource.uploader} ${resource.url}`;
  const sourceType = resource.source_type ??
    (officialDramaPlatforms.includes(resource.platformId as typeof officialDramaPlatforms[number])
      ? "official_platform"
      : publicAggregatorPlatforms.includes(resource.platformId as typeof publicAggregatorPlatforms[number])
        ? "public_aggregator"
      : resource.platformId === "youtube" && officialYouTubeChannelPattern.test(resource.uploader)
        ? "official_channel"
        : resource.platformId === "tiktok"
          ? "social_trend"
          : "third_party_database");
  const officialSource = resource.official_source ?? resource.verifiedOfficial ?? (sourceType === "official_platform" || sourceType === "official_channel");
  const episodeCount = resource.episodeCount ?? extractEpisodeCount(evidence);
  const officialDramaId = resource.officialDramaId ?? officialDramaIdFromUrl(resource.url);
  const genre = resource.genre?.length ? resource.genre : inferGenres(resource);

  const confidence =
    (officialSource ? 40 : 0) +
    (isTrustedPublicPlayable(resource) ? 30 : 0) +
    (isTrustedPublicAggregatorResource({ ...resource, source_type: sourceType, discoverySource: resource.discoverySource ?? "public_aggregator" }) ? 35 : 0) +
    (officialDramaId ? 20 : 0) +
    (hasCompleteDetails({ ...resource, episodeCount }) ? 15 : 0) +
    (resource.thumbnailUrl ? 10 : 0) +
    (episodeCount ? 10 : 0) +
    (hasHotData(resource) ? 5 : 0);

  const heat = calculateHeatScore({ ...resource, source_type: sourceType, official_source: officialSource, discoveredAt: resource.discoveredAt ?? new Date().toISOString() }, index);

  return {
    ...resource,
    source_type: sourceType,
    official_source: officialSource,
    source_url: resource.source_url ?? resource.url,
    confidence_score: clampScore(confidence),
    hot_score: heat.heat,
    trend_direction: resource.trend_direction ?? (heat.social >= 50 || heat.search >= 78 ? "UP" : "STABLE"),
    genre,
    episodeCount,
    officialDramaId,
    discoveredAt: resource.discoveredAt ?? new Date().toISOString(),
  };
}

export function isEligibleRankingResource(resource: LiveSearchResource) {
  const evidence = `${resource.title} ${resource.description ?? ""} ${resource.uploader} ${resource.url}`;
  const trustedPublicPlayable = isTrustedPublicPlayable(resource);
  const trustedOfficialPlatform = isTrustedOfficialPlatformResource(resource);
  const trustedPublicAggregator = isTrustedPublicAggregatorResource(resource);
  if (trustedOfficialPlatform ? isRejectedOfficialPlatformContent(evidence) : isRejectedRankingContent(evidence)) return false;
  if (!resource.title || !resource.url) return false;
  if (!resource.thumbnailUrl && !trustedOfficialPlatform && !trustedPublicAggregator) return false;
  if (!resource.official_source && !trustedPublicPlayable && !trustedPublicAggregator) return false;
  if (!resource.episodeCount && !trustedOfficialPlatform && !trustedPublicPlayable && !trustedPublicAggregator) return false;
  if ((resource.confidence_score ?? 0) < (trustedPublicPlayable || trustedOfficialPlatform || trustedPublicAggregator ? 50 : 70)) return false;
  return resource.contentType === "full_series" || resource.contentType === "episode" || Boolean(resource.episodeCount);
}

export function dedupeRankingResources(resources: LiveSearchResource[]) {
  const seen = new Map<string, LiveSearchResource>();
  for (const resource of resources) {
    const key = `${resource.platformId}:${normalizeText(resource.title)}:${resource.officialDramaId ?? ""}`;
    const existing = seen.get(key);
    if (!existing || (resource.confidence_score ?? 0) > (existing.confidence_score ?? 0) || (resource.hot_score ?? 0) > (existing.hot_score ?? 0)) {
      seen.set(key, resource);
    }
  }
  return [...seen.values()];
}
