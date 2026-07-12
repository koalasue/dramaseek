import type { LiveSearchResource, PlaybackStatus, PlayType, Resource } from "@/lib/types";
import { detectSourceCapability } from "@/lib/source-capability";

type PlaybackTarget = Pick<Resource, "url" | "platformId" | "status" | "playType" | "playbackStatus" | "qualityScore"> | Pick<LiveSearchResource, "url" | "platformId" | "play_type" | "status" | "quality_score">;

const embedPlatforms = new Set(["youtube", "dailymotion"]);
const externalPlatforms = new Set(["reelshort", "dramabox", "netshort", "shortmax", "goodshort", "flextv", "tiktok"]);
const cloudPlatforms = new Set(["baidu", "quark"]);
const cloudDomains: Record<string, string[]> = {
  baidu: ["pan.baidu.com", "yun.baidu.com"],
  quark: ["pan.quark.cn", "drive.quark.cn"],
};

export function cloudTypeFromUrl(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return (Object.entries(cloudDomains).find(([, domains]) => domains.some((domain) => host === domain || host.endsWith(`.${domain}`)))?.[0]) as "baidu" | "quark" | undefined;
  } catch {
    return undefined;
  }
}

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
    if (cloudPlatforms.has(platformId) || cloudTypeFromUrl(rawUrl)) return "cloud";
    if (url.pathname.toLowerCase().match(/\.(mp4|webm|mov|m4v|m3u8)$/)) return "direct";
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
  if (playType === "cloud") return "available";
  if (["reelshort", "dramabox", "netshort", "shortmax", "goodshort", "flextv"].includes(platformId) && playType === "external") return "login_required";
  return "available";
}

export function playbackLabel(playType: PlayType, status: PlaybackStatus) {
  if (status === "login_required") return "需要登录";
  if (status === "expired") return "已失效";
  if (status === "private") return "私密资源";
  if (playType === "direct") return "Play Now";
  if (playType === "embed") return "Watch Here";
  if (playType === "cloud") return "云端播放";
  if (playType === "external") return "Watch on Platform";
  return "Unavailable";
}

export type AiSubtitleSupport = "web_supported" | "embed_limited" | "extension_required" | "login_required" | "unavailable";

export function aiSubtitleCompatibility(platformId: string, playType: PlayType, status: PlaybackStatus) {
  if (status === "login_required") {
    return {
      support: "login_required" as const,
      label: "需要登录",
      description: "需要官方账号后才能观看；不会绕过登录或会员限制。",
      stars: 0,
      recommended: false,
    };
  }
  if (status === "expired" || status === "private" || playType === "unavailable") {
    return {
      support: "unavailable" as const,
      label: "不可用",
      description: "资源失效、私密或暂不可访问。",
      stars: 0,
      recommended: false,
    };
  }
  if (playType === "direct") {
    return {
      support: "web_supported" as const,
      label: "支持网页AI字幕",
      description: "网页可以读取视频音频/画面/字幕轨，可直接生成中文字幕。",
      stars: 4,
      recommended: true,
    };
  }
  if (playType === "cloud") {
    return {
      support: "unavailable" as const,
      label: "云盘播放器字幕",
      description: "云盘备用观看不参与 AI 字幕处理；字幕交给百度网盘或夸克网盘播放器。",
      stars: 0,
      recommended: false,
    };
  }
  if (playType === "embed") {
    return {
      support: "embed_limited" as const,
      label: "网页播放 · AI字幕受限",
      description: platformId === "dailymotion"
        ? "可作为临时预览播放，但外部 iframe 不能被网页读取字幕轨、音频或画面。"
        : "外部 iframe 不能被网页读取音频或画面；请切换可控视频源或使用云盘备用观看。",
      stars: 2,
      recommended: false,
    };
  }
  return {
    support: "extension_required" as const,
    label: "需要浏览器扩展",
    description: "该来源需要跳转官方平台；网页无法读取第三方页面播放器，桌面端建议使用浏览器扩展。",
    stars: 1,
    recommended: false,
  };
}

export function watchModeLabel(playType: PlayType, status: PlaybackStatus) {
  if (status === "login_required") return "官方观看 · 需要登录";
  if (playType === "direct" || playType === "embed") return "在线播放";
  if (playType === "cloud") return "云盘观看";
  if (playType === "external") return "官方平台";
  return "暂不可用";
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
    watchMode: watchModeLabel(playType, status),
    videoId: videoIdFromUrl(target.url),
    qualityScore,
    aiSubtitle: aiSubtitleCompatibility(target.platformId, playType, status),
    capability: detectSourceCapability({ platformId: target.platformId, playType, status, url: target.url }),
  };
}
