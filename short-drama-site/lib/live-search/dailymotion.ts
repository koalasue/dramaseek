import { normalizeText } from "@/lib/search";
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

const rejected = /\b(review|recap|explained|explanation|reaction|trailer|teaser|commentary)\b|解说|讲解|影评|预告|花絮|混剪/i;
const allowedSuffix = /(?:full(?:\s*(?:ep|episode|episodes|movie|series))?|complete(?:\s*series)?|all\s*episodes?|全集|完整版|全剧|\|\s*(?:reelshort|dramabox|netshort))*/gi;

export function matchesExactDramaTitle(videoTitle: string, query: string) {
  const cleaned = videoTitle.replace(allowedSuffix, "").replace(/[\s\-:|_[\]()]+/g, "");
  return normalizeText(cleaned) === normalizeText(query);
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
  }).slice(0, 12).map((video) => ({
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
  }));
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
