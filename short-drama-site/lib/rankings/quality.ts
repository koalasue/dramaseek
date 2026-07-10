import { normalizeText } from "@/lib/search";
import type { LiveSearchResource } from "@/lib/types";

export const officialDramaPlatforms = ["reelshort", "dramabox", "shortmax", "goodshort", "flextv", "netshort"] as const;

export const officialYouTubeChannelPattern =
  /\b(reelshort|dramabox|shortmax|goodshort|flextv|netshort)\b/i;

const rejectedContentPattern =
  /\b(trailer|review|recap|explanation|explained|clip|watch\s+free|free\s+drama|tv\s+shows?|tubi|full\s+movie|movies?|episode\s+only|youtube\s+compilation|reaction|commentary|preview|teaser|fanmade|edit)\b|解说|讲解|盘点|吐槽|影评|预告|花絮|混剪|二创/i;

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
  return officialDramaPlatforms.includes(resource.platformId as typeof officialDramaPlatforms[number]) && Boolean(resource.official_source) && Boolean(resource.thumbnailUrl);
}

export function enrichRankingResource(resource: LiveSearchResource, index = 0): LiveSearchResource {
  const evidence = `${resource.title} ${resource.description ?? ""} ${resource.uploader} ${resource.url}`;
  const sourceType = resource.source_type ??
    (officialDramaPlatforms.includes(resource.platformId as typeof officialDramaPlatforms[number])
      ? "official_platform"
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
    (officialDramaId ? 20 : 0) +
    (hasCompleteDetails({ ...resource, episodeCount }) ? 15 : 0) +
    (resource.thumbnailUrl ? 10 : 0) +
    (episodeCount ? 10 : 0) +
    (hasHotData(resource) ? 5 : 0);

  const views = resource.viewCount ?? 0;
  const likes = resource.likeCount ?? 0;
  const comments = resource.commentCount ?? 0;
  const officialRankSignal = resource.officialRank ? Math.max(0, 101 - resource.officialRank) : officialSource ? Math.max(40, 90 - index * 6) : 0;
  const playSignal = Math.min(100, Math.log10(views + 1) * 16);
  const growthSignal = Math.min(100, Math.log10(likes + comments + 1) * 18 + (resource.officialRank && resource.officialRank <= 10 ? 20 : 0));
  const freshnessSignal = resource.discoveredAt ? freshnessScore(resource.discoveredAt) : 65;
  const hotScore = clampScore(officialRankSignal * 0.4 + playSignal * 0.3 + growthSignal * 0.2 + freshnessSignal * 0.1);

  return {
    ...resource,
    source_type: sourceType,
    official_source: officialSource,
    source_url: resource.source_url ?? resource.url,
    confidence_score: clampScore(confidence),
    hot_score: hotScore,
    trend_direction: resource.trend_direction ?? (growthSignal >= 55 ? "UP" : views > 0 ? "STABLE" : "STABLE"),
    genre,
    episodeCount,
    officialDramaId,
    discoveredAt: resource.discoveredAt ?? new Date().toISOString(),
  };
}

function freshnessScore(value: string) {
  const ageMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 70;
  const ageDays = ageMs / 86_400_000;
  return clampScore(100 - ageDays * 4);
}

export function isEligibleRankingResource(resource: LiveSearchResource) {
  const evidence = `${resource.title} ${resource.description ?? ""} ${resource.uploader} ${resource.url}`;
  if (isRejectedRankingContent(evidence)) return false;
  if (!resource.title || !resource.thumbnailUrl) return false;
  if (!resource.official_source && !isTrustedPublicPlayable(resource)) return false;
  if (!resource.episodeCount && !isTrustedOfficialPlatformResource(resource)) return false;
  if ((resource.confidence_score ?? 0) < 70) return false;
  return resource.contentType === "full_series" || Boolean(resource.episodeCount);
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
