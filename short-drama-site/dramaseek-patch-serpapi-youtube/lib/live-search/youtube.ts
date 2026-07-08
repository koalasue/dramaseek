import type { LiveSearchResource } from "@/lib/types";

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
      publishedAt?: string;
    };
  }>;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string;
    contentDetails?: { duration?: string };
    statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  }>;
};

const rejectedContent = /\b(review|recap|explained|explanation|reaction|trailer|teaser|commentary|preview|edit|fanmade)\b|解说|讲解|盘点|吐槽|影评|预告|花絮|混剪|二创/i;

function parseIsoDuration(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function numeric(value?: string) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function searchYouTube(query: string): Promise<LiveSearchResource[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const search = new URL("https://www.googleapis.com/youtube/v3/search");
  search.searchParams.set("part", "snippet");
  search.searchParams.set("type", "video");
  search.searchParams.set("maxResults", "12");
  search.searchParams.set("q", `${query} short drama full episode official`);
  search.searchParams.set("key", apiKey);

  const searchResponse = await fetch(search, { signal: AbortSignal.timeout(20000) });
  if (!searchResponse.ok) throw new Error(`YouTube search failed: ${searchResponse.status}`);
  const searchPayload = await searchResponse.json() as YouTubeSearchResponse;
  const items = searchPayload.items ?? [];
  const ids = items.map((item) => item.id?.videoId).filter(Boolean) as string[];
  if (!ids.length) return [];

  const videos = new URL("https://www.googleapis.com/youtube/v3/videos");
  videos.searchParams.set("part", "contentDetails,statistics");
  videos.searchParams.set("id", ids.join(","));
  videos.searchParams.set("key", apiKey);
  const videosResponse = await fetch(videos, { signal: AbortSignal.timeout(20000) });
  if (!videosResponse.ok) throw new Error(`YouTube videos failed: ${videosResponse.status}`);
  const videoPayload = await videosResponse.json() as YouTubeVideosResponse;
  const details = new Map((videoPayload.items ?? []).map((item) => [item.id, item]));

  return items.flatMap((item) => {
    const videoId = item.id?.videoId;
    const snippet = item.snippet;
    if (!videoId || !snippet?.title) return [];
    const evidence = `${snippet.title} ${snippet.description ?? ""} ${snippet.channelTitle ?? ""}`;
    if (rejectedContent.test(evidence)) return [];
    const detail = details.get(videoId);
    return [{
      id: `youtube:${videoId}`,
      platformId: "youtube",
      title: snippet.title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: parseIsoDuration(detail?.contentDetails?.duration),
      uploader: snippet.channelTitle ?? "YouTube",
      contentType: /\b(full|complete|all episodes|合集|全集|完整版)\b/i.test(evidence) ? "full_series" : "episode",
      verifiedOfficial: /\b(official|reelshort|dramabox|netshort|shortmax|goodshort)\b/i.test(evidence),
      discoverySource: "official_api",
      viewCount: numeric(detail?.statistics?.viewCount),
      likeCount: numeric(detail?.statistics?.likeCount),
      commentCount: numeric(detail?.statistics?.commentCount),
      description: snippet.description,
    } satisfies LiveSearchResource];
  }).slice(0, 12);
}

export async function discoverYouTubeShortDramas(): Promise<LiveSearchResource[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const search = new URL("https://www.googleapis.com/youtube/v3/search");
  search.searchParams.set("part", "snippet");
  search.searchParams.set("type", "video");
  search.searchParams.set("maxResults", "20");
  search.searchParams.set("order", "viewCount");
  search.searchParams.set("videoEmbeddable", "true");
  search.searchParams.set("q", "short drama full episode official English subtitles ReelShort DramaBox");
  search.searchParams.set("key", apiKey);

  const searchResponse = await fetch(search, { signal: AbortSignal.timeout(20000) });
  if (!searchResponse.ok) throw new Error(`YouTube discovery failed: ${searchResponse.status}`);
  const searchPayload = await searchResponse.json() as YouTubeSearchResponse;
  const items = searchPayload.items ?? [];
  const ids = items.map((item) => item.id?.videoId).filter(Boolean) as string[];
  if (!ids.length) return [];

  const videos = new URL("https://www.googleapis.com/youtube/v3/videos");
  videos.searchParams.set("part", "contentDetails,statistics");
  videos.searchParams.set("id", ids.join(","));
  videos.searchParams.set("key", apiKey);
  const videosResponse = await fetch(videos, { signal: AbortSignal.timeout(20000) });
  if (!videosResponse.ok) throw new Error(`YouTube discovery videos failed: ${videosResponse.status}`);
  const videoPayload = await videosResponse.json() as YouTubeVideosResponse;
  const details = new Map((videoPayload.items ?? []).map((item) => [item.id, item]));

  return items.flatMap((item) => {
    const videoId = item.id?.videoId;
    const snippet = item.snippet;
    if (!videoId || !snippet?.title) return [];
    const evidence = `${snippet.title} ${snippet.description ?? ""} ${snippet.channelTitle ?? ""}`;
    if (rejectedContent.test(evidence)) return [];
    if (!/\b(short drama|full episode|full movie|reelshort|dramabox|netshort|english subtitles)\b/i.test(evidence)) return [];
    const detail = details.get(videoId);
    const duration = parseIsoDuration(detail?.contentDetails?.duration);
    if (duration != null && duration < 45) return [];
    return [{
      id: `youtube:discover:${videoId}`,
      platformId: "youtube",
      title: snippet.title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationSeconds: duration,
      uploader: snippet.channelTitle ?? "YouTube",
      contentType: duration != null && duration >= 900 ? "full_series" : "episode",
      verifiedOfficial: /\b(official|reelshort|dramabox|netshort|shortmax|goodshort)\b/i.test(evidence),
      discoverySource: "official_api",
      viewCount: numeric(detail?.statistics?.viewCount),
      likeCount: numeric(detail?.statistics?.likeCount),
      commentCount: numeric(detail?.statistics?.commentCount),
      description: snippet.description,
    } satisfies LiveSearchResource];
  }).slice(0, 10);
}
