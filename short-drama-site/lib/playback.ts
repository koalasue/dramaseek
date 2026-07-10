import type { LiveSearchResource, PlaybackStatus, PlayType, Resource } from "@/lib/types";

type PlaybackTarget = Pick<Resource, "url" | "platformId" | "status" | "playType" | "playbackStatus" | "qualityScore"> | Pick<LiveSearchResource, "url" | "platformId" | "play_type" | "status" | "quality_score">;

const embedPlatforms = new Set(["youtube", "dailymotion"]);
const externalPlatforms = new Set(["reelshort", "dramabox", "netshort", "shortmax", "goodshort", "flextv", "tiktok"]);

export function videoIdFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.endsWith("dailymotion.com")) return url.pathname.match(/\/video\/([^_/?]+)/)?.[1];
    if (url.hostname.endsWith("youtube.com")) return url.searchParams.get("v") ?? url.pathname.match(/\/shorts\/([^/?]+)/)?.[1];
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    return url.pathname.match(/(?:\/(?:drama|movie|series|show|video|play|episode|full-episodes?)\/)([a-z0-9_-]{4,})/i)?.[1];
  } catch {
    return undefined;
  }
}

export function derivePlayType(platformId: string, rawUrl: string): PlayType {
  try {
    const url = new URL(rawUrl);
    if (url.pathname.toLowerCase().match(/\.(mp4|webm|mov)$/)) return "direct";
    if (embedPlatforms.has(platformId)) return "embed";
    if (externalPlatforms.has(platformId)) return "external";
    return "external";
  } catch {
    return "unavailable";
  }
}

export function derivePlaybackStatus(platformId: string, playType: PlayType, rawStatus?: string): PlaybackStatus {
  if (playType === "unavailable" || rawStatus === "unavailable") return "expired";
  if (rawStatus === "limited") return "login_required";
  if (["reelshort", "dramabox", "netshort", "shortmax", "goodshort", "flextv"].includes(platformId) && playType === "external") return "login_required";
  return "available";
}

export function playbackLabel(playType: PlayType, status: PlaybackStatus) {
  if (status === "login_required") return "需要登录";
  if (status === "expired") return "已失效";
  if (status === "private") return "私密资源";
  if (playType === "direct") return "Play Now";
  if (playType === "embed") return "Watch Here";
  if (playType === "external") return "Watch on Platform";
  return "Unavailable";
}

export function normalizePlayback(target: PlaybackTarget) {
  const rawPlayType = "playType" in target ? target.playType : ("play_type" in target ? target.play_type : undefined);
  const playType = rawPlayType ?? derivePlayType(target.platformId, target.url);
  const rawStatus = "playbackStatus" in target ? target.playbackStatus : target.status;
  const status = derivePlaybackStatus(target.platformId, playType, rawStatus);
  const qualityScore = ("qualityScore" in target ? target.qualityScore : ("quality_score" in target ? target.quality_score : undefined)) ?? (status === "available" ? 85 : 62);
  return {
    playType,
    status,
    label: playbackLabel(playType, status),
    videoId: videoIdFromUrl(target.url),
    qualityScore,
  };
}
