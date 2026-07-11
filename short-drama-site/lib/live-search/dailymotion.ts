import { cleanDramaTitle } from "@/lib/rankings/metadata";
import { normalizeText, similarity } from "@/lib/search";
import type { LiveSearchResource } from "@/lib/types";

type DailymotionVideo = {
  id: string;
  title: string;
  description?: string;
  duration: number;
  url: string;
  thumbnail_360_url?: string;
  "owner.username"?: string;
  status?: string;
  allow_embed?: boolean;
  private?: boolean;
  views_total?: number;
  likes_total?: number;
  comments_total?: number;
};

const rejected = /\b(review|recap|explained|explanation|reaction|trailer|teaser|commentary|blockbuster|hindi\s+dubbed|south\s+indian|short\s+film|4k\s+-\s+high\s+quality)\b|解说|讲解|影评|预告|花絮|混剪/i;
const genericDiscoveryTitle = /^(?:short\s*drama|mini\s*drama|full\s*episode|full\s*series|serie\s*completa|watch\s*free|episode\s*\d+|part\s*\d+)$/i;
const shortDramaEvidence = /\b(short\s*drama|mini\s*drama|reelshort|dramabox|dramadash|dramawave|full\s*series|full\s*episodes?|serie\s*completa|engsub|english\s*sub)\b|短剧|短劇|全集|全剧|完整版/i;
const allowedSuffix = /(?:full(?:\s*(?:ep|episode|episodes|movie|series))?|complete(?:\s*series)?|all\s*episodes?|全集|完整版|全剧|\|\s*(?:reelshort|dramabox|netshort))*/gi;

export function matchesExactDramaTitle(videoTitle: string, query: string) {
  const title = normalizeText(cleanDramaTitle(videoTitle.replace(allowedSuffix, "")));
  const needle = normalizeText(cleanDramaTitle(query));
  if (!title || !needle) return false;
  if (title === needle) return true;
  if (title.startsWith(needle) && /^(?:2|3|4|5|ii|iii|iv|season)/i.test(title.slice(needle.length))) return false;
  if (title.includes(`${needle}full`) || title.includes(`${needle}complete`)) return true;
  if (title.includes(needle)) return true;
  return similarity(title, needle) >= 0.58;
}

export function filterDailymotionVideos(videos: DailymotionVideo[], query: string): LiveSearchResource[] {
  const seen = new Set<string>();
  return videos.filter((video) => {
    const text = `${video.title} ${video.description ?? ""}`;
    return video.duration >= 45 && video.status !== "deleted" && video.allow_embed !== false && video.private !== true && !rejected.test(text) && matchesExactDramaTitle(video.title, query);
  }).filter((video) => {
    const key = `${normalizeText(video.title)}:${video.duration}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 12).map(toResource);
}

function toResource(video: DailymotionVideo): LiveSearchResource {
  return {
    id: `dailymotion:${video.id}`,
    platformId: "dailymotion",
    title: video.title,
    url: video.url,
    thumbnailUrl: video.thumbnail_360_url ?? "",
    durationSeconds: video.duration,
    uploader: video["owner.username"] ?? "Unknown",
    contentType: video.duration >= 900 ? "full_series" : "episode",
    verifiedOfficial: false,
    discoverySource: "official_api",
    source_type: "third_party_database",
    official_source: false,
    source_url: video.url,
    play_type: "embed",
    status: "available",
    quality_score: video.allow_embed === false ? 50 : 82,
    video_id: video.id,
    episodeCount: video.duration >= 900 ? 1 : undefined,
    viewCount: video.views_total ?? 0,
    likeCount: video.likes_total ?? 0,
    commentCount: video.comments_total ?? 0,
    description: video.description?.trim()
  };
}

export function filterDailymotionDiscoveryVideos(videos: DailymotionVideo[]): LiveSearchResource[] {
  const seen = new Set<string>();
  return videos.filter((video) => {
    const text = `${video.title} ${video.description ?? ""}`;
    const title = cleanDramaTitle(video.title);
    return video.duration >= 45 &&
      video.status !== "deleted" &&
      video.allow_embed !== false &&
      video.private !== true &&
      Boolean(video.thumbnail_360_url) &&
      !rejected.test(text) &&
      shortDramaEvidence.test(text) &&
      title.length >= 6 &&
      !genericDiscoveryTitle.test(title);
  }).filter((video) => {
    const key = `${normalizeText(cleanDramaTitle(video.title))}:${video.duration}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30).map(toResource);
}

export async function searchDailymotion(query: string): Promise<LiveSearchResource[]> {
  const url = new URL("https://api.dailymotion.com/videos");
  url.searchParams.set("search", query);
  url.searchParams.set("fields", "id,title,description,duration,url,thumbnail_360_url,owner.username,status,allow_embed,private,views_total,likes_total,comments_total");
  url.searchParams.set("limit", "40");
  url.searchParams.set("family_filter", "true");
  const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Dailymotion search failed: ${response.status}`);
  const payload = await response.json() as { list?: DailymotionVideo[] };
  return filterDailymotionVideos(payload.list ?? [], query);
}

export async function discoverDailymotionShortDramas(): Promise<LiveSearchResource[]> {
  const queries = ["short drama", "reelshort drama", "dramabox drama", "vertical drama"];
  const settled = await Promise.allSettled(queries.map(async (query) => {
    const url = new URL("https://api.dailymotion.com/videos");
    url.searchParams.set("search", query);
    url.searchParams.set("fields", "id,title,description,duration,url,thumbnail_360_url,owner.username,status,allow_embed,private,views_total,likes_total,comments_total");
    url.searchParams.set("limit", "40");
    url.searchParams.set("sort", "visited");
    url.searchParams.set("family_filter", "true");
    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Dailymotion discovery failed: ${response.status}`);
    const payload = await response.json() as { list?: DailymotionVideo[] };
    return filterDailymotionDiscoveryVideos(payload.list ?? []);
  }));
  const resources = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
  const seen = new Map<string, LiveSearchResource>();
  for (const resource of resources) {
    const key = normalizeText(cleanDramaTitle(resource.title));
    const existing = seen.get(key);
    if (!existing || (resource.viewCount ?? 0) > (existing.viewCount ?? 0)) seen.set(key, resource);
  }
  return [...seen.values()];
}
