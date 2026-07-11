import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cleanDramaTitle } from "@/lib/rankings/metadata";
import { officialYouTubeChannelPattern } from "@/lib/rankings/quality";
import { normalizeText } from "@/lib/search";
import type { LiveSearchResource } from "@/lib/types";

const execFileAsync = promisify(execFile);
const rejectedContent = /\b(review|recap|explained|explanation|reaction|trailer|teaser|commentary|preview|edit|fanmade|clip|watch\s+free|full\s+movie|movie|episode\s+only|youtube\s+compilation)\b|解说|讲解|盘点|吐槽|影评|预告|花絮|混剪|二创/i;

type YtDlpJson = {
  id?: string;
  title?: string;
  webpage_url?: string;
  url?: string;
  thumbnail?: string;
  duration?: number;
  channel?: string;
  uploader?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  description?: string;
};

function enabled() {
  return process.env.AGENT_REACH_ENABLED === "1" || process.env.AGENT_REACH_ENABLED === "true";
}

function binary() {
  return process.env.AGENT_REACH_YTDLP_BIN || "yt-dlp";
}

function parseLines(value: string) {
  return value.split(/\r?\n/).flatMap((line) => {
    if (!line.trim()) return [];
    try { return [JSON.parse(line) as YtDlpJson]; } catch { return []; }
  });
}

function mapVideo(item: YtDlpJson, prefix: string): LiveSearchResource | null {
  if (!item.id || !item.title) return null;
  const uploader = item.channel ?? item.uploader ?? "YouTube";
  const evidence = `${item.title} ${item.description ?? ""} ${uploader}`;
  if (rejectedContent.test(evidence)) return null;
  if (!officialYouTubeChannelPattern.test(uploader) && !/\b(reelshort|dramabox|shortmax|goodshort|flextv|netshort|short drama)\b/i.test(evidence)) return null;
  const title = cleanDramaTitle(item.title);
  if (!title || normalizeText(title).length < 4) return null;
  const url = item.webpage_url ?? (item.id ? `https://www.youtube.com/watch?v=${item.id}` : item.url ?? "");
  if (!url) return null;
  return {
    id: `agent-reach:${prefix}:${item.id}`,
    platformId: "youtube",
    title: item.title,
    url,
    thumbnailUrl: item.thumbnail ?? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    durationSeconds: item.duration,
    uploader,
    contentType: (item.duration ?? 0) >= 900 || /\b(full|complete|all episodes|合集|全集|完整版)\b/i.test(evidence) ? "full_series" : "episode",
    verifiedOfficial: officialYouTubeChannelPattern.test(uploader),
    discoverySource: "agent_reach",
    source_type: officialYouTubeChannelPattern.test(uploader) ? "official_channel" : "third_party_database",
    official_source: officialYouTubeChannelPattern.test(uploader),
    source_url: url,
    viewCount: item.view_count ?? 0,
    likeCount: item.like_count ?? 0,
    commentCount: item.comment_count ?? 0,
    description: item.description,
  };
}

async function ytSearch(query: string, limit = 12) {
  if (!enabled()) return [];
  const { stdout } = await execFileAsync(binary(), [
    `ytsearch${limit}:${query}`,
    "--dump-json",
    "--skip-download",
    "--no-playlist",
  ], { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
  return parseLines(stdout).flatMap((item) => {
    const mapped = mapVideo(item, "youtube");
    return mapped ? [mapped] : [];
  });
}

export async function searchWithAgentReach(query: string): Promise<LiveSearchResource[]> {
  if (!query.trim()) return [];
  try {
    return await ytSearch(`${query} short drama full episode official`, 12);
  } catch {
    return [];
  }
}

export async function discoverWithAgentReach(): Promise<LiveSearchResource[]> {
  try {
    return await ytSearch("short drama full episode official ReelShort DramaBox ShortMax GoodShort FlexTV", 20);
  } catch {
    return [];
  }
}

export function agentReachEnabled() {
  return enabled();
}
